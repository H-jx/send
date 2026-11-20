/** 复制三策略（对齐旧 msgType/copy.ts + utils/copy.ts） */
import { isImageFile } from './format'

/** http 页 / 不支持异步剪切板时的降级复制 */
function legacyCopyText(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

async function writeText(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      /* fallthrough */
    }
  }
  if (!legacyCopyText(text)) throw new Error('当前浏览器不支持复制')
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

async function writeImage(url: string): Promise<void> {
  const img = await loadImage(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')?.drawImage(img, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('图片转换失败')
  if (!window.isSecureContext || !navigator.clipboard?.write) {
    throw new Error('非 https 环境不支持图片复制到剪贴板')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** 文本/链接复制 */
export async function copyText(text: string): Promise<void> {
  await writeText(text)
}

/** 消息复制：图片→剪贴板图片（https），其他文件→链接，文本→文本 */
export async function copyMessage(
  type: 'text' | 'file',
  source: string | undefined,
  fileName: string = '',
): Promise<void> {
  if (!source) return
  if (type === 'file') {
    if (isImageFile(fileName) && window.isSecureContext) {
      await writeImage(source)
      return
    }
    await writeText(source)
    return
  }
  await writeText(source)
}
