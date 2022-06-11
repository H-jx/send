import { createRemoteService, RPCKey } from 'ts-brpc/client'
import { client as rpcCientCfg } from 'src/ts-brpc.json'
import { FFSend } from 'src/lib/rpc-definition'

const url = process.env.NODE_ENV === 'development' ? rpcCientCfg.apps.local : window.location.host
export const rpc = createRemoteService<FFSend>({
  baseUrl: url + '/api',
})

export const BaseUrl = url
