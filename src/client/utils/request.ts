export type UploadRequestMethod = 'POST' | 'PUT' | 'PATCH' | 'post' | 'put' | 'patch'

export interface UploadProgressEvent extends ProgressEvent<EventTarget> {
  percent?: number
}
export interface UploadRequestError extends Error {
  status?: number
  method?: UploadRequestMethod
  url?: string
}
export interface UploadRequestOption<T = any> {
  url: string
  method: UploadRequestMethod
  body?: Document | XMLHttpRequestBodyInit | null | undefined
  withCredentials?: boolean
  onProgress?: (ev: UploadProgressEvent) => any
  onSuccess?: (body: T, xhr?: XMLHttpRequest) => void
  onError?: (event: UploadRequestError | ProgressEvent, body?: T) => void
}

function getBody(xhr: XMLHttpRequest) {
  const text = xhr.responseText || xhr.response
  if (!text) {
    return text
  }

  try {
    return JSON.parse(text)
  } catch (e) {
    return text
  }
}

function getError(option: UploadRequestOption, xhr: XMLHttpRequest) {
  const msg = `cannot ${option.method} ${option.url} ${xhr.status}'`
  const err = new Error(msg) as UploadRequestError
  err.status = xhr.status
  err.method = option.method
  err.url = option.url
  return err
}

export const request = (option: UploadRequestOption) => {
  const xhr = new XMLHttpRequest()

  xhr.open(option.method, option.url, true)

  function progress(e: UploadProgressEvent) {
    if (e.total > 0) {
      e.percent = Math.ceil((e.loaded / e.total) * 100)
    }
    option.onProgress!(e)
  }
  if (option.onProgress && xhr.upload) {
    xhr.upload.addEventListener('progress', progress, false)
  }
  xhr.onerror = function error(e) {
    if (option.onError) {
      option.onError(e)
    }
  }

  xhr.onload = function onload() {
    xhr.upload.removeEventListener('progress', progress)
    if (xhr.status < 200 || xhr.status >= 300) {
      if (option.onError) {
        return option.onError(getError(option, xhr), getBody(xhr))
      }
    }
    if (option.onSuccess) {
      return option.onSuccess(getBody(xhr), xhr)
    }
  }
  xhr.withCredentials = Boolean(option.withCredentials)
  xhr.send(option.body)
  return {
    abort() {
      xhr.abort()
    },
  }
}
