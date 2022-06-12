import * as fs from 'fs'
// uat-config 注入容器默认位置

const configPath = '/data/conf/paladin/config.json'
const defaultConfig = {
  redis: {
    host: '192.168.0.1',
    port: 27125,
  },
  minio: {
    bucket: 'static',
    endpoint: 'minio.8and1.cn',
    accessKeyId: 'wxnAz7zmiClAXlqJ',
    secretAccessKey: 'R1zYDiyFLK0wWNf3ZTZzIwgEiavbyCWN',
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
