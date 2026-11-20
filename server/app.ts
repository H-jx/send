/**
 * Fastify 组装（运行 / 测试 / OpenAPI 导出共用，不 listen）。
 * 顺序：插件 → swagger（docs）→ API 路由 → /api/* JSON 404。
 */
import Fastify, { type FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { loadEnvConfig, type EnvConfig } from './config.js'
import { createServices, type AppServices } from './services/index.js'
import { RoomGoneError } from './services/room.js'
import { UpstreamError } from './services/minio.js'
import { roomRoutes, errorBody } from './routes/rooms.js'
import { uploadRoutes } from './routes/uploads.js'
import { statisticsRoutes, healthRoutes } from './routes/statistics.js'

export interface BuildAppOptions {
  env?: EnvConfig
  /** 注入服务（测试/导码用 stub；缺省创建真实服务） */
  services?: AppServices
  /** 注册 @fastify/swagger（必须先于 API 路由） */
  docs?: boolean
  logger?: false
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnvConfig()
  const services = options.services ?? createServices(env)
  const ownsServices = !options.services

  const app: FastifyInstance = Fastify({
    logger: options.logger === false ? false : { level: env.LOG_LEVEL === 'silent' ? 'fatal' : env.LOG_LEVEL },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // 注意：不注册 @fastify/cors —— 它会 options('*', …) 抢占适配器 catch-all all('*')，
  // 造成 "already declared for route '*'"。单进程同端口 = 全同源，本就不需要 HTTP CORS；
  // Socket.IO 跨域由 engine.io 响应头处理（realtime 内部 cors 配置），无路由冲突。
  // 若未来出现真跨域消费方，用 onRequest hook 实现（见 refactor/07）。

  if (options.docs) {
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0' as never,
        info: { title: 'send API', version: env.APP_VERSION },
        servers: [{ url: '/' }],
      },
      transform: jsonSchemaTransform,
    })
  }

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const validation =
        (err as { validation?: { instancePath?: string; message?: string }[] }).validation ?? []
      return reply
        .code(400)
        .send(
          errorBody(400, 'Bad Request', err.message, validation.map((v) => ({ path: v.instancePath, message: v.message }))),
        )
    }
    if (isResponseSerializationError(err)) {
      req.log.error(err)
      return reply.code(500).send(errorBody(500, 'Internal Server Error', '响应序列化失败'))
    }
    if (err instanceof RoomGoneError) {
      return reply.code(404).send(errorBody(404, 'Not Found', err.message))
    }
    if (err instanceof UpstreamError) {
      req.log.error(err)
      return reply.code(502).send(errorBody(502, 'Bad Gateway', err.message))
    }
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500
    if (statusCode >= 500) req.log.error(err)
    const message = statusCode < 500 ? (err as Error).message : '服务器内部错误'
    return reply
      .code(statusCode)
      .send(errorBody(statusCode, (err as { error?: string }).error ?? 'Error', message))
  })

  // —— API 先注册，页面适配器随后（catch-all 最低优先级）——
  await app.register(roomRoutes, { prefix: '/api/rooms', services })
  await app.register(uploadRoutes, { prefix: '/api/uploads', services })
  await app.register(statisticsRoutes, { prefix: '/api/statistics', services })
  await app.register(healthRoutes, { prefix: '/api/health', services })

  // 未知 /api/* 返回 JSON 404，而不是落到页面 catch-all
  app.all('/api/*', { schema: { hide: true } }, (req, reply) =>
    reply
      .code(404)
      .type('application/json; charset=utf-8')
      .send(errorBody(404, 'Not Found', `未知接口: ${req.method} ${req.url}`)),
  )

  app.addHook('onClose', async () => {
    if (ownsServices) await services.dispose()
  })

  return app
}
