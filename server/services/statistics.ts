/**
 * 统计服务：沿用旧键名 statistics-rooms / statistics-users（SET）。
 * recordUser 恢复写入（D9），身份为握手 username。
 */
import type { Redis } from 'ioredis'
import { STATISTICS_PREFIX } from './room.js'

export interface StatisticsService {
  recordRoomKey(roomId: string): Promise<void>
  removeRoomKey(roomId: string): Promise<boolean>
  listRooms(): Promise<string[]>
  recordUser(username: string): Promise<void>
  listUsers(): Promise<string[]>
}

export function createStatisticsService(redis: Redis): StatisticsService {
  const roomsKey = `${STATISTICS_PREFIX}rooms`
  const usersKey = `${STATISTICS_PREFIX}users`
  return {
    async recordRoomKey(roomId) {
      if (!roomId) return
      await redis.sadd(roomsKey, roomId)
    },
    async removeRoomKey(roomId) {
      return (await redis.srem(roomsKey, roomId)) > 0
    },
    async listRooms() {
      return redis.smembers(roomsKey)
    },
    async recordUser(username) {
      await redis.sadd(usersKey, username)
    },
    async listUsers() {
      return redis.smembers(usersKey)
    },
  }
}
