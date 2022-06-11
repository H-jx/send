import React from 'react'
import style from './style.module.less'
interface Props {
  blur?: boolean
}
const Bar: React.FC<Props> = (props) => {
  const { blur, children } = props

  return (
    <div className={style.bar}>
      <div className={style.blur}></div>
      <div className={style.container}>{children}</div>
    </div>
  )
}
export default Bar
