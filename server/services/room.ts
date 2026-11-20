/**
 * 房间服务：HTTP 与 Socket.IO 共用的唯一实现（refactor/02 §2、06 §3）。
 *
 * 存储演进：旧实现是 `room-{id}` STRING 存整个 JSON 数组（并发覆盖 D6）。
 * 本服务升级为 LIST + META HASH：
 *  - 房间存在性 = meta 键存在（合法空房间也能加入）
 *  - 追加 = RPUSH + LTRIM(保留最近 N) + EXPIRE 双键续期（同旧「发送续期」语义）
 *  - 旧 STRING 数据在首次触达时原子迁移（解析→RPUSH→DEL→建 meta，TTL 延续），
 *    冲突/迁移绝不覆盖或删除可恢复数据
 *  - 迁移与写入按 roomId 串行（单进程内互斥；多实例部署时换 Lua/分布式锁，见 06 §5）
 */
import crypto from 'node:crypto'
import type { Redis } from 'ioredis'
import { messageSchema, type Message } from '../../shared/message.js'

const ROOM_PREFIX = 'room-'
const META_PREFIX = 'room-meta-'
const roomKey = (id: string) => `${ROOM_PREFIX}${id}`
const metaKey = (id: string) => `${META_PREFIX}${id}`

export class RoomGoneError extends Error {
  readonly roomId: string
  constructor(roomId: string) {
    super('房间号不存在或者已过期')
    this.name = 'RoomGoneError'
    this.roomId = roomId
  }
}

export interface RoomServiceOptions {
  redis: Redis
  /** 房间 TTL 秒（env ROOM_TTL，默认 30 天） */
  ttl: number
  /** LTRIM 保留条数 */
  maxMessages: number
  /** 房间号冲突时的有界重试次数（D2） */
  idRetries?: number
  /** 统计集合键操作注入（避免环依赖） */
  onRoomRegistered?: (roomId: string) => Promise<void> | void
  /** 房间号生成器（测试注入固定序列以验证冲突保护） */
  idFactory?: () => string
}

export interface RoomSummary {
  roomId: string
  ttlSeconds: number
  messageCount: number
}

export interface RoomService {
  createRoom(): Promise<RoomSummary>
  joinRoom(roomId: string): Promise<RoomSummary>
  getMessages(roomId: string, limit: number): Promise<Message[]>
  appendMessage(roomId: string, msg: Message): Promise<Message>
  removeRoom(roomId: string): Promise<void>
  sweepExpired(roomIds: string[]): Promise<number>
}

export function createRoomService(opts: RoomServiceOptions): RoomService {
  const { redis, ttl, maxMessages } = opts
  const idRetries = opts.idRetries ?? 20

  // 单进程按房间串行化（迁移/创建/追加互斥）
  const locks = new Map<string, Promise<unknown>>()
  function withLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
    const tail = (locks.get(roomId) ?? Promise.resolve()).then(fn)
    const guarded = tail.catch(() => undefined)
    locks.set(roomId, guarded)
    guarded.then(() => {
      if (locks.get(roomId) === guarded) locks.delete(roomId)
    })
    return tail
  }

  async function randomRoomId(): Promise<string> {
    // 有界重试 + 原子占位，冲突时保护已有数据（D2）
    for (let i = 0; i < idRetries; i++) {
      const id = opts.idFactory ? opts.idFactory() : String(crypto.randomInt(10000)).padStart(4, '0')
      const claimed = await withLock(id, () => claimRoom(id))
      if (claimed) return id
    }
    throw new Error('房间号分配失败，请重试')
  }

  /** true = 本进程占位成功；false = 已存在（旧数据保留） */
  async function claimRoom(roomId: string): Promise<boolean> {
    const dataType = await redis.type(roomKey(roomId))
    if (dataType === 'string') {
      await migrateLegacy(roomId) // 旧数据存在且保留：视为冲突
      return false
    }
    if (dataType === 'list' || (await redis.exists(metaKey(roomId)))) return false
    const added = await redis.hsetnx(metaKey(roomId), 'createdAt', String(Date.now()))
    if (!added) return false
    await redis.expire(metaKey(roomId), ttl)
    // 防御性：HSETNX 与 TYPE 之间若冒出旧 STRING（并发老进程），迁移进列表而非丢弃
    if ((await redis.type(roomKey(roomId))) === 'string') await migrateLegacy(roomId)
    await opts.onRoomRegistered?.(roomId)
    return true
  }

  /** 旧 STRING(JSON 数组) → LIST + META，TTL 延续；空/坏数据不致命 */
  async function migrateLegacy(roomId: string): Promise<void> {
    const raw = await redis.get(roomKey(roomId))
    const oldTtl = await redis.ttl(roomKey(roomId))
    const effectiveTtl = oldTtl > 0 ? Math.min(oldTtl, ttl) : ttl
    await redis.del(roomKey(roomId))
    let items: unknown[] = []
    try {
      const parsed = JSON.parse(raw ?? '[]')
      if (Array.isArray(parsed)) items = parsed
    } catch {
      console.warn(`[room] 旧房间 ${roomId} 数据不可解析，按空房间迁移`)
    }
    const valid = items
      .map((m) => messageSchema.safeParse(m))
      .filter((r) => r.success)
      .map((r) => JSON.stringify(r.data))
    const listKey = roomKey(roomId)
    if (valid.length) {
      await redis.rpush(listKey, ...valid)
      if (valid.length > maxMessages) await redis.ltrim(listKey, -maxMessages, -1)
      await redis.expire(listKey, effectiveTtl)
    }
    if (!(await redis.exists(metaKey(roomId)))) {
      await redis.hset(metaKey(roomId), 'createdAt', String(Date.now()))
      await redis.expire(metaKey(roomId), effectiveTtl)
    }
  }

  /** 归一化存在性：处理 list 存在但 meta 缺失（理论不该发生） */
  async function ensureMeta(roomId: string): Promise<boolean> {
    if (await redis.exists(metaKey(roomId))) return true
    const dataType = await redis.type(roomKey(roomId))
    if (dataType === 'string') {
      await migrateLegacy(roomId)
      return true
    }
    if (dataType === 'list') {
      const t = await redis.ttl(roomKey(roomId))
      await redis.hset(metaKey(roomId), 'createdAt', String(Date.now()))
      await redis.expire(metaKey(roomId), t > 0 ? t : ttl)
      return true
    }
    return false
  }

  async function summarize(roomId: string): Promise<RoomSummary> {
    const [ttlSeconds, messageCount] = await Promise.all([
      redis.ttl(metaKey(roomId)),
      redis.llen(roomKey(roomId)),
    ])
    return { roomId, ttlSeconds: Math.max(ttlSeconds, 0), messageCount }
  }

  return {
    async createRoom() {
      const roomId = await randomRoomId()
      return summarize(roomId)
    },

    async joinRoom(roomId: string) {
      return withLock(roomId, async () => {
        if (!(await ensureMeta(roomId))) throw new RoomGoneError(roomId)
        return summarize(roomId)
      })
    },

    async getMessages(roomId: string, limit: number) {
      return withLock(roomId, async () => {
        if ((await redis.type(roomKey(roomId))) === 'string') await migrateLegacy(roomId)
        if (!(await redis.exists(metaKey(roomId)))) {
          if ((await redis.type(roomKey(roomId))) !== 'list') throw new RoomGoneError(roomId)
          await ensureMeta(roomId)
        }
        const raw = await redis.lrange(roomKey(roomId), -limit, -1)
        const out: Message[] = []
        for (const item of raw) {
          const parsed = messageSchema.safeParse(safeJson(item))
          if (parsed.success) out.push(parsed.data)
        }
        return out
      })
    },

    async appendMessage(roomId, msg) {
      const final = messageSchema.parse(msg) // 服务端出口再校验一次
      return withLock(roomId, async () => {
        if (!(await ensureMeta(roomId))) throw new RoomGoneError(roomId)
        const key = roomKey(roomId)
        await redis
          .multi()
          .rpush(key, JSON.stringify(final))
          .ltrim(key, -maxMessages, -1)
          .expire(key, ttl)
          .expire(metaKey(roomId), ttl)
          .exec()
        return final
      })
    },

    async removeRoom(roomId) {
      await withLock(roomId, async () => {
        await redis.del(roomKey(roomId), metaKey(roomId))
      })
    },

    async sweepExpired(roomIds) {
      if (!roomIds.length) return 0
      const pipeline = redis.multi()
      for (const id of roomIds) {
        pipeline.exists(metaKey(id))
        pipeline.type(roomKey(id))
      }
      const execResults = ((await pipeline.exec()) ?? []) as Array<[Error | null | undefined, unknown]>
      const results = execResults.map(([, v]) => v)
      let removed = 0
      const dead: string[] = []
      roomIds.forEach((id, i) => {
        const hasMeta = Boolean(results[i * 2])
        const dataType = results[i * 2 + 1]
        if (!hasMeta && dataType === 'none') dead.push(id)
      })
      if (dead.length) {
        const sweep = redis.multi()
        for (const id of dead) {
          sweep.del(roomKey(id), metaKey(id))
          sweep.srem(`${STATISTICS_PREFIX}rooms`, id)
        }
        await sweep.exec()
        removed = dead.length
      }
      return removed
    },
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export const STATISTICS_PREFIX = 'statistics-'
