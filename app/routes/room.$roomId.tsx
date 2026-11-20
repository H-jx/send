import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Spinner, toast } from '@heroui/react'
import { checkRoom, ApiError } from '@/app/api'
import { roomIdSchema } from '@/shared/message'
import { RoomPage } from '@/app/features/room/room-page'

/**
 * 房间页：先校验房间（A2），404/非法 → 提示并回首页（对齐旧 Room 行为）；
 * 通过后建立 socket。深链直达/刷新均可用（SPA fallback）。
 */
export default function RoomRoute() {
  const { roomId = '' } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true })
      return
    }
    if (!roomIdSchema.safeParse(roomId).success) {
      toast.warning('房间号格式不正确')
      navigate('/', { replace: true })
      return
    }
    let alive = true
    checkRoom(roomId)
      .then(() => alive && setReady(true))
      .catch((err: unknown) => {
        if (!alive) return
        if (err instanceof ApiError && err.statusCode === 404) {
          toast.warning(err.message)
        } else {
          toast.warning(err instanceof ApiError ? err.message : '网络开小差了！')
        }
        navigate('/', { replace: true })
      })
    return () => {
      alive = false
    }
  }, [roomId, navigate])

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-neutral-400">
        <Spinner size="sm" />
        正在进入房间…
      </div>
    )
  }
  return <RoomPage key={roomId} roomId={roomId} />
}
