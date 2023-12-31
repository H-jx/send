import { Client } from 'minio'
import { RPCMethod, RPCService } from 'ts-brpc/server'
import { v4 as uuidv4 } from 'uuid'
import { bossConfig } from '../config'
import { errorJSON, successJSON } from '../common/response'
import { outLogger } from '../common/logger'
import { ResponseBody } from '../interface/Http'
import { redis } from '../db/redis'
import { Context } from 'koa'

const minioClient = new Client({
  endPoint: 'minio.8and1.cn',
  port: 80,
  useSSL: false,
  accessKey: bossConfig.accessKeyId,
  secretKey: bossConfig.secretAccessKey,
})
const signedUrlExpireSeconds = 60 * 60 * 24 * 7;
outLogger.info(bossConfig);
@RPCService()
export class Upload {
  ctx!: Context

  @RPCMethod()
  async getUploadAction(query: {
    roomid?: string
    fileName: string
  }): Promise<ResponseBody<{ upload?: string; download: string }>> {
    const referer = this.ctx.header['referer'] || '';
    const isHttps = referer.includes('https')
    // 使用url模块解析URL
    const parsedUrl = new URL(referer);
    // 提取查询参数
    const queryParams = parsedUrl.searchParams;

    
    const params = {
      Bucket: bossConfig.bucket,
      Key: `${query.roomid ?? queryParams.get('roomid') ?? uuidv4()}/${query.fileName}`,
      Expires: signedUrlExpireSeconds,
    }

    // if (query.roomid) {
    //   try {
    //     const downloadURL = await minioClient.presignedGetObject(params.Bucket, params.Key, params.Expires)
    //     return successJSON({ data: { download: downloadURL } })
    //     // 获取下载链接
    //   } catch (error) {
    //     // console.log(error)
    //     // 不存在则继续
    //   }
    // }
    try {
      let [upload, download] = await Promise.all([
        minioClient.presignedPutObject(params.Bucket, params.Key, params.Expires),
        minioClient.presignedGetObject(params.Bucket, params.Key, params.Expires),
      ])

      // const configReplace = await redis.get('test-replace')

      if (isHttps) {
        upload = upload.replace(/https?:/, '')
        download = download.replace(/https?:/, '')
      }
      return successJSON({ data: { upload: upload, download: download } })
    } catch (error) {
      outLogger.error(error)
      return errorJSON({ message: `签名失败: ${error}` })
    }
  }
}

// export const uploadFile = async (ctx: Context) => {
//   const files = ctx.request.files ?? {}
//   for (const fileName in files) {
//     if (Object.prototype.hasOwnProperty.call(files, fileName)) {
//       const file = files[fileName]
//       if (Array.isArray(file)) {
//         logger.error(`${fileName} file is Array, len ${file.length}`)
//         return
//       }
//       const contentType = mime.lookup(fileName)
//       if (!contentType) {
//         logger.error(`${fileName} contentType get fail`)
//         continue
//       }
//       const stream = createReadStream(file.path)
//       const buffer = await stream2buffer(stream)
//       try {
//         const data = await s3
//           .upload({
//             Bucket: bossConfig.bucket, // boss-bucket
//             Key: `${file.hash}-${fileName}`,
//             ContentType: contentType, // 可选
//             Body: buffer,
//           })
//           .promise()
//         ctx.body = successJSON({ data: { url: data.Location } })
//         return
//       } catch (err) {
//         ctx.body = errorJSON({ message: `${err}` })
//         return
//       }
//     }
//   }
//   ctx.body = errorJSON({ message: `上传失败, 文件为空` })
// }
