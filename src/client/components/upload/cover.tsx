import React, { useRef, useState, FC, useEffect } from 'react'
import classnames from 'classnames'
import { Toast } from 'antd-mobile'
import style from './index.module.less'

interface Props {
  className?: string
  onChange: (fileOrText: File | string) => void
}
interface CustomDragEvent extends DragEvent {
  fromElement: HTMLElement
  toElement: HTMLElement
  relatedTarget: HTMLElement
}

/**
 * 拖拽上传
 */
const Cover: FC<Props> = (props) => {
  const [dragOver, setDragOver] = useState(false)
  const divRef = useRef<HTMLDivElement>(null)
  const handleDrop: React.DragEventHandler = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const items = e.dataTransfer.items

    if (!items || !items[0]) {
      throw Error('不支持拖拽上传')
    }
    if (!items[0].webkitGetAsEntry) {
      Toast.show({
        icon: 'failed',
        content: '不支持文件夹拖拽上传',
      })
      return
    }
    // const list: any = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry()

      if (!entry) {
        return
      }

      if (entry.isFile) {
        props.onChange(items[i].getAsFile() as File)
      } else if (items[i].type === 'text/plain') {
        items[i].getAsString((url) => {
          props.onChange(url)
        })
      } else if (entry.isDirectory) {
        // 文件夹
        Toast.show({
          icon: 'failed',
          content: '不支持文件夹拖拽上传',
        })
      }
    }
  }
  const handleDragover: React.DragEventHandler = (e) => {
    e.preventDefault()
    if (!dragOver) {
      setDragOver(true)
    }
  }
  /**
   *
   * @param {SyntheticDragEvent} e
   */
  const handleDragleave = (e: React.SyntheticEvent<HTMLDivElement>) => {
    e.preventDefault()
    const nativeEvent = e.nativeEvent as CustomDragEvent
    const toEl = nativeEvent.fromElement || nativeEvent.relatedTarget
    if (divRef.current && divRef.current.contains(toEl)) {
      return
    }
    setDragOver(false)
  }
  return (
    <div
      className={classnames(style.cover, props.className, {
        [style.dragover]: dragOver,
      })}
      onDrop={handleDrop}
      onDragOver={handleDragover}
      onDragLeave={handleDragleave}
      ref={divRef}
    >
      {props.children}
      <div
        className={classnames(style.coverTip, {
          hide: !dragOver,
        })}
      >
        <p className={style.coverTipText}>可以松开了哦</p>
      </div>
    </div>
  )
}
export default Cover
