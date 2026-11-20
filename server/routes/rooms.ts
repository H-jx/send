import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { roomIdSchema, messageSchema } from '../../shared/message.js'
import { RoomGoneError } from '../services/room.js'
import type { AppServices } from '../services/index.js'

export const createRoomResponseSchema = z.object({ roomId: roomIdSchema })
export const joinRoomResponseSchema = z.object({
  roomId: roomIdSchema,
  ttlSeconds: z.number().int(),
  messageCount: z.number().int(),
})
export const messagesResponseSchema = z.object({
  roomId: roomIdSchema,
  items: z.array(messageSchema),
})

export const roomRoutes: FastifyPluginAsyncZod<{ services: AppServices }> = async (app, opts) => {
  const { room } = opts.services

  // A1 创建房间：有界重试 + 原子占位（D2），保留前导零
  app.post(
    '/',
    {
      schema: {
        tags: ['Rooms'],
        summary: '创建房间',
        body: z.object({}).optional(),
        response: { 201: createRoomResponseSchema },
      },
    },
    async (_req, reply) => {
      const { roomId } = await room.createRoom()
      return reply.code(201).send({ roomId })
    },
  )

  // A2 进房校验：不存在/过期 404
  app.get(
    '/:roomId',
    {
      schema: {
        tags: ['Rooms'],
        summary: '校验房间是否存在且未过期',
        params: z.object({ roomId: roomIdSchema }),
        response: {
          200: joinRoomResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { roomId } = req.params
      try {
        return await room.joinRoom(roomId)
      } catch (err) {
        if (err instanceof RoomGoneError) {
          return reply.code(404).send(errorBody(404, 'Not Found', err.message))
        }
        throw err
      }
    },
  )

  // A3 历史消息（与 socket 同一 room service，修复 D1）
  app.get(
    '/:roomId/messages',
    {
      schema: {
        tags: ['Rooms'],
        summary: '读取房间历史消息',
        params: z.object({ roomId: roomIdSchema }),
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).default(200),
        }),
        response: {
          200: messagesResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { roomId } = req.params
      try {
        const items = await room.getMessages(roomId, req.query.limit)
        return { roomId, items }
      } catch (err) {
        if (err instanceof RoomGoneError) {
          return reply.code(404).send(errorBody(404, 'Not Found', err.message))
        }
        throw err
      }
    },
  )
}

export const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({ path: z.string().optional(), message: z.string().optional() })).optional(),
})

export function errorBody(
  statusCode: number,
  error: string,
  message: string,
  details?: { path?: string; message?: string }[],
) {
  return { statusCode, error, message, details }
}
