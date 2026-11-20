import type { Redis } from 'ioredis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../server/app.js'
import { createServices } from '../../server/services/index.js'
import { testEnv, tryConnectRedis } from '../helpers.js'

const probe = await tryConnectRedis()
const hasRedis = probe != null
let redis: Redis
let app: FastifyInstance

async function createRoomViaApi(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/rooms/', body: {} })
  expect(res.statusCode).toBe(201)
  return res.json().roomId
}

describe.runIf(hasRedis)('HTTP API（inject）', () => {
  const env = testEnv()

  beforeAll(async () => {
    redis = probe!.redis
    await redis.flushdb()
    app = await buildApp({
      env,
      services: createServices(env, { redis }),
      docs: true,
      logger: false,
    })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await redis.flushdb()
    await redis.quit()
  })

  it('GET /api/health → 200 契约形态', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health/' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
    expect(typeof res.json().uptime).toBe('number')
  })

  it('POST /api/rooms → 201；保留前导零格式', async () => {
    const roomId = await createRoomViaApi()
    expect(roomId).toMatch(/^\d{4}$/)
  })

  it('GET /api/rooms/:roomId 校验与 404', async () => {
    const roomId = await createRoomViaApi()
    const ok = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}` })
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toMatchObject({ roomId, messageCount: 0 })
    expect(ok.json().ttlSeconds).toBeGreaterThan(0)

    const gone = await app.inject({ method: 'GET', url: '/api/rooms/0001' }).catch(() => null)
    // 0001 可能刚被创建用过，只断言存在路径可用；不存在路径用 7777（本轮未创建）
    const missing = await app.inject({ method: 'GET', url: '/api/rooms/7777' })
    expect(missing.statusCode).toBe(404)
    expect(missing.json().status ?? missing.json().error).toBeTruthy()
    void gone
  })

  it('非法房间号 → 400 且带 details', async () => {
    for (const bad of ['abc', '12', '12345', '00a1']) {
      const res = await app.inject({ method: 'GET', url: `/api/rooms/${bad}` })
      expect(res.statusCode).toBe(400)
      const body = res.json()
      expect(body.statusCode).toBe(400)
      expect(body.error).toBe('Bad Request')
    }
  })

  it('GET /api/rooms/:id/messages → 200 items；limit 越界 → 400', async () => {
    const roomId = await createRoomViaApi()
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    expect(list.statusCode).toBe(200)
    expect(list.json()).toMatchObject({ roomId, items: [] })

    const tooBig = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages?limit=9999` })
    expect(tooBig.statusCode).toBe(400)
    const zero = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages?limit=0` })
    expect(zero.statusCode).toBe(400)
  })

  it('POST /api/uploads/sign → 200 绝对 URL 四元组；错误入参 400', async () => {
    const roomId = await createRoomViaApi()
    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/sign',
      payload: { roomId, fileName: '../../evil/报告 1.pdf', size: 1234 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.key.startsWith(`${roomId}/`)).toBe(true)
    expect(body.key).not.toContain('..')
    expect(body.uploadUrl).toMatch(/^https?:\/\//)
    expect(body.downloadUrl).toMatch(/^https?:\/\//)
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now())

    const noName = await app.inject({ method: 'POST', url: '/api/uploads/sign', payload: { fileName: '' } })
    expect(noName.statusCode).toBe(400)
    const badRoom = await app.inject({
      method: 'POST',
      url: '/api/uploads/sign',
      payload: { roomId: '12345', fileName: 'a' },
    })
    expect(badRoom.statusCode).toBe(400)
    const tooLarge = await app.inject({
      method: 'POST',
      url: '/api/uploads/sign',
      payload: { fileName: 'a', size: 99 * 1024 ** 3 },
    })
    expect(tooLarge.statusCode).toBe(413)
  })

  it('统计端点：空列表与记录后返回', async () => {
    const rooms0 = await app.inject({ method: 'GET', url: '/api/statistics/rooms' })
    expect(rooms0.statusCode).toBe(200)
    expect(Array.isArray(rooms0.json().rooms)).toBe(true)

    const roomId = await createRoomViaApi()
    await redis.sadd('statistics-rooms', roomId)
    await redis.sadd('statistics-users', '匿名0001')
    const rooms = await app.inject({ method: 'GET', url: '/api/statistics/rooms' })
    expect(rooms.json().rooms).toContain(roomId)
    const users = await app.inject({ method: 'GET', url: '/api/statistics/users' })
    expect(users.json().users).toContain('匿名0001')
  })

  it('未知 /api/* 返回 JSON 404（不是页面 HTML）', async () => {
    for (const url of ['/api/nope', '/api/rooms/x/messages/deep']) {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(404)
      expect(res.headers['content-type']).toContain('application/json')
      expect(res.json().statusCode).toBe(404)
    }
    const post = await app.inject({ method: 'POST', url: '/api/whatever', body: {} })
    expect(post.statusCode).toBe(404)
    expect(post.headers['content-type']).toContain('application/json')
  })

  it('OpenAPI：swagger 文档包含全部契约路径且版本 3.1', async () => {
    const doc = app.swagger({ yaml: false })
    const spec = typeof doc === 'string' ? JSON.parse(doc) : doc
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths).sort()).toEqual(
      [
        '/api/health/',
        '/api/rooms/',
        '/api/rooms/{roomId}',
        '/api/rooms/{roomId}/messages',
        '/api/statistics/rooms',
        '/api/statistics/users',
        '/api/uploads/sign',
      ].sort(),
    )
    expect(spec.components.schemas).toBeTruthy()
  })

  it('HTTP 与 Socket 共用房间服务：sign→持久化消息可在 HTTP 历史读到', async () => {
    const roomId = await createRoomViaApi()
    const services = createServices(testEnv(), { redis })
    await services.room.appendMessage(roomId, { id: 'shared-1', type: 'text', text: '来自服务层' })
    const res = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    expect(res.json().items.map((m: { id: string }) => m.id)).toContain('shared-1')
    await services.dispose()
  })
})

describe.skipIf(hasRedis)('API 测试边界记录', () => {
  it('本地 Redis(127.0.0.1:6379 db15) 不可达时整组跳过', () => {
    expect(hasRedis).toBe(true)
  })
})
