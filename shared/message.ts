/**
 * 消息模型：浏览器渲染明文，HTTP 和 Socket.IO 共用密文格式。
 * 对应 refactor/03 §3 与 refactor/04。
 */
import { z } from 'zod'

/** 四位数字房间号，保留前导零 */
export const roomIdSchema = z
  .string()
  .regex(/^\d{4}$/, { message: '房间号必须是 4 位数字' })

export const messageTypeSchema = z.enum(['text', 'file'])

export const messageFileSchema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().min(0),
})

const messageMetadata = {
  id: z.string().min(1).max(64),
  time: z.number().int().optional(),
  sendBy: z.string().max(64).optional(),
}

export const messageContentSchema = z
  .object({
    type: messageTypeSchema,
    /** type=text 必填 */
    text: z.string().min(1).max(10_000).optional(),
    /** type=file：下载地址（绝对 URL 或历史协议相对链接） */
    url: z.string().max(2000).optional(),
    file: messageFileSchema.optional(),
  })
  .superRefine((m, ctx) => {
    if (m.type === 'text' && !m.text) {
      ctx.addIssue({ code: 'custom', message: '文本消息必须包含 text', path: ['text'] })
    }
    if (m.type === 'file' && !m.file && !m.url) {
      ctx.addIssue({ code: 'custom', message: '文件消息必须包含 file 或 url', path: ['file'] })
    }
  })

export const messageSchema = messageContentSchema.safeExtend(messageMetadata)

export type Message = z.infer<typeof messageSchema>
export type MessageType = z.infer<typeof messageTypeSchema>
export type MessageFile = z.infer<typeof messageFileSchema>

export const msgSendSchema = z.strictObject({
  id: messageMetadata.id,
  v: z.literal(1),
  iv: z.base64url().length(16),
  // 覆盖原有内容上限在最坏情况下的 JSON 转义、认证标签与 Base64URL 编码。
  ciphertext: z.base64url().min(22).max(100_000),
})
export type EncryptedMessageInput = z.infer<typeof msgSendSchema>

const encryptedMessageSchema = msgSendSchema.extend(messageMetadata)

// 历史允许读取加密功能上线前的明文记录。
export const roomMessageSchema = z.union([encryptedMessageSchema, messageSchema])
export type RoomMessage = z.infer<typeof roomMessageSchema>

export type HistoryResponseBody = {
  roomId: string
  items: RoomMessage[]
}
