import { Header } from './header'
import { Footer } from './footer'
import style from './style.module.less'
import { FC } from 'react'

export const HomeLayout: FC = (props) => {
  const Child = props.children
  return (
    <div className={style.ffEntry}>
      <Header />
      {Child}
      <Footer />
    </div>
  )
}
