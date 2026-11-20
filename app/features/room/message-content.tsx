import { useState } from 'react'
import { isImageFile, formatFileSize } from '@/app/lib/format'
import { ImagePreview } from './image-preview'

/** 像素文件图标（原型同款，替代 react-file-icon） */
function PixelFileIcon() {
  return (
    <svg viewBox="0 0 36 44" aria-hidden="true">
      <path d="M2 4a3 3 0 0 1 3-3h18l11 11v29a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#cfd8e3" />
      <path d="M23 1l11 11H26a3 3 0 0 1-3-3z" fill="#aebccf" />
      <rect x="9" y="24" width="18" height="4" rx="2" fill="#8fa3bd" />
      <rect x="9" y="31" width="12" height="4" rx="2" fill="#8fa3bd" />
    </svg>
  )
}

/** 消息内容（原版规格）：文本/链接、文件卡（黑字+右上图标）、图片（黑底大图预览） */
export function MessageContent(props: {
  type: 'text' | 'file'
  text?: string
  url?: string
  fileName?: string
  fileSize?: number
  resolved: boolean
}) {
  const [preview, setPreview] = useState(false)

  if (props.type === 'text') {
    const isLink = props.text?.startsWith('http')
    if (isLink) {
      return (
        <a href={props.text} target="_blank" rel="noreferrer">
          {props.text}
        </a>
      )
    }
    return <span>{props.text}</span>
  }

  const name = props.fileName ?? '文件'
  if (isImageFile(name) && props.url && props.resolved) {
    return (
      <>
        <button type="button" style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }} onClick={() => setPreview(true)}>
          <img className="img-in" src={props.url} alt={name} />
        </button>
        {preview && <ImagePreview src={props.url} alt={name} onClose={() => setPreview(false)} />}
      </>
    )
  }

  const body = (
    <>
      <span className="fname">{name}</span>
      {props.fileSize != null && <span className="fsize">{formatFileSize(props.fileSize)}</span>}
      <span className="ficon">
        <PixelFileIcon />
      </span>
    </>
  )
  if (!props.url || !props.resolved) return <span className="file">{body}</span>
  return (
    <a className="file" href={props.url} target="_blank" rel="noreferrer">
      {body}
    </a>
  )
}
