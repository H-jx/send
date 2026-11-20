/**
 * Socket.IO 挂载与事件处理（refactor/04）。
 * 关键约束：
 *  - 同一个 http server 上永远只有一个 io.Server（Vite dev 热重载会重建 Fastify app）
 *  - 握手即校验房间；进入后先 room:joined 同步历史，再接收增量
 *  - 持久化成功才 ack + 广播；发送者无回声
 */
import http from 'node:http'
import { Server, type Socket } from 'socket.io'
import { SOCKET_EVENTS, socketHandshakeSchema, type SocketClientToServer, type SocketServerToClient } from '../../shared/events.js'
import { msgSendSchema } from '../../shared/message.js'
import { RoomGoneError } from '../services/room.js'
import type { AppServices } from '../services/index.js'

export const IO_KEY = Symbol.for('send.io.server')

type IoServer = Server<SocketClientToServer, SocketServerToClient>
type IoSocket = Socket<SocketClientToServer, SocketServerToClient>

export function attachSocket(server: http.Server | import('node:http2').Http2Server, services: AppServices): IoServer {
  const tag = server as unknown as Record<symbol, IoServer | undefined>
  const existing = tag[IO_KEY]
  if (existing) {
    // dev 热重载：同一 Vite http server 上重复挂载保护（旧实例由 onClose 关闭；
    // 若仍在，直接复用会挂旧闭包，因此先关旧）
    existing.close(() => {})
  }

  const io: IoServer = new Server(server, {
    serveClient: false,
    pingInterval: services.env.SOCKET_PING_INTERVAL,
    cors: {
      origin: services.env.CORS_ORIGINS.includes('*') ? true : services.env.CORS_ORIGINS,
      methods: ['GET', 'POST'],
    },
  })
  ;(server as unknown as Record<symbol, IoServer>)[IO_KEY] = io

  io.use((socket, next) => {
    const parsed = socketHandshakeSchema.safeParse(socket.handshake.query)
    if (!parsed.success) {
      next(extendedError('握手参数无效：需要 roomId(4位数字)'))
      return
    }
    services.room
      .joinRoom(parsed.data.roomId)
      .then(() => {
        socket.data.handshake = parsed.data
        next()
      })
      .catch((err: unknown) => {
        next(extendedError(err instanceof RoomGoneError ? err.message : '连接失败'))
      })
  })

  io.on('connection', (socket) => {
    void handleConnection(io, socket, services)
  })

  return io
}

async function handleConnection(io: IoServer, socket: IoSocket, services: AppServices) {
  const { roomId, username } = socket.data.handshake as {
    roomId: string
    username?: string
  }

  await socket.join(roomId)
  if (username) void services.stats.recordUser(username).catch(() => undefined)

  // 先历史后增量：room:joined 在任何 msg:receive 之前送达
  try {
    const history = await services.room.getMessages(roomId, services.env.MESSAGES_LIMIT_MAX)
    socket.emit(SOCKET_EVENTS.ROOM_JOINED, history)
  } catch (err) {
    socket.emit(SOCKET_EVENTS.ROOM_JOINED, [])
    services.env.LOG_LEVEL === 'debug' && console.error('[socket] 历史读取失败', err)
  }
  emitPeerCount(io, roomId)

  socket.on(SOCKET_EVENTS.MSG_SEND, async (raw, ack) => {
    const parsed = msgSendSchema.safeParse(raw)
    if (!parsed.success) {
      ack?.({ success: false, message: parsed.error.issues[0]?.message ?? '消息格式错误' })
      return
    }
    const final = {
      ...parsed.data,
      time: Date.now(),
      ...(username ? { sendBy: username } : {}),
    }
    try {
      const stored = await services.room.appendMessage(roomId, final)
      // 广播给房间内其他设备（发送者无回声）
      socket.to(roomId).emit(SOCKET_EVENTS.MSG_RECEIVE, stored)
      ack?.({ success: true })
    } catch (err) {
      const message = err instanceof RoomGoneError ? err.message : '发送失败'
      if (!(err instanceof RoomGoneError)) console.error('[socket] msg:send', (err as Error).message)
      ack?.({ success: false, message })
    }
  })

  socket.on('disconnect', () => {
    // 断开仅离房；过期清扫由 services/cleanup 定时器负责（D7），不在此扫描
    emitPeerCount(io, roomId)
  })
}

function emitPeerCount(io: IoServer, roomId: string) {
  const room = io.sockets.adapter.rooms.get(roomId)
  const count = room ? room.size : 0
  if (count > 0) io.to(roomId).emit(SOCKET_EVENTS.ROOM_PEER, { count })
}

export async function closeSocketOn(server: unknown, io: IoServer) {
  const tag = server as Record<symbol, IoServer | undefined>
  if (tag[IO_KEY] === io) {
    delete tag[IO_KEY]
    await new Promise<void>((resolve) => io.close(() => resolve()))
  }
}

function extendedError(message: string): Error & { code?: string } {
  const err = new Error(message) as Error & { code?: string }
  err.code = 'SEND_HANDSHAKE'
  return err
}
