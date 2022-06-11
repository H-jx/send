import { Room } from 'src/server/controller/room'
// import request from 'supertest'
// import app from '../../app'

test('/api room', async () => {
  const roomController = new Room()
  // 创建房间
  const response = await roomController.join()
  expect(response.status).toBe('ok')
  expect(response.data).toHaveProperty('roomId')

  // 加入房间
  const response2 = await roomController.join(response.data?.roomId)
  expect(response2.status).toBe('ok')

  expect(response2.data?.roomId).toEqual(response.data?.roomId)
})

test('/api getMessageHistory', async () => {
  const roomController = new Room()
  const response = await roomController.getRoomMessageHistory('1')

  expect(response.status).toBe('error')
  expect(response).toHaveProperty('message')
})
