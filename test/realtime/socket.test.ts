import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import { io as ioClient, type Socket } from 'socket.io-client'
import type { SocketClientToServer, SocketServerToClient } from '../../shared/events.js'
import { SOCKET_EVENTS } from '../../shared/events.js'
import type { EncryptedMessageInput, RoomMessage } from '../../shared/message.js'
import { createMessageCrypto } from '../../app/features/room/message-crypto.js'
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

    const roomCrypto = createMessageCrypto(roomId)
    const envelope = await roomCrypto.encrypt({ id: 'rt-1', type: 'text', text: '你好，Send' })
    const bGot = nextEvent<RoomMessage>(b, SOCKET_EVENTS.MSG_RECEIVE)
    const ack = await new Promise<{ success: boolean }>((resolve) => {
      a.emit(SOCKET_EVENTS.MSG_SEND, envelope, resolve)
    })
    expect(ack.success).toBe(true)

    const msg = await bGot
    expect(msg).toMatchObject(envelope)
    expect(msg).not.toHaveProperty('text')
    expect(msg.time).toBeGreaterThan(0)
    expect(msg.sendBy).toBe('甲')
    const receiverCrypto = createMessageCrypto(roomId)
    await expect(receiverCrypto.decrypt(msg)).resolves.toMatchObject({ type: 'text', text: '你好，Send' })
    await expect(receiverCrypto.decrypt({ ...msg, id: 'altered' })).rejects.toThrow()
    // 发送者无回声
    await silence(a)

    // 刷新语义：重连（新客户端）先拿历史，历史含 rt-1
    const historyRes = await new Promise<RoomMessage[]>((resolve) => {
      const s = ioClient(url, { transports: ['websocket'], query: { roomId, username: '丙' } }) as Client
      s.on(SOCKET_EVENTS.ROOM_JOINED, (h) => {
        resolve(h)
        s.close()
      })
    })
    expect(historyRes).toEqual([msg])
  })

  it('跨房间隔离：其他房间收不到广播', async () => {
    const roomA = await createRoom(app)
    const roomB = await createRoom(app)
    const a1 = await connect(url, roomA, 'a1')
    const a2 = await connect(url, roomA, 'a2')
    const b1 = await connect(url, roomB, 'b1')
    clients.push(a1, a2, b1)

    const bSilence = silence(b1, 400)
    const envelope = await createMessageCrypto(roomA).encrypt({ id: 'iso-1', type: 'text', text: '隔离' })
    const a2Got = nextEvent<RoomMessage>(a2, SOCKET_EVENTS.MSG_RECEIVE)
    await new Promise((resolve) => a1.emit(SOCKET_EVENTS.MSG_SEND, envelope, resolve))
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

  it('拒绝旧客户端发送明文', async () => {
    const roomId = await createRoom(app)
    const a = await connect(url, roomId, 'x')
    clients.push(a)
    const ack = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      const plaintext = { id: 'bad-1', type: 'text', text: '不能以明文发送' }
      a.emit(SOCKET_EVENTS.MSG_SEND, plaintext as unknown as EncryptedMessageInput, resolve)
    })
    expect(ack.success).toBe(false)
    expect(ack.message).toBeTruthy()
    const res = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    expect(res.json().items).toEqual([])
  })

  it('握手校验：不存在的房间直接拒连', async () => {
    await expect(connect(url, '9999', 'ghost')).rejects.toThrow(/握手|超时无?|房间号不存在或者已过期|room/i)
  })

  it('附件消息在 Redis 和 HTTP 历史中只包含密文，解密后保留完整预签名 URL', async () => {
    const roomId = await createRoom(app)
    const a = await connect(url, roomId, '甲')
    clients.push(a)
    const file = { name: '报告.bin', size: 10 }
    const signed = await app.inject({
      method: 'POST',
      url: '/api/uploads/sign',
      body: { roomId, fileName: file.name, size: file.size },
    })
    expect(signed.statusCode).toBe(200)
    const downloadUrl: string = signed.json().downloadUrl
    const payload = { id: 'http-1', type: 'file' as const, file, url: downloadUrl }
    const roomCrypto = createMessageCrypto(roomId)
    const envelope = await roomCrypto.encrypt(payload)
    expect((await roomCrypto.encrypt(payload)).iv).not.toBe(envelope.iv)
    await expect(new Promise((resolve) => a.emit(SOCKET_EVENTS.MSG_SEND, envelope, resolve)))
      .resolves.toEqual({ success: true })

    const res = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` })
    const stored = await probe!.redis.lindex(`room-${roomId}`, 0)
    const item: RoomMessage = res.json().items[0]
    expect(item).toMatchObject(envelope)
    expect(JSON.parse(stored!)).toEqual(item)
    expect(res.body).not.toContain(downloadUrl)
    expect(res.body).not.toContain(file.name)
    await expect(roomCrypto.decrypt(item)).resolves.toMatchObject(payload)
  })
})

describe.skipIf(hasRedis)('实时测试边界记录', () => {
  it('本地 Redis 不可达时整组跳过', () => {
    expect(hasRedis).toBe(true)
  })
})
