import type { Message } from '@/shared/message'

/** 客户端视图消息：服务端 Message + 本地上传/发送状态 */
export interface UiMessage extends Message {
  status?: 'uploading' | 'sending' | 'resolved' | 'rejected'
  percent?: number
  error?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnect'
