import Redis from 'ioredis'
import { loadEnvConfig, type EnvConfig } from '../server/config.js'

/** 测试环境：本地 Redis db15（docker 容器），MinIO 走离线签名（region 固定，不发请求） */
export function testEnv(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return loadEnvConfig({
    NODE_ENV: 'test',
    REDIS_URL: 'redis://127.0.0.1:6379/15',
    LOG_LEVEL: 'silent',
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: 9000,
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'testuser',
    MINIO_SECRET_KEY: 'testpass123',
    MINIO_BUCKET: 'send-test',
    ...overrides,
  })
}

export interface RedisProbe {
  redis: Redis
}

/** 本地 Redis 不可达时返回 null，由调用方 skip 并记录验证边界 */
export async function tryConnectRedis(): Promise<RedisProbe | null> {
  try {
    const redis = new Redis(testEnv().REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2500,
      lazyConnect: true,
    })
    await redis.connect()
    await redis.ping()
    return { redis }
  } catch {
    return null
  }
}
