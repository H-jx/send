import { useEffect } from 'react'

/** 原版 ImageViewer：全屏黑底大图预览 */
export function ImagePreview(props: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.onClose])

  return (
    <div
      className="viewer"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <button type="button" className="x" aria-label="关闭预览" onClick={props.onClose}>
        ×
      </button>
      <img src={props.src} alt={props.alt} />
    </div>
  )
}
