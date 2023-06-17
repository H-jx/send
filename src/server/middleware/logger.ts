import { Context } from 'koa'
import { outLogger } from '../common/logger'
/**
 * 日志中间件
 */
export default async (ctx: Context, next: () => Promise<void>) => {
  if (ctx.url === '/api/Ping/ping' || ctx.url.includes('/index.html')) {
    await next()
    return
  }
  const start = new Date().getTime()
  outLogger.info(`<-- ${ctx.method} ${ctx.url}`)
  await next()
  const ms = new Date().getTime() - start
  outLogger.info(`--> ${ctx.method} ${ctx.url} - ${ms}ms`)
}
