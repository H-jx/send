import style from './style.module.less'
import { useNavigate } from 'react-router-dom'
import Bar from '@/client/components/bar'

export const Header = () => {
  const navigator = useNavigate()
  return (
    <Bar>
      <div className={style.ffHeaderContainer}>
        <div
          onClick={() => {
            navigator('../')
          }}
          className={style.ffHeaderTitle}
        >
          <h1 className={style.ffHeaderTitle}>SEND</h1>
        </div>
        <div className={style.ffHeaderHelp}></div>
      </div>
    </Bar>
  )
}
