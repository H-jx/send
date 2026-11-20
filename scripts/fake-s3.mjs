/**
 * 本地开发/验证用的最小 S3 替身（仅接受 path 风格 PUT/GET/HEAD）。
 * ⚠️ 不校验签名：只用于在无 MinIO/SeaweedFS 环境下打通
 * “预签名 URL → 浏览器 PUT → 下载回读”的 UI 链路。
 * 生产必须对接真实 MinIO（验证边界已记录在交付说明）。
 */
import http from 'node:http'

const PORT = Number(process.env.FAKE_S3_PORT ?? 9100)
const store = new Map()

const server = http.createServer((req, res) => {
  const key = decodeURIComponent(req.url ?? '')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,HEAD,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Expose-Headers', 'ETag')
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }
  if (req.method === 'PUT') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      store.set(key, Buffer.concat(chunks))
      res.setHeader('ETag', `"${key.length.toString(16)}"`)
      res.writeHead(200).end()
      console.log(`[fake-s3] PUT ${key} (${store.get(key).length} bytes)`)
    })
    return
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    const body = store.get(key)
    if (!body) {
      res.writeHead(404, { 'content-type': 'application/xml' })
      res.end('<Error><Code>NoSuchKey</Code></Error>')
      return
    }
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': String(body.length),
    })
    res.end(req.method === 'HEAD' ? undefined : body)
    console.log(`[fake-s3] GET ${key}`)
    return
  }
  res.writeHead(405).end()
})

server.listen(PORT, () => console.log(`[fake-s3] listening on http://localhost:${PORT} (no signature check)`))
