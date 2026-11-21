/**
 * MinIO 预签名服务：服务器只签名，浏览器直传（定稿）。
 * 修正 D8（原始 fileName 进 key）、D12（协议处理收敛）。
 */
import crypto from 'node:crypto'
import path from 'node:path'
import { Client } from 'minio'
import type { EnvConfig } from '../config.js'

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpstreamError'
  }
}

export interface SignResult {
  key: string
  uploadUrl: string
  downloadUrl: string
  expiresAt: string
}

export interface SignParams {
  roomId?: string
  fileName: string
  size?: number
  /** 请求协议，MINIO_URL_SCHEME=auto 时据此改写 URL 协议 */
  requestProtocol?: 'http:' | 'https:'
}

export interface UploadService {
  sign(params: SignParams): Promise<SignResult>
}

/** 仅取 basename（兼容 win/posix 分隔符），去控制字符，限长 200 */
export function sanitizeFileName(name: string): string {
  let clean = name.split(/[\\/]/).pop() ?? ''
  clean = clean.replace(path.win32.sep, '').replace(/[<>:"|?*\u0000-\u001f]/g, '')
  clean = clean.replace(/^\.+/, '')
  clean = clean.trim().slice(0, 200)
  return clean || 'file'
}

export function buildObjectKey(roomId: string | undefined, fileName: string): string {
  const dir = roomId ?? crypto.randomUUID()
  const prefix = crypto.randomBytes(4).toString('hex')
  return `${dir}/${prefix}-${sanitizeFileName(fileName)}`
}

function normalizeUrl(url: string, scheme: EnvConfig['MINIO_URL_SCHEME'], requestProtocol?: string): string {
  if (scheme === 'keep') return url
  if (scheme === 'https') return url.replace(/^http:/, 'https:')
  // auto：请求是 https 则 URL 用 https（等价旧「剥协议」目的——避免 Mixed Content；
  // 新 URL 保持绝对形式）
  if (requestProtocol === 'https:') return url.replace(/^http:/, 'https:')
  return url
}

export function createUploadService(env: EnvConfig, client?: Client): UploadService {
  const minio =
    client ??
    new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      // region: env.MINIO_REGION,
    })

  return {
    async sign({ roomId, fileName, size, requestProtocol }: SignParams): Promise<SignResult> {
      if (size != null && size > env.MAX_UPLOAD_SIZE) {
        const err: Error & { statusCode?: number } = new Error(
          `文件超过允许上限 ${env.MAX_UPLOAD_SIZE} 字节`,
        )
        err.name = 'PayloadTooLargeError'
        ;(err as { statusCode?: number }).statusCode = 413
        throw err
      }
      const key = buildObjectKey(roomId, fileName)
      try {
        const [putUrl, getUrl] = await Promise.all([
          minio.presignedPutObject(env.MINIO_BUCKET, key, env.UPLOAD_SIGN_TTL),
          minio.presignedGetObject(env.MINIO_BUCKET, key, env.UPLOAD_SIGN_TTL),
        ])
        return {
          key,
          uploadUrl: normalizeUrl(putUrl, env.MINIO_URL_SCHEME, requestProtocol),
          downloadUrl: normalizeUrl(getUrl, env.MINIO_URL_SCHEME, requestProtocol),
          expiresAt: new Date(Date.now() + env.UPLOAD_SIGN_TTL * 1000).toISOString(),
        }
      } catch (error) {
        throw new UpstreamError(`签名失败: ${(error as Error).message}`)
      }
    },
  }
}
