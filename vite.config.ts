import path from 'node:path'
import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { fastifyReactRouterDev } from '@mcansh/react-router-fastify/vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    // dev 时由本插件调用 server/index.ts 的 createServer(vite)：
    // 请求先过 Vite（HMR/模块），其余交给 Fastify（/api、/socket.io、页面 catch-all）
    fastifyReactRouterDev({ entry: './server/index.ts', exportName: 'createServer' }),
  ],
  server: {
    port: Number(process.env.PORT ?? 3000),
    host: true,
  },
})
