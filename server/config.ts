/**
 * 进程配置唯一入口：环境变量 + zod 校验（fail-fast）。
 * 对应 refactor/06 §1；密钥禁止出现在日志中。
 * dev 便利：若无 MINIO_* 环境变量，允许回退读取旧版 src/server/config.json
 * （该文件在 .gitignore 内）；生产模式必须用环境变量。
 */
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

// Node ≥20.6 的 .env 支持；不存在则忽略
try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'))
} catch {
  /* no .env */
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3004),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),

  MINIO_ENDPOINT: z.string().min(1).default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_ACCESS_KEY: z.string().min(1).default(''),
  MINIO_SECRET_KEY: z.string().min(1).default(''),
  MINIO_BUCKET: z.string().min(1).default('send'),
  /** 固定 region 避免 SDK 预签名前发起 GetBucketLocation（离线签名） */
  MINIO_REGION: z.string().default('us-east-1'),
  /** 预签名 URL 协议策略：auto=按请求协议改写；keep=SDK 原样；https=强制 https */
  MINIO_URL_SCHEME: z.enum(['auto', 'keep', 'https']).default('auto'),
  /** 预签名有效期（秒），默认 7 天，同旧实现 */
  UPLOAD_SIGN_TTL: z.coerce.number().int().default(60 * 60 * 24 * 7),

  /** 房间 TTL（秒）。常量正名：线上旧值是 30 天（D5） */
  ROOM_TTL: z.coerce.number().int().default(60 * 60 * 24 * 30),
  /** 单房间保留的最近消息数（LIST LTRIM） */
  ROOM_MAX_MESSAGES: z.coerce.number().int().default(1000),
  MESSAGES_LIMIT_MAX: z.coerce.number().int().default(500),
  MAX_UPLOAD_SIZE: z.coerce.number().int().default(2 * 1024 * 1024 * 1024),

  CORS_ORIGINS: z
    .string()
    .default('*')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
  SOCKET_PING_INTERVAL: z.coerce.number().int().default(3500),
  /** 清扫定时器间隔（秒），替代断线时全库扫描（D7） */
  CLEANUP_INTERVAL: z.coerce.number().int().default(600),

  APP_VERSION: z.string().default('2.0.0'),
})

export type EnvConfig = z.infer<typeof envSchema>

function readLegacyConfigJson(): Partial<EnvConfig> {
  const candidates = [
    path.resolve(process.cwd(), 'config.json'),
    path.resolve(process.cwd(), 'src/server/config.json'),
  ]
  for (const file of candidates) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      const minio = raw?.minio ?? {}
      if (!minio.accessKeyId || !minio.secretAccessKey) continue
      const endpoint: string = minio.endpoint ?? minio.endPoint ?? ''
      const [host, portPart] = endpoint.includes(':') ? endpoint.split(':') : [endpoint, undefined]
      return {
        MINIO_ENDPOINT: host || undefined,
        MINIO_PORT: portPart ? Number(portPart) : undefined,
        MINIO_ACCESS_KEY: minio.accessKeyId,
        MINIO_SECRET_KEY: minio.secretAccessKey,
        MINIO_BUCKET: minio.bucket || undefined,
      } as Partial<EnvConfig>
    } catch {
      /* try next */
    }
  }
  return {}
}

let cached: EnvConfig | undefined

export function loadEnvConfig(overrides: Partial<EnvConfig> = {}): EnvConfig {
  if (cached && Object.keys(overrides).length === 0) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`环境变量校验失败:\n${issues}`)
  }
  let env = parsed.data
  // dev 便利：仓库内遗留 config.json 补 MINIO 凭据（生产/测试禁用）
  if (env.NODE_ENV === 'development' && !process.env.MINIO_ACCESS_KEY) {
    const legacy = readLegacyConfigJson()
    if (legacy.MINIO_ACCESS_KEY) env = { ...env, ...legacy }
  }
  env = { ...env, ...overrides }
  if (!env.MINIO_ACCESS_KEY && env.NODE_ENV === 'production') {
    throw new Error('生产环境必须通过环境变量提供 MINIO_ACCESS_KEY / MINIO_SECRET_KEY')
  }
  if (Object.keys(overrides).length === 0) cached = env
  return env
}
