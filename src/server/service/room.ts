import { Message } from '@/lib/interface'
import { redis } from '../db/redis'
const roomPrefix = 'room-'
const sevenDay = 86400 * 30

export async function getRoom(roomId?: string) {
  const key = `${roomPrefix}${roomId}`
  const room = await redis.get(key)
  return room
}
export async function getRoomTll(roomId?: string) {
  const key = `${roomPrefix}${roomId}`
  const t = await redis.ttl(key)
  return t
}
export async function createRoom(roomId: string) {
  const key = `${roomPrefix}${roomId}`
  await redis.set(key, '[]')
  await redis.expire(key, sevenDay)
}
export async function removeRoom(roomId: string) {
  const key = `${roomPrefix}${roomId}`
  await redis.del(key)
}

export async function getRoomMessageList(roomId: string): Promise<Message[]> {
  const roomMessageListString = await getRoom(roomId)
  if (roomMessageListString == null) {
    throw Error(`房间号${roomId}不存在或者过期`)
  }
  return JSON.parse(roomMessageListString)
}

export async function pushMessage(roomId: string, message: Message) {
  const roomMessageListString = await getRoom(roomId)
  const key = `${roomPrefix}${roomId}`
  if (roomMessageListString == null) {
    throw Error(`房间号${roomId}不存在或者过期`)
  }
  const msg: Message = {
    id: message.id,
    type: message.type,
    time: message.time,
  }
  if (message.file) {
    msg.file = message.file
    msg.url = message.url
  } else {
    msg.text = message.text
  }

  const list = JSON.parse(roomMessageListString)
  list.push(msg)
  await redis.set(key, JSON.stringify(list))
  await redis.expire(key, sevenDay)
  return msg
}
