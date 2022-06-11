import { io, Socket } from 'socket.io-client'
import { useEffect, useRef } from 'react'
import useModel from 'use-easy-model'
import { SOCKET_EVENT_MAP, Message, SocketHandler } from 'src/lib/interface'
import getCookie from 'src/client/utils/getCookie'

export interface FileMessage extends Message {
  status: 'resolved' | 'rejected' | 'uploading'
  percent?: number
}
export type CustomMessage = Message & Partial<FileMessage>

export interface IState {
  messageList: CustomMessage[]
  socketStatus: 'connecting' | 'connected' | 'disconnect'
}

const initialState: IState = {
  messageList: [],
  socketStatus: 'disconnect',
}

const reducers = {
  socketStatusChange: (state: IState, payload: IState['socketStatus']) => {
    return { ...state, socketStatus: payload }
  },
  /**
   * 初始化消息列表
   */
  initMessageList: (state: IState, payload: IState['messageList']) => {
    return { ...state, messageList: payload }
  },
  /**
   * 更新消息
   */
  updateMessage: (state: IState, payload: CustomMessage) => {
    const newMessageList = state.messageList.map((msg) => {
      if (payload.id === msg.id) {
        return {
          ...msg,
          ...payload,
        }
      }
      return msg
    })
    return { ...state, messageList: newMessageList }
  },
  /**
   * 添加消息
   */
  pushMessage: (state: IState, payload: CustomMessage) => {
    return { ...state, messageList: [...state.messageList, payload] }
  },
}

export const useSocket = (url: string, roomId: string) => {
  const socket = useRef<Socket<SocketHandler>>()

  const [state, actions] = useModel({
    state: initialState,
    reducers,
  })

  useEffect(() => {
    actions.socketStatusChange('connecting')
    socket.current = io(`//${url}`, {
      // transports: ['websocket'],
      query: {
        roomId,
        username: getCookie('username'),
      },
    })
    socket.current.on(SOCKET_EVENT_MAP.ROOM_JOINED, (msg: Message[]) => {
      actions.initMessageList(msg)
      actions.socketStatusChange('connected')
    })
    socket.current.on('connect', () => {
      console.warn('connect')
    })
    socket.current.on('disconnect', () => {
      actions.socketStatusChange('disconnect')
      console.warn('disconnect')
    })
    // 推送者不会收到自己发送的消息
    socket.current.on(SOCKET_EVENT_MAP.MSG_RECEIVE, (msg) => {
      if (msg.type === 'file') {
        ;(msg as CustomMessage).percent = 100
        ;(msg as CustomMessage).status = 'resolved'
      }
      actions.pushMessage(msg)
    })
    return () => {
      socket.current?.disconnect()
    }
  }, [])

  /**
   * 发送给服务端
   */
  const sendMsg = (msg: CustomMessage) => {
    socket.current?.emit(SOCKET_EVENT_MAP.MSG_SEND, msg, ({ success }) => {
      actions.updateMessage({ ...msg, status: success ? 'resolved' : 'rejected' })
    })
  }
  /**
   * push到本地
   */
  const pushMessage = (msg: CustomMessage) => {
    actions.pushMessage(msg)
  }
  const updateUploadProgress = (file: FileMessage) => {
    actions.updateMessage(file)
  }

  return {
    state,
    sendMsg,
    pushMessage,
    updateUploadProgress,
  }
}
