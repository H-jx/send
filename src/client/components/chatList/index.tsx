import style from './index.module.less'
import { FC, useRef, useEffect, useLayoutEffect, Children } from 'react'

export const ChatList: FC = (props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isBottom = useRef(true)

  useLayoutEffect(() => {
    const onscroll = () => {
      if (scrollRef.current == null) return
      const { clientHeight, scrollTop, scrollHeight } = scrollRef.current
      isBottom.current = clientHeight + scrollTop === scrollHeight
    }

    scrollRef.current?.addEventListener('scroll', onscroll)
    return () => {
      scrollRef.current?.removeEventListener('scroll', onscroll)
    }
  }, [])
  useLayoutEffect(() => {
    if (isBottom.current && scrollRef.current != null) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight)
    }
  }, [Children.count(props.children)])
  return (
    <>
      <div ref={scrollRef} className={style.chatListContainer}>
        <div className={style.chatListMessages}>{props.children}</div>
      </div>
    </>
  )
}
