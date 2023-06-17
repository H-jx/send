import { Context } from 'koa'
import { RPCMethod, RPCService } from 'ts-brpc/server'
import { outLogger } from '../common/logger'
import { errorJSON, successJSON } from '../common/response'
import { ResponseBody } from '../interface/Http'
import { createRoom, getRoom } from '../service/room'
import { randomWord } from '../utils'

@RPCService()
export class Room {
  ctx!: Context
  @RPCMethod()
  async join(roomId?: string): Promise<ResponseBody<{ roomId: string }>> {
    try {
      const id = roomId ? roomId : randomWord(4)
      if (!roomId) {
        let newRoomId = id as string
        let roomData: null | string = await getRoom(newRoomId)
        while (roomData != null) {
          roomData = await getRoom(newRoomId)
          newRoomId = randomWord(4)
        }
        await createRoom(id as string)
        return successJSON({ data: { roomId: id } })
      }
      const room = await getRoom(id)
      // 不存在或者过期
      if (!room) {
        return errorJSON({ message: '房间号不存在或者已过期' })
      }
      return successJSON({ data: { roomId: id } })
    } catch (error) {
      outLogger.error(error)
      return errorJSON({ message: (error as Error).message })
    }
  }

  @RPCMethod()
  async getRoomMessageHistory(roomId: string): Promise<ResponseBody<any>> {
    try {
      if (!roomId) {
        return errorJSON({ message: '房间号不存在' })
      }
      const room = await getRoom()
      // 不存在或者过期
      if (!room) {
        return errorJSON({ message: '房间号过期' })
      }
      return successJSON({ data: JSON.parse(room) })
    } catch (error) {
      outLogger.error(error)
      return errorJSON()
    }
  }
}
