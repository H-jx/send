import * as fs from 'fs'
import { resolve, join } from 'path'
// uat-config 注入容器默认位置

const configPath = resolve(join(__dirname, './config.json'))
const defaultConfig = {
  redis: {
    host: '192.168.0.1',
    port: 27125,
  },
  minio: {
    bucket: '',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
  },
}

const config = defaultConfig

try {
  const configString = fs.readFileSync(configPath, { encoding: 'utf-8' })
  Object.assign(config, JSON.parse(configString))
} catch (error) {
  console.warn((error as Error).message)
}

export const redisConfig = config.redis

export const bossConfig = config.minio
