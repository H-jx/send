import * as fs from 'fs'
import { sep } from 'path'
import { Stream } from 'stream'
import { promisify } from 'util'

const accessPromisify = promisify(fs.access)
const mkdirPromisify = promisify(fs.mkdir)

const dirExistMap: Record<string, boolean> = {}
/**
 * 创建文件夹
 */
export async function mkdir(path: string): Promise<void> {
  if (dirExistMap[path]) {
    return
  }
  try {
    await accessPromisify(path)
    dirExistMap[path] = true
  } catch (error) {
    try {
      await mkdirPromisify(path)
    } catch (error) {
      const paths = path.split(sep)
      const targetPath = paths.join(sep)
      paths.pop()
      const subPath = paths.join(sep)
      // try maker sub path
      await mkdir(subPath)
      await mkdir(targetPath)
    }
  }
}

export async function stream2buffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>()

    stream.on('data', (chunk) => _buf.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(_buf)))
    stream.on('error', (err) => reject(`error converting stream - ${err}`))
  })
}

/**
 * 获取文件后缀
 * @param name
 */
export function getFileExt(name: string) {
  const ext = name.split('.')
  return ext[ext.length - 1]
}
