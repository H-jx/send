import style from './index.module.less'
import { FC, useMemo } from 'react'
import { CloseOutline } from 'antd-mobile-icons'
import { ProgressCircle } from 'antd-mobile'

export interface BubbleProps {
  type: 'left' | 'right'
  status: 'resolved' | 'rejected' | 'uploading'
  percent?: number
  time?: number
}
export const Bubble: FC<BubbleProps> = (props) => {
  const Child = props.children
  const containerClass = [style.bubbleContainer]
  if (props.type === 'left') {
    containerClass.push(style.bubbleContainerLeft)
  } else {
    containerClass.push(style.bubbleContainerRight)
  }

  const renderProgress = useMemo(() => {
    if (props.status == 'resolved') return
    if (props.status === 'uploading') {
      return (
        <ProgressCircle style={{ '--size': '32px' }} percent={props.percent}>
          {props.percent}%
        </ProgressCircle>
      )
    }
    if (props.status === 'rejected') {
      return (
        <ProgressCircle style={{ '--size': '32px' }} percent={props.percent}>
          <CloseOutline />
        </ProgressCircle>
      )
    }
  }, [props.status, props.percent])
  const date = props.time != null ? new Date(props.time) : new Date()
  return (
    <>
      <div className={style.messageTime}>{`${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日${date.getHours()}:${date.getMinutes()}`}</div>
      <div className={containerClass.join(' ')}>
        <div className={style.bubble}>{Child}</div>
        <div style={{ float: 'right' }}>{renderProgress}</div>
      </div>
    </>
  )
}
