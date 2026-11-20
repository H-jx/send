import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { roomIdSchema } from '../../shared/message.js'
import type { AppServices } from '../services/index.js'

export const statisticsRoutes: FastifyPluginAsyncZod<{ services: AppServices }> = async (app, opts) => {
  const { stats } = opts.services

  // A5 活跃房间列表
  app.get(
    '/rooms',
    {
      schema: {
        tags: ['Statistics'],
        summary: '活跃房间号列表',
        response: { 200: z.object({ rooms: z.array(z.string()) }) },
      },
    },
    async () => ({ rooms: await stats.listRooms() }),
  )

  // A6 用户列表（握手 username，D9 恢复写入）
  app.get(
    '/users',
    {
      schema: {
        tags: ['Statistics'],
        summary: '用户列表',
        response: { 200: z.object({ users: z.array(z.string()) }) },
      },
    },
    async () => ({ users: await stats.listUsers() }),
  )
}

export const healthRoutes: FastifyPluginAsyncZod<{ services: AppServices }> = async (app, opts) => {
  // A7 进程健康检查
  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: '健康检查',
        response: {
          200: z.object({
            status: z.literal('ok'),
            uptime: z.number(),
            version: z.string(),
          }),
        },
      },
    },
    async () => ({
      status: 'ok' as const,
      uptime: Math.round(process.uptime()),
      version: opts.services.env.APP_VERSION,
    }),
  )
}
