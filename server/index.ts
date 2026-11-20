/**
 * 服务入口：开发时由 fastifyReactRouterDev 调用 createServer(vite)；
 * 生产独立启动并监听单端口。Socket.IO 永远挂在实际接收连接的 HTTP server 上。
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fastifyReactRouter } from '@mcansh/react-router-fastify'
import type { ViteDevServer } from 'vite'
import { buildApp } from './app.js'
import { loadEnvConfig } from './config.js'
import { createServices } from './services/index.js'
import { attachSocket, closeSocketOn } from './realtime/index.js'
import { startCleanupTimer } from './services/cleanup.js'

export async function createServer(vite?: ViteDevServer) {
  const env = loadEnvConfig()
  const services = createServices(env)

  const app = await buildApp({
    env,
    services,
    docs: env.NODE_ENV !== 'production',
    logger: env.LOG_LEVEL === 'silent' ? false : undefined,
  })

  await app.register(fastifyReactRouter, {
    devServer: vite,
    staticOptions: { index: 'index.html' },
    assetCacheControl: 'public, max-age=31536000, immutable',
    fileCacheControl: 'public, max-age=3600',
  })

  // dev：真正接连接的是 Vite 的 HTTP server；prod：Fastify 自己的
  const host = (vite?.httpServer ?? app.server)!
  const io = attachSocket(host as Parameters<typeof attachSocket>[0], services)
  const cleanup = startCleanupTimer(services)

  app.addHook('onClose', async () => {
    cleanup.stop()
    await closeSocketOn(host, io)
  })

  return app
}

const invokedDirectly =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedDirectly) {
  const app = await createServer()
  const env = loadEnvConfig()
  await app.listen({ port: env.PORT, host: env.HOST })
  app.log.info(`send listening on http://${env.HOST}:${env.PORT}`)
}
