import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { rpc } from '../../utils/fetch'
export function Data() {
  const [users, setUsers] = useState<string[]>([])
  const [rooms, setRooms] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: rooms } = await rpc.Statistics.getCurrentRoomts()
    if (rooms) {
      setRooms(rooms)
    }
    const { data: users } = await rpc.Statistics.getUserList()
    if (users) {
      setUsers(users)
    }
  }
  return (
    <div>
      <div>
        rooms
        <ul>
          {rooms.map((id: string) => {
            return (
              <li key={id}>
                <Link to={`/room?roomId=${id}`}>{id}</Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
