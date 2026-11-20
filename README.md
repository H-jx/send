# SEND

房间式点对点分享：创建 4 位房间号，双方进入后互发文字、链接与文件。
一个仓库、一个 Node 进程、一个端口（默认 3000）：Fastify 提供 `/api/*`、OpenAPI 与请求校验；
React Router（framework mode）提供页面；Socket.IO 挂同一 HTTP server 做实时消息。
浏览器直传 S3/MinIO（预签名 PUT），Redis 存房间消息。

## 技术栈（定稿）

`fastify@5.12.8` · `@mcansh/react-router-fastify@6.0.2` · `react-router@8.5.2`(framework) ·
`@heroui/react@3.2.6` + Tailwind v4 · `zod@4` + `fastify-type-provider-zod@7` ·
`@fastify/swagger@9.9.5` + `openapi-types@12.1.3` · `orval@8.48.0`(fetch 客户端) ·
`socket.io@4.8.4`（客户端同版本） · `ioredis@5` · `minio@8` · Node **≥ 24 LTS**，包管理 **npm**（package-lock.json）。

重构设计文档见 `refactor/`（含 WebRTC P2P 后续迭代方案）。

## 目录

```
app/        React Router 页面、HeroUI 样式、Orval 生成客户端(app/api/generated)
server/     index.ts 工厂/监听、routes/、services/（房间/统计/MinIO/清扫）、realtime/
shared/     message.ts、events.ts —— HTTP 与 Socket 共用的契约
scripts/    export-openapi.ts、orval.config.ts、fake-s3.mjs(验证兜底)
openapi.json 由路由 schema 导出，进 git 便于 diff
```

## 开发

```bash
npm run infra:up   # docker compose 起本地 Redis + SeaweedFS(S3)，并执行一次 init bucket
cp .env.example .env # 按需改；本地联调示例见文件注释
npm run dev        # react-router dev：单端口 3000（页面+API+Socket.IO）
```

本地无 MinIO 二进制时可用 `node scripts/fake-s3.mjs` 兜底验证 UI 链路（不校验签名）。

## 契约与代码生成

```bash
npm run codegen    # 导出 openapi.json → orval 生成 app/api/generated（可离线、不连 Redis/MinIO）
```

改了任何路由 schema 必须重跑 `npm run codegen` 并提交生成物；CI 以 `git diff --exit-code` 卡口。

## 测试与构建

```bash
npm test           # vitest：services(真实 Redis db15)/routes(inject)/realtime(双 socket 客户端)/unit
npm run typecheck
npm run build      # react-router build → build/；tsc server → dist/
npm start          # 生产：NODE_ENV=production node dist/server/index.js（单端口 3000）
```

## 部署

```bash
docker-compose up -d # redis + node:24-alpine；宿主 3004→容器 3000；密钥经 .env.production 注入
# 或 pm2：npm run build && pm2 start ecosystem.config.cjs（fork 单实例——Socket.IO 内存适配器不支持 cluster）
```

生产要点：
- 反代需转发 `Upgrade/Connection` 头（WebSocket）。
- `MINIO_*` 指向浏览器可访问的地址与 TLS 策略（`MINIO_URL_SCHEME=auto` 跟随请求协议）。
- 旧 `room-{id}` STRING 数据首次被访问时自动迁移为 LIST+meta，无需停机迁移；
  详见 `refactor/06-服务与数据设计.md`。

## 端点速览

`POST /api/rooms` · `GET /api/rooms/:roomId` · `GET /api/rooms/:roomId/messages` ·
`POST /api/uploads/sign` · `GET /api/statistics/rooms|users` · `GET /api/health` ·
文档 `GET /documentation`（非生产）。Socket.IO：`room:joined / msg:send / msg:receive / room:peer`。

页面：`/`（创建/加入）、`/room/:roomId`（聊天+分享，旧链接 `/room?roomId=` 自动重定向）、`/data`（统计）。
