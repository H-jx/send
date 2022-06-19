import { createRemoteService, RPCKey } from 'ts-brpc/client'
import { client as rpcCientCfg } from 'src/ts-brpc.json'
import { FFSend } from 'src/lib/rpc-definition'

const url = process.env.NODE_ENV === 'development' ? rpcCientCfg.apps.local : `${window.location.host}/api`
export const rpc = createRemoteService<FFSend>({
  baseUrl: `//${url}`,
})

export const BaseUrl = url.replace('/api', '')
