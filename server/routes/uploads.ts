import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { roomIdSchema } from '../../shared/message.js'
import type { AppServices } from '../services/index.js'

export const signRequestSchema = z.object({
  roomId: roomIdSchema.optional(),
  fileName: z.string().min(1).max(200),
  size: z.number().int().nonnegative().optional(),
})

export const signResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string(),
  downloadUrl: z.string(),
  expiresAt: z.string(),
})

export const uploadRoutes: FastifyPluginAsyncZod<{ services: AppServices }> = async (app, opts) => {
  const { uploads } = opts.services

  // A4 上传签名：浏览器据此 PUT 直传 MinIO
  app.post(
    '/sign',
    {
      schema: {
        tags: ['Uploads'],
        summary: '获取 MinIO 预签名上传/下载 URL',
        body: signRequestSchema,
        response: { 200: signResponseSchema },
      },
    },
    async (req) => {
      const proto = firstHeader(req.headers['x-forwarded-proto']) ?? req.protocol ?? 'http'
      return uploads.sign({
        roomId: req.body.roomId,
        fileName: req.body.fileName,
        size: req.body.size,
        requestProtocol: proto === 'https' ? 'https:' : 'http:',
      })
    },
  )
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
