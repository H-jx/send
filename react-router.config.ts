import type { Config } from '@react-router/dev/config'

export default {
  // 纯客户端交互应用（Socket 生命周期都在浏览器）；ssr:false + prerender:false：
  // server 产物以 SPA fallback 服务任意深链（验收：dev/prod 直达/刷新 /room/xxxx）
  ssr: false,
  prerender: false,
} satisfies Config
