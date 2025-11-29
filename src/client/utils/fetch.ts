import { createRemoteService, RPCKey } from 'ts-brpc/client'
import { client as rpcCientCfg } from '@/ts-brpc.json'
import { FFSend } from '@/lib/rpc-definition'

const url = process.env.NODE_ENV === 'development' ? rpcCientCfg.apps.local : `${window.location.host}/api`
export const rpc = createRemoteService<FFSend>({
  baseUrl: `//${url}`,
})

export const BaseUrl = url.replace('/api', '')
