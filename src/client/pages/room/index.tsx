import { HomeLayout } from '../../layout/homeLayout/'
import { Body } from './body'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { rpc } from '../../utils/fetch'
import { Toast } from 'antd-mobile'

export const Room = () => {
  const { search } = useLocation()
  const navigator = useNavigate()
  const query = new URLSearchParams(search)
  const roomId = query.get('roomId') ?? ''
  useEffect(() => {
    ;(async () => {
      if (roomId == '') {
        navigator('../')
      }
      try {
        const res = await rpc.Room.join(roomId)
        if (!res || res.status !== 'ok') {
          navigator('../')
          Toast.show({ content: res.message })
        }
      } catch (err) {
        console.error(err)
        navigator('../')
        Toast.show({ content: '网络开小差了！' })
      }
    })()
  }, [])

  return (
    <HomeLayout>
      <Body roomId={roomId} />
    </HomeLayout>
  )
}
