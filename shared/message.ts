/**
 * 消息模型：HTTP、Socket.IO 与浏览器共用的唯一来源。
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

export const messageSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: messageTypeSchema,
    /** type=text 必填 */
    text: z.string().min(1).max(10_000).optional(),
    /** type=file：下载地址（绝对 URL 或历史协议相对链接） */
    url: z.string().max(2000).optional(),
    file: messageFileSchema.optional(),
    /** 服务端补全 */
    time: z.number().int().optional(),
    /** 服务端按握手 username 补全 */
    sendBy: z.string().max(64).optional(),
  })
  .superRefine((m, ctx) => {
    if (m.type === 'text' && !m.text) {
      ctx.addIssue({ code: 'custom', message: '文本消息必须包含 text', path: ['text'] })
    }
    if (m.type === 'file' && !m.file && !m.url) {
      ctx.addIssue({ code: 'custom', message: '文件消息必须包含 file 或 url', path: ['file'] })
    }
  })

export type Message = z.infer<typeof messageSchema>
export type MessageType = z.infer<typeof messageTypeSchema>
export type MessageFile = z.infer<typeof messageFileSchema>

/**
 * 客户端上行消息 schema：与 messageSchema 相同约束
 * （time/sendBy 本就是 optional，由服务端覆写；zod4 的 refine 不可 extend 覆写键，
 *  故直接复用，见 msgSendSchema 引用处）。
 */
export const msgSendSchema = messageSchema

export type HistoryResponseBody = {
  roomId: string
  items: Message[]
}
