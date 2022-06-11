import style from './style.module.less'
import { QRCode } from '../../components/qrcode'
import { CopyInput } from '../../components/copyInput'
import { FC } from 'react'

export const Shared: FC<{ roomId: string }> = (props) => {
  return (
    <div className={style.sharedContainer}>
      <span className={style.sharedText}>分享</span>
      <QRCode qrcode={location.href} />
      <CopyInput className={style.copyInput} title="链接" data={location.href} />
      <CopyInput className={style.copyInput} title="房间号" data={props.roomId} />
    </div>
  )
}
