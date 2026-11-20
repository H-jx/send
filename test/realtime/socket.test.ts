import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import { io as ioClient, type Socket } from 'socket.io-client'
import type { SocketClientToServer, SocketServerToClient } from '../../shared/events.js'
import { SOCKET_EVENTS } from '../../shared/events.js'
import type { Message } from '../../shared/message.js'
import { buildApp } from '../../server/app.js'
import { createServices } from '../../server/services/index.js'
import { attachSocket } from '../../server/realtime/index.js'
import { testEnv, tryConnectRedis } from '../helpers.js'

type Client = Socket<SocketServerToClient, SocketClientToServer>

const probe = await tryConnectRedis()
const hasRedis = probe != null

async function createRoom(app: { inject: (o: { method: string; url: string; body?: unknown }) => Promise<{ json: () => { roomId: string } }> }): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/rooms/', body: {} })
  return res.json().roomId
}

function connect(url: string, roomId: string, username: string): Promise<Client> {
  const socket = ioClient(url, {
    transports: ['websocket'],
    query: { roomId, username },
  }) as Client
  return new Promise((resolve, reject) => {
    socket.once(SOCKET_EVENTS.ROOM_JOINED, () => resolve(socket))
    socket.once('connect_error', (err) => reject(err))
    setTimeout(() => reject(new Error('握手超时')), 4000)
  })
}

function nextEvent<T>(socket: Client, event: keyof SocketServerToClient, timeout = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`事件超时: ${event}`)), timeout)
    const handler = (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    }
    // socket.io 的 once 按事件名收窄回调签名；测试辅助统一经 cast
    ;(socket.once as unknown as (e: string, h: (payload: T) => void) => void)(event, handler)
  })
}

function silence(socket: Client, timeout = 300): Promise<'silent'> {
  return new Promise((resolve, reject) => {
    const handler = () => {
      socket.off(SOCKET_EVENTS.MSG_RECEIVE, handler)
      reject(new Error('收到了不该收到的消息'))
    }
    socket.on(SOCKET_EVENTS.MSG_RECEIVE, handler)
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.MSG_RECEIVE, handler)
      resolve('silent')
    }, timeout)
  })
}

describe.runIf(hasRedis)('Socket.IO 实时（双真实客户端）', () => {
  const env = testEnv()
  let app: Awaited<ReturnType<typeof buildApp>>
  let url: string
  let clients: Client[] = []

  beforeAll(async () => {
    await probe!.redis.flushdb()
    app = await buildApp({ env, services: createServices(env, { redis: probe!.redis }), logger: false })
    attachSocket(app.server, createServices(env, { redis: probe!.redis })) // 监听前完成挂载
    await app.listen({ port: 0, host: '127.0.0.1' })
    const port = (app.server.address() as AddressInfo).port
    url = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    clients.forEach((c) => c.close())
    await app.close()
    await probe!.redis.flushdb()
    await probe!.redis.quit()
  })

  it('同房收发：ack、无回声、服务端补 time/sendBy、历史先于增量', async () => {
    const roomId = await createRoom(app)
    const a = await connect(url, roomId, '甲')
    const b = await connect(url, roomId, '乙')
    clients.push(a, b)

    const bGot = nextEvent<Message>(b, SOCKET_EVENTS.MSG_RECEIVE)
    const ack = await new Promise<{ success: boolean }>((resolve) => {
      a.emit(SOCKET_EVENTS.MSG_SEND, { id: 'rt-1', type: 'text', text: 'hello' }, resolve)
    })
    expect(ack.success).toBe(true)

    const msg = await bGot
    expect(msg.id).toBe('rt-1')
    expect(msg.time).toBeGreaterThan(0)
    expect(msg.sendBy).toBe('甲')
    expect(a).toBeTruthy()
    // 发送者无回声
    await silence(a)

    // 刷新语义：重连（新客户端）先拿历史，历史含 rt-1
    const historyRes = await new Promise<Message[]>((resolve) => {
      const s = ioClient(url, { transports: ['websocket'], query: { roomId, username: '丙' } }) as Client
      s.on(SOCKET_EVENTS.ROOM_JOINED, (h) => {
        resolve(h)
        s.close()
      })
    })
    expect(historyRes.map((m) => m.id)).toContain('rt-1')
  })

  it('跨房间隔离：其他房间收不到广播', async () => {
    const roomA = await createRoom(app)
    const roomB = await createRoom(app)
    const a1 = await connect(url, roomA, 'a1')
    const a2 = await connect(url, roomA, 'a2')
    const b1 = await connect(url, roomB, 'b1')
    clients.push(a1, a2, b1)

    const bSilence = silence(b1, 400)
    const a2Got = nextEvent<Message>(a2, SOCKET_EVENTS.MSG_RECEIVE)
    await new Promise((resolve) => a1.emit(SOCKET_EVENTS.MSG_SEND, { id: 'iso-1', type: 'text', text: '隔离' }, resolve))
    await a2Got
    await expect(bSilence).resolves.toBe('silent')
  })

  it('room:peer 在线数', async () => {
    const roomId = await createRoom(app)
    const first = await connect(url, roomId, 'p1')
    clients.push(first)
    const joinEvt = nextEvent<{ count: number }>(first, SOCKET_EVENTS.ROOM_PEER, 5000)
    const second = await connect(url, roomId, 'p2')
    clients.push(second)
    const evt = await joinEvt
    expect(evt.count).toBeGreaterThanOrEqual(2)
  })

  it('坏消息 → 错误 ack；不入库', async () => {
    const roomId = await createRoom(app)
    const a = await connect(url, roomId, 'x')
    clients.push(a)
    const ack = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      a.emit(SOCKET_EVENTS.MSG_SEND, { id: 'bad-1', type: 'text', text: '' }, resolve)
    })
    expect(ack.success).toBe(false)
    expect(ack.message).toBeTruthy()
    const res = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    expect(res.json().items.find((m: Message) => m.id === 'bad-1')).toBeUndefined()
  })

  it('握手校验：不存在的房间直接拒连', async () => {
    await expect(connect(url, '9999', 'ghost')).rejects.toThrow(/握手|超时无?|房间号不存在或者已过期|room/i)
  })

  it('msg:send 落库后 HTTP 历史可见（同一服务）', async () => {
    const roomId = await createRoom(app)
    const a = await connect(url, roomId, '甲')
    clients.push(a)
    await new Promise((resolve) =>
      a.emit(
        SOCKET_EVENTS.MSG_SEND,
        { id: 'http-1', type: 'file', file: { name: 'a.bin', size: 10 }, url: 'http://host/room/a.bin' },
        resolve,
      ),
    )
    const res = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    const item = res.json().items.find((m: Message) => m.id === 'http-1')
    expect(item.file.name).toBe('a.bin')
    expect(item.url).toBe('http://host/room/a.bin') // 不再剥协议（绝对 URL 直存）
  })
})

describe.skipIf(hasRedis)('实时测试边界记录', () => {
  it('本地 Redis 不可达时整组跳过', () => {
    expect(hasRedis).toBe(true)
  })
})
