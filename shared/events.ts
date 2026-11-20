/**
 * 实时协议：前后端共用的事件名、握手与 ack 类型。
 * 对应 refactor/04（首期＝服务器中继版；WebRTC DataChannel 为后续迭代，
 * 届时在本文件扩展 rtc:* 事件即可，传输层边界不变）。
 */
import { z } from 'zod'
import { msgSendSchema, roomIdSchema, type Message } from './message.js'

export const SOCKET_EVENTS = {
  /** 服务端 → 新进入者：房间历史消息（握手校验房间后先同步历史） */
  ROOM_JOINED: 'room:joined',
  /** 客户端 → 服务端：发送消息（带 ack） */
  MSG_SEND: 'msg:send',
  /** 服务端 → 房间内其他设备：增量消息（发送者无回声） */
  MSG_RECEIVE: 'msg:receive',
  /** 服务端 → 房间内全部：在线端数量变化 */
  ROOM_PEER: 'room:peer',
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]

export const socketHandshakeSchema = z.object({
  roomId: roomIdSchema,
  username: z.string().min(1).max(64).optional(),
})
export type SocketHandshake = z.infer<typeof socketHandshakeSchema>

/** msg:send 的 ack：成功 {success:true}；失败带 message */
export type SendAck = { success: boolean; message?: string }

export type RoomPeerInfo = { count: number }

/** 客户端 → 服务端 */
export interface SocketClientToServer {
  [SOCKET_EVENTS.MSG_SEND]: (
    msg: z.infer<typeof msgSendSchema>,
    ack?: (res: SendAck) => void,
  ) => void
}

/** 服务端 → 客户端 */
export interface SocketServerToClient {
  [SOCKET_EVENTS.ROOM_JOINED]: (history: Message[]) => void
  [SOCKET_EVENTS.MSG_RECEIVE]: (msg: Message) => void
  [SOCKET_EVENTS.ROOM_PEER]: (info: RoomPeerInfo) => void
}

export type SocketHandlers = SocketServerToClient & SocketClientToServer
