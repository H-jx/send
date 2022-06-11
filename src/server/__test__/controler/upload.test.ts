// import request from 'supertest'
// import app from '../../app'
import { Upload } from 'src/server/controller/upload'

test('/api upload/getUploadAction', async () => {
  const uploadController = new Upload()
  const response = await uploadController.getUploadAction({ md5: 'md5', fileName: 'test.png' })
  console.log(response.data)
  expect(response.status).toBe('ok')
  expect(response.data).toHaveProperty('download')
})
