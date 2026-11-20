import { useEffect, useRef, useState } from 'react'
import { toast } from '@heroui/react'
import type { Message } from '@/shared/message'
import { copyMessage } from '@/app/lib/clipboard'
import { ChatInput } from './chat-input'
import { ChatNav } from './chat-nav'
import { DragCover } from './drag-cover'
import { MessageBubble } from './message-bubble'
import { MessageContent } from './message-content'
import { SharePanel } from './share-panel'
import { useRoomSocket } from './use-room-socket'

/** 空态插画（像素方块 + 气泡，原型同款） */
function EmptyState() {
  return (
    <div className="empty">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <path d="M6 12h26v18H20l-8 7v-7H6z" fill="#fff" stroke="#b8c6d4" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="26" y="6" width="22" height="12" fill="#7fbf5f" />
        <rect x="26" y="18" width="22" height="12" fill="#b2875a" />
        <rect x="30" y="22" width="4" height="4" fill="#9a7148" />
        <rect x="40" y="24" width="4" height="4" fill="#9a7148" />
        <circle cx="14" cy="21" r="1.8" fill="#8fa3bd" />
        <circle cx="20" cy="21" r="1.8" fill="#8fa3bd" />
      </svg>
      暂无分享
    </div>
  )
}

/**
 * 房间页主体（原版双卡）：700×600 消息卡 + 300×600 分享卡；
 * ≤920px 单栏全宽 + 分享收进底部弹层。
 */
export function RoomPage(props: { roomId: string }) {
  const socket = useRoomSocket(props.roomId)
  const msgsRef = useRef<HTMLUListElement>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const doCopy = async (msg: Message) => {
    try {
      await copyMessage(msg.type, msg.type === 'file' ? msg.url : msg.text, msg.file?.name ?? '')
      toast.success('复制成功')
    } catch (e) {
      toast.danger(`剪切板复制失败 ${(e as Error).message}`)
    }
  }

  // 新消息滚动到底部
  useEffect(() => {
    const el = msgsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [socket.messages.length])

  return (
    <div className="room">
      <div className="room-cols">
        <DragCover onDropFile={socket.sendFile} onDropImageUrl={socket.sendImageUrl}>
          <ChatNav
            roomId={props.roomId}
            status={socket.status}
            peerCount={socket.peerCount}
            onOpenShare={() => setShareOpen(true)}
          />
          <ul className="msgs" ref={msgsRef}>
            {socket.messages.length === 0 && (
              socket.status === 'connected' ? (
                <EmptyState />
              ) : (
                <p className="empty">{socket.status === 'connecting' ? 'connecting…' : '连接已断开，正在等待重连…'}</p>
              )
            )}
            {socket.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} onRetry={socket.retry} onCopy={() => doCopy(m)}>
                <MessageContent
                  type={m.type}
                  text={m.text}
                  url={m.url}
                  fileName={m.file?.name}
                  fileSize={m.file?.size}
                  resolved={(m.status ?? 'resolved') === 'resolved'}
                />
              </MessageBubble>
            ))}
          </ul>
          {socket.status === 'disconnect' && (
            <div className="disconnect-bar">实时连接已断开，消息暂不可发送</div>
          )}
          <ChatInput
            onSendText={socket.sendText}
            onSendFiles={(files) => files.forEach((f) => socket.sendFile(f))}
          />
        </DragCover>

        <aside className="share">
          <SharePanel roomId={props.roomId} />
        </aside>
      </div>

      {/* 移动端分享弹层（原版无入口，新版补位，见 DESIGN.md §0；自研 sheet，原型同款） */}
      {shareOpen && (
        <div className="sheet-mask" onClick={(e) => e.target === e.currentTarget && setShareOpen(false)}>
          <div className="sheet">
            <button type="button" className="close" aria-label="关闭" onClick={() => setShareOpen(false)}>
              ×
            </button>
            <h3>分享房间</h3>
            <SharePanel roomId={props.roomId} />
          </div>
        </div>
      )}
    </div>
  )
}
