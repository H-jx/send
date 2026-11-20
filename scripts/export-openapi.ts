/**
 * 从实际 Fastify 路由 schema 导出 OpenAPI 3.1 → openapi.json。
 * 使用 stub 服务：不连 Redis/MinIO、不监听端口，可离线重复执行。
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildApp } from '../server/app.js'
import { loadEnvConfig } from '../server/config.js'
import { stubServices } from '../server/services/index.js'

const env = loadEnvConfig()
const app = await buildApp({ env, services: stubServices(env), docs: true, logger: false })
await app.ready()

const spec = app.swagger({ yaml: false })
const json = typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
const outPath = path.resolve(import.meta.dirname, '../openapi.json')
fs.writeFileSync(outPath, `${json}\n`, 'utf8')
console.log(`[openapi] 已导出 ${outPath}`)
await app.close()
