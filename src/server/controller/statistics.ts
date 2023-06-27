import { Context } from 'koa'
import { RPCMethod, RPCService } from 'ts-brpc/server'
import { outLogger } from '../common/logger'
import { errorJSON, successJSON } from '../common/response'
import { ResponseBody } from '../interface/Http'

import { getCurrentRoomts, getUserList } from '../service/statistics'

@RPCService()
export class Statistics {
  ctx!: Context
  @RPCMethod()
  async getCurrentRoomts(): Promise<ResponseBody<string[]>> {
    try {
      const rooms = await getCurrentRoomts()

      return successJSON({ data: rooms })
    } catch (error) {
      outLogger.error(error)
      return errorJSON({ message: (error as Error).message })
    }
  }

  @RPCMethod()
  async getUserList(): Promise<ResponseBody<string[]>> {
    try {
      const data = await getUserList()
      return successJSON({ data: data })
    } catch (error) {
      outLogger.error(error)
      return errorJSON()
    }
  }
}
