import http from 'http'
import io from 'socket.io'
import { logger } from 'src/server/common/logger'
import { Message, SocketHandler, SocketEvents, SOCKET_EVENT_MAP } from 'src/lib/interface'
import { getRoom, getRoomMessageList, getRoomTll, pushMessage, removeRoom } from '../service/room'
import { recordUser, recordRoomKey, getCurrentRoomts, removeRoomKey } from '../service/statistics'

// const socketsMap: Record<string, io.Socket> = {}
let ioServer: io.Server | undefined

export function attach(server: http.Server) {
  ioServer = new io.Server(server, {
    cors: {
      origin: [
        '127.0.0.1',
        'http://localhost:1234',
        'http://send.8and1.cn',
        'http://send.8and1.cn',
        'https://send.8and1.cn',
        'http://send.8and1.cn',
        'https://send.8and1.cn',
      ],
      methods: ['GET', 'POST'],
    },
    pingInterval: 3500,
  })

  ioServer.on('connection', handleSocket)
}

async function handleSocket(socket: io.Socket<SocketHandler>) {
  const handshake = socket.handshake

  // socketsMap[socket.id] = socket
  const currentRoomId =
    handshake.query.roomId == undefined || Array.isArray(handshake.query.roomId) ? '' : handshake.query.roomId

  const username = handshake.query?.username as string | undefined

  // 记录用户数据
  if (username) {
    // recordUser(handshake.query?.username as string)
  }
  // 记录房间数据
  recordRoomKey(currentRoomId)

  const room = await getRoom(currentRoomId)

  if (room) {
    socket.join(currentRoomId)
    const msgList = await getRoomMessageList(currentRoomId)
    socket.emit(SOCKET_EVENT_MAP.ROOM_JOINED, msgList)
  }

  async function roomBroadcast(event: SocketEvents, roomId: string, ...arg: Parameters<SocketHandler[SocketEvents]>) {
    if (!ioServer) {
      logger.error('socket.io is not ready')
      return
    }
    const sockets = await ioServer.in(roomId).fetchSockets()
    for (const s of sockets) {
      if (s.id === socket.id) {
        continue
      }
      s.emit(event, ...arg)
    }
  }

  socket.on('disconnect', async (reason) => {
    socket.leave(currentRoomId)
    // delete socketsMap[socket.id]
    logger.info(`socket disconnect: ${socket.id} ${reason}`)

    // 删除记录当前存活的房间号(没人使用的时候操作)
    const allSockets = await ioServer?.fetchSockets()

    logger.info(`allSockets.length: ${allSockets?.length}`)

    if (allSockets && allSockets.length < 3) {
      const roomIds = await getCurrentRoomts()

      roomIds.forEach(async (id) => {
        try {
          const room = await getRoom(id)
          const t = await getRoomTll(id)
          console.log(`${id}: ${t / 24 / 60 / 60}`)
        } catch (error) {
          const msgList = await getRoomMessageList(id)
          if (!room || msgList.length === 0) {
            removeRoomKey(id)
            removeRoom(id)
          }
          console.error(error)
        }
      })
    }
  })

  socket.on(SOCKET_EVENT_MAP.MSG_SEND, async (message: Message, callback) => {
    const response = {
      success: false,
      message: '',
    }
    message.time = Date.now()

    if (message.url) {
      message.url = message.url?.replace(/https?:/, '')
    }
    message.sendBy = username as string

    logger.info('on MSG_SEND', socket.id, '-', currentRoomId, '-', message)
    try {
      const room = await pushMessage(currentRoomId, message)
      response.success = Boolean(room)
      roomBroadcast(SOCKET_EVENT_MAP.MSG_RECEIVE, currentRoomId, message)
    } catch (error) {
      response.success = false
      response.message = (error as Error).message
      logger.error('MSG_SEND', error)
    }

    if (callback) {
      callback(response)
    }
  })
}
