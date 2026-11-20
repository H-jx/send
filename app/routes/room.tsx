import { Navigate, useSearchParams } from 'react-router'

/** 旧链接兼容：/room?roomId=xxxx → /room/xxxx（二维码/历史分享仍可用） */
export default function RoomLegacyRoute() {
  const [params] = useSearchParams()
  const roomId = params.get('roomId')
  if (!roomId) return <Navigate to="/" replace />
  return <Navigate to={`/room/${roomId}`} replace />
}
