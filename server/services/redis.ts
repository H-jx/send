import { Redis } from 'ioredis'
import type { EnvConfig } from '../config.js'

export interface RedisHandle {
  client: Redis
  /** 由本工厂创建的客户端才在关闭时 quit */
  ownsClient: boolean
}

export function createRedisClient(env: EnvConfig): RedisHandle {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  })
  client.on('error', (err: Error) => {
    // 只记摘要，不打印配置
    console.error('[redis] error:', err.message)
  })
  return { client, ownsClient: true }
}

/** 提供给测试/导码的注入形态 */
export function wrapRedis(client: Redis): RedisHandle {
  return { client, ownsClient: false }
}
