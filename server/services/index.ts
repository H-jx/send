/**
 * 服务装配：routes 与 realtime 共用同一实例（refactor/02 §2 定稿）。
 * 支持注入 redis/minio 客户端——OpenAPI 导出与单测不触网、不占端口。
 */
import type { Redis } from 'ioredis'
import type { Client } from 'minio'
import { loadEnvConfig, type EnvConfig } from '../config.js'
import { createRedisClient, wrapRedis } from './redis.js'
import { createRoomService, type RoomService } from './room.js'
import { createStatisticsService, type StatisticsService } from './statistics.js'
import { createUploadService, type UploadService } from './minio.js'

export interface AppServices {
  env: EnvConfig
  room: RoomService
  stats: StatisticsService
  uploads: UploadService
  /** 仅当本工厂创建了 Redis 客户端时生效 */
  dispose(): Promise<void>
}

export interface InjectedClients {
  redis?: Redis
  minioClient?: Client
}

export function createServices(env: EnvConfig = loadEnvConfig(), injected: InjectedClients = {}): AppServices {
  const handle = injected.redis ? wrapRedis(injected.redis) : createRedisClient(env)
  const stats = createStatisticsService(handle.client)
  const room = createRoomService({
    redis: handle.client,
    ttl: env.ROOM_TTL,
    maxMessages: env.ROOM_MAX_MESSAGES,
    onRoomRegistered: (id) => void stats.recordRoomKey(id),
  })
  const uploads = createUploadService(env, injected.minioClient)
  return {
    env,
    room,
    stats,
    uploads,
    dispose: async () => {
      if (handle.ownsClient) await handle.client.quit()
    },
  }
}

/** OpenAPI 导出用：路由注册即可，不允许真正执行 handler */
export function stubServices(env: EnvConfig = loadEnvConfig()): AppServices {
  const fail = async (): Promise<never> => {
    throw new Error('stub service 不可在导出/文档场景调用')
  }
  return {
    env,
    room: {
      createRoom: fail,
      joinRoom: fail,
      getMessages: fail,
      appendMessage: fail,
      removeRoom: fail,
      sweepExpired: fail,
    } as RoomService,
    stats: {
      recordRoomKey: fail,
      removeRoomKey: fail,
      listRooms: fail,
      recordUser: fail,
      listUsers: fail,
    } as StatisticsService,
    uploads: { sign: fail } as UploadService,
    dispose: async () => {},
  }
}
