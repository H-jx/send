import type { ConnectionStatus } from './types'

/** 原版导航条：40px 居中房间号 + 右侧在线 chip + 移动端左侧分享入口 */
export function ChatNav(props: {
  roomId: string
  status: ConnectionStatus
  peerCount: number
  onOpenShare: () => void
}) {
  const peerText =
    props.status === 'connected'
      ? `${props.peerCount} 端在线`
      : props.status === 'connecting'
        ? '连接中…'
        : '已断开'
  return (
    <div className="nav">
      <button type="button" className="share-open" onClick={props.onOpenShare}>
        分享
      </button>
      <span className="id">房间号:</span>
      {props.roomId}
      <span className="peer">{peerText}</span>
    </div>
  )
}
