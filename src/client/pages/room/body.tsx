import { Shared } from './shared'
import { List } from './list'
import style from './style.module.less'
import { FC } from 'react'

export const Body: FC<{ roomId: string }> = (props) => {
  const roomId = props.roomId
  return (
    <div className={style.bodyContainer}>
      <List roomId={roomId} />
      <Shared roomId={roomId} />
    </div>
  )
}
