import { FC, useRef, useEffect } from 'react'
import { toDataURL } from 'qrcode'
import style from './style.module.less'

export const QRCode: FC<{ qrcode: string }> = (props) => {
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    toDataURL(props.qrcode, {
      width: 300,
      height: 300,
    }).then((result: string) => {
      if (imgRef.current) imgRef.current.src = result
    })
  }, [])

  return (
    <>
      <div className={style.qrcodeTitle}>手机扫码</div>
      <img ref={imgRef} />
    </>
  )
}
