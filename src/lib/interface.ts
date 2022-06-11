import io from 'socket.io'
import { arrayToMap } from './utils'

export interface Message {
  id: string
  // tempId?: string
  type: 'text' | 'file'
  text?: string
  url?: string
  file?: {
    name: string
    size: number
  }
  time?: number
  sendBy?: string
}
/**
 * socket.io 事件
 */
export const SOCKET_EVENT_MAP = arrayToMap(['ROOM_JOINED', 'MSG_SEND', 'MSG_RECEIVE'])
export type SocketEvents = keyof typeof SOCKET_EVENT_MAP

/**
 * Socket emit事件， 前端侧
 */
export interface SocketHandler {
  [SOCKET_EVENT_MAP.ROOM_JOINED]: (historyMsgs: Message[]) => void
  [SOCKET_EVENT_MAP.MSG_RECEIVE]: (msg: Message, callback?: () => void) => void
  [SOCKET_EVENT_MAP.MSG_SEND]: (msg: Message, callback?: (resp: { success: boolean; message: string }) => void) => void
}
