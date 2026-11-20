/**
 * 房间实时状态机（refactor/04、05 §5）：
 *  - socket 事件与 payload 类型全部来自 shared/events（协议边界，WebRTC 后续在此扩展）
 *  - 握手 query {roomId, username}；room:joined 先历史、msg:receive 增量
 *  - 乐观上屏 + ack 决定发送状态；重连历史与乐观消息按 id 合并
 *  - 文件：sign(Orval) → XHR PUT 直传 MinIO → 成功才 msg:send（验收）
 */
import { io, type Socket } from 'socket.io-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SOCKET_EVENTS, type SendAck, type SocketClientToServer, type SocketServerToClient } from '@/shared/events'
import type { Message } from '@/shared/message'
import { signUpload } from '@/app/api'
import { putUpload } from '@/app/lib/upload-put'
import { getUsername } from '@/app/lib/username'
import type { ConnectionStatus, UiMessage } from './types'
import { mergeHistory } from './merge'

type ClientSocket = Socket<SocketServerToClient, SocketClientToServer>

function stripUi(msg: UiMessage): Message {
  const { status: _s, percent: _p, error: _e, ...rest } = msg
  return rest
}

export interface RoomSocketApi {
  status: ConnectionStatus
  peerCount: number
  messages: UiMessage[]
  sendText: (text: string) => void
  sendFile: (file: File) => void
  /** 拖拽图片 URL：直接以「已完成」的文件消息发送 */
  sendImageUrl: (url: string) => void
  retry: (id: string) => void
}

export function useRoomSocket(roomId: string): RoomSocketApi {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [peerCount, setPeerCount] = useState(0)
  const socketRef = useRef<ClientSocket | null>(null)
  const filesRef = useRef(new Map<string, File>())
  const messagesRef = useRef<UiMessage[]>([])
  messagesRef.current = messages

  useEffect(() => {
    if (!roomId) return
    setStatus('connecting')
    const socket = io({
      path: '/socket.io',
      transports: ['websocket'],
      query: { roomId, username: getUsername() },
    }) as ClientSocket
    socketRef.current = socket

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (history) => {
      setMessages((prev) => mergeHistory(history, prev))
      setStatus('connected')
    })
    socket.on('connect', () => setStatus('connected'))
    socket.on('disconnect', () => setStatus('disconnect'))
    socket.on('connect_error', () => setStatus('connecting'))
    socket.on(SOCKET_EVENTS.MSG_RECEIVE, (msg) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id)
          ? prev.map((m) => (m.id === msg.id ? { ...m, ...msg, status: 'resolved' } : m))
          : [...prev, { ...msg, status: 'resolved' }],
      )
    })
    socket.on(SOCKET_EVENTS.ROOM_PEER, (info) => setPeerCount(info.count))

    return () => {
      socket.removeAllListeners()
      socket.close()
      socketRef.current = null
    }
  }, [roomId])

  const patch = useCallback((id: string, changes: Partial<UiMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))
  }, [])

  const publish = useCallback(
    (msg: UiMessage) => {
      const socket = socketRef.current
      if (!socket) {
        patch(msg.id, { status: 'rejected', error: '未连接' })
        return
      }
      socket.emit(SOCKET_EVENTS.MSG_SEND, stripUi(msg), (ack: SendAck) => {
        patch(msg.id, ack.success ? { status: 'resolved', error: undefined } : { status: 'rejected', error: ack.message })
      })
    },
    [patch],
  )

  const sendText = useCallback(
    (text: string) => {
      const msg: UiMessage = {
        id: crypto.randomUUID(),
        type: 'text',
        text,
        status: 'sending',
      }
      setMessages((prev) => [...prev, msg])
      publish(msg)
    },
    [publish],
  )

  const uploadFile = useCallback(
    async (id: string, file: File) => {
      const msg: UiMessage = {
        id,
        type: 'file',
        file: { name: file.name, size: file.size },
        status: 'uploading',
        percent: 0,
      }
      setMessages((prev) => [...prev, msg]) // 乐观上屏：签名前先显示上传中
      try {
        const sign = await signUpload({ roomId, fileName: file.name, size: file.size })
        msg.url = sign.downloadUrl
        patch(id, { url: sign.downloadUrl })
        putUpload(sign.uploadUrl, file, {
          onProgress: (percent) => patch(id, { percent }),
          onSuccess: () => {
            patch(id, { percent: 100, status: 'sending' })
            publish({ ...msg, percent: 100, status: 'sending' })
          },
          onError: (message) => {
            patch(id, { status: 'rejected', error: message })
            filesRef.current.set(id, file) // 供重试
          },
        })
      } catch (err) {
        patch(id, { status: 'rejected', error: (err as Error).message })
        filesRef.current.set(id, file)
      }
    },
    [patch, publish, roomId],
  )

  const sendFile = useCallback(
    (file: File) => {
      void uploadFile(crypto.randomUUID(), file)
    },
    [uploadFile],
  )

  const sendImageUrl = useCallback(
    (url: string) => {
      const ext = url.match(/(png|jpe?g|gif|webp|avif|svg)/i)?.[1] ?? 'png'
      const msg: UiMessage = {
        id: crypto.randomUUID(),
        type: 'file',
        url,
        file: { name: `image.${ext}`, size: 0 },
        status: 'sending',
        percent: 100,
      }
      setMessages((prev) => [...prev, msg])
      publish(msg)
    },
    [publish],
  )

  const retry = useCallback(
    (id: string) => {
      const target = messagesRef.current.find((m) => m.id === id)
      if (!target) return
      if (target.type === 'text' && target.text) {
        patch(id, { status: 'sending', error: undefined })
        publish({ ...target, status: 'sending', error: undefined })
        return
      }
      const file = filesRef.current.get(id)
      if (file) {
        filesRef.current.delete(id)
        setMessages((prev) => prev.filter((m) => m.id !== id))
        void uploadFile(id, file)
        return
      }
      if (target.type === 'file' && target.url) {
        patch(id, { status: 'sending', error: undefined })
        publish({ ...target, status: 'sending', error: undefined })
      }
    },
    [patch, publish, uploadFile],
  )

  return { status, peerCount, messages, sendText, sendFile, sendImageUrl, retry }
}
