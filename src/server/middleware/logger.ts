import { Context } from 'koa'
import { logger } from '../common/logger'
/**
 * 日志中间件
 */
export default async (ctx: Context, next: () => Promise<void>) => {
  if (ctx.url === '/api/Ping/ping' || ctx.url.includes('/index.html')) {
    await next()
    return
  }
  const start = new Date().getTime()
  logger.info(`<-- ${ctx.method} ${ctx.url}`)
  await next()
  const ms = new Date().getTime() - start
  logger.info(`--> ${ctx.method} ${ctx.url} - ${ms}ms`)
}
