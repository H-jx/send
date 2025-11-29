import { getUserList, getCurrentRoomts, recordRoomKey, recordUser, removeRoomKey } from '@/server/service/statistics'
// import request from 'supertest'
// import app from '../../app'

test('/service user', async () => {
  await recordUser('test')
  await recordUser('test2')

  const list = await getUserList()
  expect(list[1]).toBe('test2')
})

test('/service room', async () => {
  await recordRoomKey('123')
  await recordRoomKey('234')

  const list = await getCurrentRoomts()
  expect(list.length).toBe(2)

  await removeRoomKey('234')

  const list2 = await getCurrentRoomts()
  expect(list2.length).toBe(1)
})
