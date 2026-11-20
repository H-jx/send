import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from '@heroui/react'
import { getStatisticsRooms, getStatisticsUsers, ApiError } from '@/app/api'

/** 数据页：原版无样式参照，按同一卡片语言轻设计（DESIGN.md §3.3） */
export default function DataPage() {
  const [rooms, setRooms] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])

  useEffect(() => {
    Promise.all([getStatisticsRooms(), getStatisticsUsers()])
      .then(([r, u]) => {
        setRooms(r.rooms)
        setUsers(u.users)
      })
      .catch((e: unknown) => toast.danger(e instanceof ApiError ? e.message : '加载失败'))
  }, [])

  return (
    <div className="data">
      <div className="card">
        <h3>房间（{rooms.length}）</h3>
        <div className="chips">
          {rooms.map((id) => (
            <Link key={id} className="chip" to={`/room/${id}`}>
              {id}
            </Link>
          ))}
          {rooms.length === 0 && <span className="chip">暂无活跃房间</span>}
        </div>
      </div>
      <div className="card">
        <h3>用户（{users.length}）</h3>
        <div className="chips">
          {users.map((name) => (
            <span key={name} className="chip">
              {name}
            </span>
          ))}
          {users.length === 0 && <span className="chip">暂无记录</span>}
        </div>
      </div>
    </div>
  )
}
