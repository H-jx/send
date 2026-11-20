import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { toast } from '@heroui/react'

/**
 * 原版消息卡容器（.list）：拖拽文件直传、拖图片 URL 直发、文件夹拒绝、灰罩虚线提示。
 */
export function DragCover(props: {
  onDropFile: (file: File) => void
  onDropImageUrl: (url: string) => void
  children: ReactNode
}) {
  const [dragOver, setDragOver] = useState(false)
  const ref = useRef<HTMLElement>(null)

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const items = e.dataTransfer.items
    if (!items || !items[0]) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const entry = item.webkitGetAsEntry?.()
      if (item.kind === 'file') {
        if (entry?.isDirectory) {
          toast.warning('不支持文件夹拖拽上传')
          continue
        }
        const file = item.getAsFile()
        if (file) props.onDropFile(file)
      } else if (item.type === 'text/plain') {
        item.getAsString((text) => {
          if (/http.*(png|jpe?g|gif|webp|avif|svg)/i.test(text)) props.onDropImageUrl(text)
          else toast.info('拖入的文本不是图片链接')
        })
      }
    }
  }

  return (
    <section
      ref={ref}
      className={`list${dragOver ? ' dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={(e) => {
        const to = e.relatedTarget as Node | null
        if (ref.current && to && ref.current.contains(to)) return
        setDragOver(false)
      }}
    >
      {props.children}
      <div className="drag-tip">
        <b>可以松开了哦</b>
      </div>
    </section>
  )
}
