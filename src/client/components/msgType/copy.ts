import { Toast } from 'antd-mobile'
import ClipboardJS from 'clipboard'

export const imgType = ['apng', 'avif', 'gif', 'jpeg', 'webp', 'png', 'svg', 'jpg']
export const copy = (type: 'file' | 'text', source = '', fileName = '') => {
  try {
    if (type === 'file') {
      const isImage = imgType.find((item) => {
        return fileName.endsWith(item) || fileName.endsWith(item.toUpperCase())
      })
      if (isImage) {
        loadImg(source)
          .then((blob) => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          })
          .catch((err) => {
            Toast.show(`剪切板复制失败${err}`)
          })
      } else {
        navigator.clipboard.writeText(source)
      }
    } else {
      ClipboardJS.copy(source)
    }
    Toast.show('复制成功')
  } catch (err) {
    Toast.show(`剪切板复制失败${err}`)
  }
}

function loadImg(url: string): Promise<Blob> {
  const img = new Image()
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  return new Promise((resolve, reject) => {
    img.onload = () => {
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      ctx?.drawImage(img, 0, 0)
      img.crossOrigin = 'anonymous'
      console.warn('aaa')
      c.toBlob((blob) => {
        if (blob == null) {
          reject(new Error('图片加载失败'))
          return
        }
        resolve(blob)
      }, 'image/png')
    }
    img.onerror = (err) => {
      reject(err)
    }
    img.src = url
  })
}
