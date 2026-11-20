import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // 服务测试共享本地 Redis（db 15），串行以免互相清库
    fileParallelism: false,
  },
})
