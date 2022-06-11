import { redis } from '../db/redis'
const statisticsPrefix = 'statistics-'

export async function getCurrentRoomts() {
  const key = `${statisticsPrefix}rooms`
  const room = await redis.smembers(key)
  return room ?? []
}

export async function recordRoomKey(roomId: string) {
  const key = `${statisticsPrefix}rooms`
  const isMember = await redis.sismember(key, roomId)
  if (!isMember) {
    redis.sadd(key, roomId)
  }
  return
}

export async function removeRoomKey(roomId: string) {
  const key = `${statisticsPrefix}rooms`
  const result = await redis.srem(key, roomId)
  return Boolean(result)
}

export async function getUserList(): Promise<string[]> {
  const key = `${statisticsPrefix}users`
  const members = await redis.smembers(key)
  return members
}

export async function recordUser(userid: string) {
  const key = `${statisticsPrefix}users`
  const isMember = await redis.sismember(key, userid)
  if (!isMember) {
    redis.sadd(key, userid)
  }
  return
}
