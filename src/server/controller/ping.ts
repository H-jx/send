import { RPCService, RPCMethod } from 'ts-brpc/server'
import { successJSON } from '../common/response'
import { ResponseBody } from '../interface/Http'

@RPCService()
export class Ping {
  @RPCMethod()
  ping(): ResponseBody<unknown> {
    // 从上游获取数据
    return successJSON<unknown>()
  }
}
