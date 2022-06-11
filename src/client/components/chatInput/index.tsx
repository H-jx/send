import style from './index.module.less'
import { AddCircleOutline } from 'antd-mobile-icons'
import { useRef, useState, FC, useEffect } from 'react'
import { Button, Dialog, Image } from 'antd-mobile'

interface SendType {
  text: string
  file: File
}

export type onSendChangeType = (type: keyof SendType, value: SendType[keyof SendType]) => void

export const ChatInput: FC<{ onSendChange: onSendChangeType }> = (props) => {
  const fileUploadRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [showSend, setSend] = useState(false)

  useEffect(() => {
    const keyHandle = (e: KeyboardEvent) => {
      if (e.keyCode === 13) {
        send()
      }
    }
    window.addEventListener('keyup', keyHandle)
    document.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keyup', keyHandle)
      document.removeEventListener('paste', handlePaste)
    }
  }, [])

  const textInputOnChange = () => {
    setSend(Boolean(textRef.current?.value.length))
  }
  const triggerUpload = () => {
    fileUploadRef.current?.click()
  }
  const fileInputOnchange = () => {
    if (!fileUploadRef.current) return
    const file = fileUploadRef.current.files?.[0]
    console.log(fileUploadRef.current.files)
    if (file == null) return
    props.onSendChange('file', file)
    fileUploadRef.current!.value = ''
  }
  const send = () => {
    if (textRef.current == null) return
    if (textRef.current.value === '') return
    props.onSendChange('text', textRef.current.value)
    textRef.current.value = ''
  }

  const handlePaste = (event: ClipboardEvent) => {
    if (!event.clipboardData || !event.clipboardData.items) {
      return
    }
    const clipboardData = event.clipboardData

    for (let i = 0; i < clipboardData.items.length; i++) {
      if (clipboardData.items[i].type.indexOf('image') !== -1) {
        const blob = clipboardData.items[i].getAsFile()
        if (blob) {
          handleSendConfirm(blob)
        }
      }
    }
  }
  const handleSendConfirm = async (blob: File) => {
    const fileUrl = URL.createObjectURL(blob)

    Dialog.confirm({
      content: <Image fit="contain" src={fileUrl} />,
    }).then((bool) => {
      if (bool) {
        props.onSendChange('file', blob)
      }
    })
  }
  return (
    <div className={style.chatInput}>
      <textarea onChange={textInputOnChange} ref={textRef} className={style.chatInputText} />
      <span className={style.chatInputPlus}>
        <AddCircleOutline onClick={triggerUpload} />
      </span>
      <input onChange={fileInputOnchange} ref={fileUploadRef} className={style.chatInputUpload} type="file" />
      {showSend && (
        <Button onClick={send} style={{ whiteSpace: 'nowrap' }} color="primary">
          发送
        </Button>
      )}
    </div>
  )
}
