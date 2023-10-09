import style from './style.module.less'
import { ChatNav } from '../../components/chatNav'
import { ChatList } from '../../components/chatList'
import { ChatInput, onSendChangeType } from '../../components/chatInput'
import { MsgType } from '../../components/msgType'
import { FC } from 'react'
import { v4 as uuid } from 'uuid'
import { BaseUrl } from '../../utils/fetch'
import { useSocket, CustomMessage, FileMessage } from './useSocket'
import { rpc } from '../../utils/fetch'
import { request } from '../../utils/request'
import { getFileMD5 } from 'src/client/utils/getFIleMD5'
import Cover from 'src/client/components/upload/cover'

export const List: FC<{ roomId: string }> = (props) => {
  const socket = useSocket(BaseUrl, props.roomId)
  const onSendChange: onSendChangeType = async (type, data) => {
    const message: CustomMessage = {
      id: uuid(),
      type: type,
    }
    if (type === 'text') {
      message.text = data as string
      socket.pushMessage(message)
      socket.sendMsg(message)
      return
    }
    const file = {
      name: (data as File).name,
      size: (data as File).size,
    }
    let uploadURL: string | undefined
    let downloadURL: string | undefined

    const fileMessage: FileMessage = {
      ...message,
      url: downloadURL,
      file,
      percent: 0,
      status: 'uploading' as const,
    }

    socket.pushMessage(fileMessage)
    try {
      let md5: string | undefined
      // > 1MB 才考虑秒传检测
      if (file.size > 1048576) {
        md5 = await getFileMD5(data as File)
      }
      const res = await rpc.Upload.getUploadAction({ fileName: file.name, roomid: props.roomId })
      uploadURL = res.data?.upload
      downloadURL = res.data?.download
      fileMessage.url = downloadURL
    } catch (error) {
      console.error(error)
    }
    if (!uploadURL) {
      // 没有uploadURL则表示已存在云端
      if (downloadURL) {
        socket.sendMsg(fileMessage)
        return
      }
      return
    }
    request({
      url: uploadURL,
      body: data as File,
      method: 'PUT',
      withCredentials: true,
      onProgress: (e) => {
        fileMessage.percent = e.percent as number
        socket.updateUploadProgress(fileMessage)
      },
      onSuccess: () => {
        fileMessage.percent = 100
        fileMessage.status = 'resolved'
        socket.updateUploadProgress(fileMessage)
        socket.sendMsg(fileMessage)
      },
      onError: () => {
        fileMessage.status = 'rejected'
        socket.updateUploadProgress(fileMessage)
      },
    })
  }
  const handleDragChange = (fileOrText: File | string) => {
    if (typeof fileOrText === 'string') {
      const match = fileOrText.match(/http.*(png|jpe?g|gif)/gi)
      if (match) {
        const fileMessage: FileMessage = {
          id: uuid(),
          type: 'file',
          url: fileOrText,
          file: {
            size: 0,
            name: `drag-img.${match[1]}`,
          },
          percent: 100,
          status: 'resolved' as const,
        }

        socket.pushMessage(fileMessage)
        socket.sendMsg(fileMessage)
      }
      return
    }
    onSendChange('file', fileOrText)
  }
  return (
    <div className={style.listContainer}>
      <Cover className={style.listContainer} onChange={handleDragChange}>
        <ChatNav id={props.roomId} />
        <ChatList>
          {socket.state.messageList.length === 0 && (
            <p className={style.textCenter}>
              {socket.state.socketStatus === 'connected' ? '暂无分享' : 'connecting...'}
            </p>
          )}

          {socket.state.messageList.map((v) => {
            return (
              <MsgType
                key={v.id}
                type={v.type}
                percent={v.percent}
                status={v.status}
                text={v.text}
                file={v.file}
                url={v.url}
                time={v.time}
              />
            )
          })}
        </ChatList>
        <ChatInput onSendChange={onSendChange} />
      </Cover>
    </div>
  )
}
