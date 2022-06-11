import { FC } from 'react'
import style from './index.module.less'
import { TextOutline } from 'antd-mobile-icons'
import { fallbackCopyTextToClipboard } from 'src/client/utils/copy'

export const CopyInput: FC<{ title: string; data: string; className: string }> = (props) => {
  const copy = () => {
    fallbackCopyTextToClipboard(props.data)
  }
  return (
    <div className={props.className}>
      <div className={style.ffInputText}>{props.title}</div>
      <div>
        <input readOnly className={style.ffInput} value={props.data} />
        <span className={style.ffInputCopy} onClick={copy}>
          <TextOutline fontSize={30} />
        </span>
      </div>
    </div>
  )
}
