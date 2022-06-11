import { FC } from 'react'
import style from './index.module.less'

export const ChatNav: FC<{ id: string }> = (props) => {
  return (
    <>
      <div className={style.ffNavId}>
        <code style={{ color: '#999' }}>房间号: </code>
        <code>{props.id}</code>
      </div>
    </>
  )
}
