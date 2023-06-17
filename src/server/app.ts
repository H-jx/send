require('module-alias/register')
import http from 'http'
import path from 'path'
import Koa from 'koa'
import cors from '@koa/cors'
import serve from 'koa-static'
import koaBody from 'koa-body'
import { bindKoa } from 'ts-brpc/server'
import historyApiFallback from 'koa2-connect-history-api-fallback'
import { logger as loggerMiddleware } from './middleware'
import { outLogger } from 'src/server/common/logger'
import { attach } from 'src/server/ws/socketIO'
import { getIPAdress } from './utils'
import './db/redis'

const port = 3000
const app = new Koa()

app.use(koaBody({ multipart: true }))

bindKoa({
  app,
  rpcMetaPath: path.resolve(__dirname, '../_rpc_gen_meta_.json'),
  prefixPath: '/api',
})
// middlewares

app
  .use(cors())
  .use(historyApiFallback({ whiteList: ['/api'] }))
  .use(
    serve(path.resolve(__dirname, '../client'), {
      maxage: 86400000 * 7,
      index: 'index.html',
    }),
  )
  .use(loggerMiddleware)

app.on('error', function (err: Error, ctx: Koa.Context) {
  ctx.throw(400, err.message)
})

const server = http.createServer(app.callback())

server.listen(port, () => {
  outLogger.info(`Listening on http://${getIPAdress()}:${port}`)
})

attach(server)

export default app
