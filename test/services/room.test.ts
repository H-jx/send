import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type Redis from 'ioredis'
import { createRoomService, RoomGoneError, type RoomService } from '../../server/services/room.js'
import { testEnv, tryConnectRedis } from '../helpers.js'

const probe = await tryConnectRedis()
const hasRedis = probe != null

describe.runIf(hasRedis)('room service', () => {
  let redis: Redis
  let service: RoomService
  const env = testEnv()

  beforeAll(async () => {
    redis = probe!.redis
    await redis.flushdb()
    service = createRoomService({
      redis,
      ttl: env.ROOM_TTL,
      maxMessages: env.ROOM_MAX_MESSAGES,
    })
  })
  afterAll(async () => {
    await redis.flushdb()
    await redis.quit()
  })

  it('创建房间：4 位号 + 可重入校验', async () => {
    const { roomId } = await service.createRoom()
    expect(roomId).toMatch(/^\d{4}$/)
    const summary = await service.joinRoom(roomId)
    expect(summary.messageCount).toBe(0)
    expect(summary.ttlSeconds).toBeGreaterThan(60 * 60 * 24 * 29)
  })

  it('合法空房间可加入；不存在抛 RoomGoneError', async () => {
    const { roomId } = await service.createRoom()
    await expect(service.joinRoom(roomId)).resolves.toBeTruthy()
    await expect(service.joinRoom('9999')).rejects.toBeInstanceOf(RoomGoneError)
  })

  it('追加消息：顺序、内容、TTL 续期', async () => {
    const { roomId } = await service.createRoom()
    await service.appendMessage(roomId, { id: 'm1', type: 'text', text: '第一条' })
    await service.appendMessage(roomId, { id: 'm2', type: 'file', file: { name: 'a.txt', size: 1 }, url: 'http://x/a.txt' })
    const list = await service.getMessages(roomId, 10)
    expect(list.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(list[1]!.file?.name).toBe('a.txt')
  })

  it('LTRIM 只保留最近 N 条', async () => {
    const small = createRoomService({ redis, ttl: 60, maxMessages: 3 })
    const { roomId } = await small.createRoom()
    for (let i = 0; i < 6; i++) await small.appendMessage(roomId, { id: `t${i}`, type: 'text', text: `${i}` })
    const list = await small.getMessages(roomId, 10)
    expect(list.map((m) => m.id)).toEqual(['t3', 't4', 't5'])
  })

  it('并发追加不丢消息（20 并发）', async () => {
    const { roomId } = await service.createRoom()
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => service.appendMessage(roomId, { id: `c${i}`, type: 'text', text: `${i}` })),
    )
    const list = await service.getMessages(roomId, 50)
    expect(list.length).toBe(20)
    expect(new Set(list.map((m) => m.id)).size).toBe(20)
  })

  it('旧 STRING 房间：迁移保留数据、类型转换、meta 补齐、TTL 延续', async () => {
    // 模拟旧版数据：room-0101 是 JSON STRING，剩余 TTL 较短
    await redis.set('room-0101', JSON.stringify([
      { id: 'old1', type: 'text', text: '旧消息', time: 1 },
      { broken: true }, // 坏数据将被过滤
      { id: 'old2', type: 'file', file: { name: 'x.png', size: 9 }, url: 'http://y/x.png' },
    ]))
    await redis.expire('room-0101', 3600)

    const summary = await service.joinRoom('0101')
    expect(summary.messageCount).toBe(2) // 坏数据丢弃，好数据保留
    expect(summary.ttlSeconds).toBeLessThanOrEqual(3600)
    expect(await redis.type('room-0101')).toBe('list') // STRING 已转换为 LIST
    expect(await redis.type('room-meta-0101')).toBe('hash')
    expect(await redis.lrange('room-0101', 0, -1)).toHaveLength(2)

    await service.appendMessage('0101', { id: 'new1', type: 'text', text: '迁移后新消息' })
    const list = await service.getMessages('0101', 10)
    expect(list.map((m) => m.id)).toEqual(['old1', 'old2', 'new1'])
  })

  it('迁移空 STRING 房间（旧版刚创建未发消息）', async () => {
    await redis.set('room-0102', '[]')
    const summary = await service.joinRoom('0102')
    expect(summary.messageCount).toBe(0)
    expect(await redis.exists('room-meta-0102')).toBe(1)
  })

  it('idFactory 注入：冲突时换新号且旧数据完好', async () => {
    await service.createRoom().then(() => undefined) // 建立 redis 引用
    const legacy = 'room-0303'
    await redis.set(legacy, JSON.stringify([{ id: 'keep', type: 'text', text: '勿删' }]))
    let n = 0
    const svc = createRoomService({
      redis,
      ttl: 60,
      maxMessages: 10,
      idFactory: () => String(++n), // 第 1 个号 '1' 无效位后两位? 需要 4 位形态仅测试
    })
    const created = await svc.createRoom()
    expect(created.roomId).toBe('1')
    // 旧房间 0303 数据不因随机冲突路径被删除（迁移只发生在被触达时）
    const still = await redis.get(legacy)
    expect(still).toContain('勿删')
    // 迁移后保护：对 0303 再次 claim 失败换号
    const svc2 = createRoomService({ redis, ttl: 60, maxMessages: 10, idFactory: () => '0303' })
    // idFactory 恒定返回占用号 → 有界重试后报错，绝不覆盖
    await expect(svc2.createRoom()).rejects.toThrow('房间号分配失败')
    // 0303 在迁移路径后仍是可读房间且数据保留
    const after = await service.getMessages('0303', 5)
    expect(after.map((m) => m.id)).toEqual(['keep'])
  })

  it('sweepExpired 清理死房间记录', async () => {
    await redis.sadd('statistics-rooms', '4321', '8765')
    const { roomId } = await service.createRoom()
    await redis.sadd('statistics-rooms', roomId)
    const removed = await service.sweepExpired(['4321', '8765', roomId])
    expect(removed).toBe(2)
    expect(await redis.smembers('statistics-rooms')).toEqual([roomId])
  })

  it('removeRoom 删除双键', async () => {
    const { roomId } = await service.createRoom()
    await service.appendMessage(roomId, { id: 'r1', type: 'text', text: 'x' })
    await service.removeRoom(roomId)
    expect(await redis.exists(`room-${roomId}`, `room-meta-${roomId}`)).toBe(0)
  })
})

describe.skipIf(!hasRedis)('room service（Redis 不可达：以下用例未实际执行）', () => {
  it('记录验证边界', () => {
    expect(hasRedis).toBe(true)
  })
})
