import { FC, useRef } from 'react'
import { Image, ImageViewer } from 'antd-mobile'
import { FileIcon, defaultStyles } from 'react-file-icon'
import { fallbackCopyTextToClipboard } from 'src/client/utils/copy'
import { Bubble } from '../../components/bubble'
import { CustomMessage } from 'src/client/pages/room/useSocket'
import { getFileSize } from 'src/client/utils/getFileSize'
import { getFileExt } from 'src/client/utils/getFileExt'
import style from './style.module.less'

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
      <div>{props.type === 'file' ? renderFile() : renderText()}</div>
    </Bubble>
  )
}
