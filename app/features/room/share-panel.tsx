import { useEffect, useState } from 'react'
import { toast } from '@heroui/react'
import { Copy } from 'lucide-react'
import { toDataURL } from 'qrcode'
import { copyText } from '@/app/lib/clipboard'

/** 原版分享卡：24px 标题 + 300px 二维码 + 链接/房间号复制行 */
export function SharePanel(props: { roomId: string }) {
  const roomUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/room/${props.roomId}`
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (roomUrl) {
      toDataURL(roomUrl, { width: 300 })
        .then((url) => alive && setQr(url))
        .catch(() => undefined)
    }
    return () => {
      alive = false
    }
  }, [roomUrl])

  return (
    <>
      <h3>分享</h3>
      {qr ? <img className="qr" src={qr} alt="房间二维码" /> : <div className="qr" style={{ background: '#f0f0f0' }} />}
      <div className="scan">手机扫码进房</div>
      <CopyRow title="链接" data={roomUrl} />
      <CopyRow title="房间号" data={props.roomId} />
    </>
  )
}

function CopyRow(props: { title: string; data: string }) {
  const doCopy = async () => {
    try {
      await copyText(props.data)
      toast.success(`${props.title}已复制`)
    } catch (e) {
      toast.danger((e as Error).message)
    }
  }
  return (
    <div className="copy-row">
      <div className="lab">{props.title}</div>
      <div className="line">
        <input
          readOnly
          value={props.data}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={props.title}
        />
        <button type="button" className="copy-ico" aria-label={`复制${props.title}`} onClick={doCopy}>
          <Copy size={16} />
        </button>
      </div>
    </div>
  )
}
