import { Button, Toast } from 'antd-mobile'
import { useRef, useState } from 'react'
import { Dialog, Input } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { InputRef } from 'antd-mobile/es/components/input'
import classNames from 'classnames'
import style from './style.module.less'
import { rpc } from '../../utils/fetch'

function isMobile() {
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i)
  ) {
    return true
  }
  return false
}

export const Body = () => {
  const navigator = useNavigate()
  const inputRef = useRef<InputRef>(null)
  const [inputCodeModel, setInputCodeModel] = useState(false)
  const [code, setCode] = useState('')

  const joinRoom = async () => {
    try {
      const res = await rpc.Room.join()
      navigator(`./room?roomId=${res.data?.roomId}`)
    } catch {
      console.warn('接口错误')
    }
  }
  const handleCodeInputChange = (value: string) => {
    setCode(value)
    if (value.length >= 4) {
      // 避免太快导致还未看清最后一位输入的是什么
      setTimeout(() => {
        navigator(`./room?roomId=${value}`)
        setCode('')
      }, 200)
    }
  }
  const handleInputCode = () => {
    setInputCodeModel(true)
    inputRef.current?.focus()
  }
  const handleInputClear = () => {
    setInputCodeModel(false)
    setCode('')
  }
  const roomIdOnBlur = () => {
    handleInputClear()
  }

  return (
    <div className={style.entryBody}>
      <div className={style.entryBodyLeft}>
        <Button className={style.button} onClick={joinRoom} size="large" block shape="rounded" color="primary">
          创建房间
        </Button>
        <br />

        <div
          className={classNames(style.receiveBox, {
            [style.codeModel]: inputCodeModel,
          })}
        >
          <Button className={style.button} size="large" block shape="rounded" color="default" onClick={handleInputCode}>
            进入房间
          </Button>
          <Input
            className={style.receiveInput}
            clearable
            ref={inputRef}
            onClear={handleInputClear}
            onChange={handleCodeInputChange}
            placeholder="请输入4位房间号"
            onBlur={roomIdOnBlur}
            value={code}
          ></Input>
        </div>
      </div>
      <div className={style.entryBodyRight}>
        {!isMobile() && (
          <video
            className={style.video}
            src="//activity.hdslb.com/blackboard/static/1d5c9c63ddd602617ed9a6ec73bebe8f/example.mp4"
            autoPlay
            loop
            muted
            poster="//activity.hdslb.com/blackboard/static/1d5c9c63ddd602617ed9a6ec73bebe8f/%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_20220315122914.png"
          ></video>
        )}
      </div>
    </div>
  )
}
