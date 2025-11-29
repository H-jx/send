import { FC, useRef } from 'react'
import { Image, ImageViewer } from 'antd-mobile'
import { FileIcon, defaultStyles } from 'react-file-icon'
import { fallbackCopyTextToClipboard } from '@/client/utils/copy'
import { Bubble } from '../../components/bubble'
import { CustomMessage } from '@/client/pages/room/useSocket'
import { getFileSize } from '@/client/utils/getFileSize'
import { getFileExt } from '@/client/utils/getFileExt'
import style from './style.module.less'
import { CopyInput } from '../copyInput'
import { copy } from './copy'

export interface Props {
  type: CustomMessage['type']
  text?: string
  url?: string
  file?: CustomMessage['file']
  time?: number
  status?: 'resolved' | 'rejected' | 'uploading'
  percent?: number
}
const imgType = ['apng', 'avif', 'gif', 'jpeg', 'webp', 'png', 'svg', 'jpg']
const svg = `
<svg t="1661407452650" fill="currentColor" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3149" width="16" height="16"><path d="M704 896v80c0 26.51-21.49 48-48 48H112c-26.51 0-48-21.49-48-48V240c0-26.51 21.49-48 48-48h144v592c0 61.758 50.242 112 112 112h336z m0-688V0H368c-26.51 0-48 21.49-48 48v736c0 26.51 21.49 48 48 48h544c26.51 0 48-21.49 48-48V256H752c-26.4 0-48-21.6-48-48z m241.942-62.058L814.058 14.058A48 48 0 0 0 780.118 0H768v192h192v-12.118a48 48 0 0 0-14.058-33.94z" p-id="3150"></path></svg>
`
export const MsgType: FC<Props> = (props) => {
  const renderFile = () => {
    const fileName = props.file?.name || ''
    const isImage =
      imgType.find((item) => {
        return fileName.endsWith(item) || fileName.endsWith(item.toUpperCase())
      }) && ['resolved', null, undefined].includes(props.status)
    const onClick = () => {
      ImageViewer.show({
        image: props.url,
      })
    }
    if (isImage) {
      return (
        <Image
          style={{ maxWidth: '350px', maxHeight: '400px' }}
          fit="contain"
          onClick={onClick}
          src={props.url ?? ''}
        />
      )
    }
    const ext = getFileExt(fileName)
    const iconStyle = ext in defaultStyles ? defaultStyles[ext as keyof typeof defaultStyles] : {}
    return (
      <a href={props.url} className={style.file} target={'_blank'} rel="noreferrer">
        <span className={style.fileName}>{props.file?.name}</span>
        <div className={style.fileSize}>{getFileSize(props.file?.size)}</div>
        <span className={style.fileIcon}>
          <FileIcon extension={ext} {...iconStyle} />
        </span>
      </a>
    )
  }
  const renderText = () => {
    const isLink = props?.text?.startsWith('http')
    return (
      <>
        {isLink ? (
          <a className={style.urlText} target={'_blank'} href={props.text} rel="noreferrer">
            {props.text}
          </a>
        ) : (
          <span>{props.text}</span>
        )}
      </>
    )
  }

  return (
    <Bubble type="right" status={props.status ?? 'resolved'} percent={props.percent} time={props.time}>
     {(props.status ?? 'resolved') === 'resolved' && (props.type === 'text' || location.protocol === 'https:') && (
        <span
          onClick={() => {
            copy(props.type, props.type === 'file' ? props.url : props.text, props.file?.name || '')
          }}
          className={style.copyBtn}
          dangerouslySetInnerHTML={{ __html: svg }}
        ></span>
      )}
      <div>{props.type === 'file' ? renderFile() : renderText()}</div>
    </Bubble>
  )
}
