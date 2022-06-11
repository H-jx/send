import Redis from 'ioredis'
import { logger } from 'src/server/common/logger'
import { redisConfig } from '../config'

export const redis = new Redis({
  ...redisConfig,
  maxRetriesPerRequest: 3,
})

redis
  .get('foo')
  .then(function (result) {
    logger.info(`redis ready`)
  })
  .catch((err) => {
    logger.error(err)
  })
