import type { ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { toast } from '@heroui/react'
import { formatMessageTime } from '@/app/lib/format'
import type { UiMessage } from './types'

/** 状态视觉配置表（DESIGN.md §4.4 表驱动，杜绝嵌套三元） */
const STATUS_UI = {
  uploading: { kind: 'ring' },
  sending: { kind: 'spin' },
  rejected: { kind: 'fail' },
  resolved: { kind: 'none' },
} satisfies Record<NonNullable<UiMessage['status']>, { kind: 'ring' | 'spin' | 'fail' | 'none' }>

function StatusNode(props: { msg: UiMessage; onRetry: (id: string) => void }) {
  const { msg } = props
  const kind = STATUS_UI[msg.status ?? 'resolved'].kind
  const c = 2 * Math.PI * 13
  if (kind === 'ring') {
    const percent = msg.percent ?? 0
    return (
      <svg className="status-ring" viewBox="0 0 32 32" aria-label={`上传进度 ${percent}%`}>
        <circle cx="16" cy="16" r="13" stroke="#d9d9d9" strokeWidth="3" fill="none" />
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="#1677ff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          transform="rotate(-90 16 16)"
        />
        <text x="16" y="19" fontSize="9" textAnchor="middle" fill="#666">
          {percent}
        </text>
      </svg>
    )
  }
  if (kind === 'spin') {
    return (
      <svg className="status-ring" viewBox="0 0 32 32" aria-label="发送中">
        <g className="ring-spin">
          <circle cx="16" cy="16" r="13" stroke="#d9d9d9" strokeWidth="3" fill="none" />
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="#1677ff"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * 0.25} ${c}`}
          />
        </g>
      </svg>
    )
  }
  if (kind === 'fail') {
    return (
      <>
        <button type="button" className="send-btn show" onClick={() => props.onRetry(msg.id)}>
          重发
        </button>
        <svg className="status-ring" viewBox="0 0 32 32" aria-label={msg.error ?? '发送失败'}>
          <circle cx="16" cy="16" r="13" stroke="#e5484d" strokeWidth="3" fill="none" />
          <path d="M11 11l10 10M21 11l-10 10" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </>
    )
  }
  return null
}

/** 原版气泡：时间行 + 右上尾白气泡 + 复制 chip（hover）+ 状态位 */
export function MessageBubble(props: {
  msg: UiMessage
  onRetry: (id: string) => void
  onCopy?: () => Promise<void>
  children: ReactNode
}) {
  const { msg } = props
  const resolved = (msg.status ?? 'resolved') === 'resolved'
  const doCopy = () => {
    const action = props.onCopy?.()
    if (action) action.catch((e: Error) => toast.danger(e.message))
  }
  return (
    <li className="msg">
      <div className="time">{formatMessageTime(msg.time)}</div>
      <div className="row">
        <div className="bubble">
          {props.children}
          {resolved && props.onCopy && (
            <button type="button" className="copy-chip" aria-label="复制" onClick={doCopy}>
              <Copy size={16} />
            </button>
          )}
        </div>
        <StatusNode msg={msg} onRetry={props.onRetry} />
      </div>
    </li>
  )
}
