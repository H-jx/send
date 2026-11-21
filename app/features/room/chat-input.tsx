import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

/**
 * 输入条（原版 60px 白条贴底）：文本 + 多文件 + 粘贴图片确认。
 * IME：组合期间 Enter 只确认候选词不发送。
 */
export function ChatInput(props: {
  onSendText: (text: string) => void
  onSendFiles: (files: File[]) => void
}) {
  const [text, setText] = useState('')
  const composingRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteUrl, setPasteUrl] = useState<string | null>(null)
  const pasteFileRef = useRef<File | null>(null)

  const send = () => {
    const value = text.trim()
    if (!value) return
    props.onSendText(value)
    setText('')
  }

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.includes('image')) {
          const blob = items[i].getAsFile()
          if (blob) {
            pasteFileRef.current = blob
            setPasteUrl(URL.createObjectURL(blob))
            setPasteOpen(true)
          }
          return
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  const confirmPaste = () => {
    if (pasteFileRef.current) props.onSendFiles([pasteFileRef.current])
    setPasteOpen(false)
    if (pasteUrl) URL.revokeObjectURL(pasteUrl)
    setPasteUrl(null)
  }

  const onFiles = () => {
    const files = fileRef.current?.files
    if (!files?.length) return
    props.onSendFiles(Array.from(files))
    fileRef.current!.value = ''
  }

  return (
    <>
      <div className="inputbar">
        <textarea
          className="chat-text"
          rows={1}
          value={text}
          aria-label="消息输入"
          title="Enter 发送 / Shift+Enter 换行"
          placeholder="输入内容…"
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey) return
            if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return
            e.preventDefault()
            send()
          }}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
          }}
        />
        <button type="button" className="plus" aria-label="选择文件" title="上传文件" onClick={() => fileRef.current?.click()}>
          <Plus size={22} strokeWidth={2.5} />
        </button>
        <input ref={fileRef} type="file" accept="*" multiple className="hidden" onChange={onFiles} />
        {text.trim().length > 0 && (
          <button type="button" className="send-btn show" onClick={send}>
            发送
          </button>
        )}
      </div>

      {pasteOpen && (
        <div className="dialog-mask" onClick={(e) => e.target === e.currentTarget && setPasteOpen(false)}>
          <div className="dialog-card">
            <div className="title">发送这张图片？</div>
            {pasteUrl && <img src={pasteUrl} alt="粘贴的图片" />}
            <div className="dialog-actions">
              <button type="button" className="pill pill-default" onClick={() => setPasteOpen(false)}>
                取消
              </button>
              <button type="button" className="pill pill-primary" onClick={confirmPaste}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
