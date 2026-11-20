/** XHR PUT 直传（保留原因：fetch 无上传进度事件），迁移自旧 utils/request.ts */
export interface PutUploadHandlers {
  onProgress?: (percent: number) => void
  onSuccess?: () => void
  onError?: (message: string) => void
}

export function putUpload(url: string, file: File | Blob, handlers: PutUploadHandlers) {
  const xhr = new XMLHttpRequest()
  xhr.open('PUT', url, true)
  xhr.upload.onprogress = (e) => {
    if (e.total > 0) handlers.onProgress?.(Math.ceil((e.loaded / e.total) * 100))
  }
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) handlers.onSuccess?.()
    else handlers.onError?.(`上传失败 HTTP ${xhr.status}`)
  }
  xhr.onerror = () => handlers.onError?.('上传失败：网络错误')
  xhr.ontimeout = () => handlers.onError?.('上传超时')
  xhr.send(file)
  return () => xhr.abort()
}
