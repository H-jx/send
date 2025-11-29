import Redis from 'ioredis'
import { outLogger } from '@/server/common/logger'
import { redisConfig } from '../config'

export const redis = new Redis({
  ...redisConfig,
  maxRetriesPerRequest: 3,
})

redis
  .get('foo')
  .then(function (result) {
    outLogger.info(`redis ready`)
  })
  .catch((err) => {
    outLogger.error(err)
  })
