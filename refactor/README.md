# SEND 重构方案文档

本目录是 `send` 项目的重构设计文档集，**只含方案，不含代码**。目标是把现有的
Koa + ts-brpc + antd-mobile 单体，重构为已定稿的技术框架。

> **修订记录**
> - v1：等价迁移（服务器中转消息 + Redis 历史）。
> - v2（当前）：聊天数据面改为 **WebRTC P2P**（见 10），Socket.IO 退居信令/在线/回执/降级；
>   03–09 已同步修订。产品语义变化（离线文本不可发、历史仅本地）见 10 §1，需使用方确认。

## 定稿决策（不可再议）

| 项 | 决策 |
|---|---|
| 总体 | 一个仓库、一个 Node.js 进程、一个端口（3000） |
| 服务入口 | **Fastify 5**，负责 `/api/*`、请求校验、OpenAPI |
| 页面 | **React Router 8**（framework mode），由 Fastify 适配器托管 |
| UI 库 | **HeroUI 3.2.6**（React Aria + Tailwind v4） |
| 实时 | **WebRTC DataChannel（P2P）为数据面主路径**（文本/文件端到端直传，见 [10-P2P聊天方案.md](./10-P2P聊天方案.md)）；**Socket.IO** 挂同一 HTTP server，承担信令、在线状态、注册、降级中继与文件回执 |
| 契约 | **Zod 路由 schema 是 HTTP 契约的唯一来源**：Fastify 用它校验请求 → `@fastify/swagger` 导出 OpenAPI → **orval** 生成前端 fetch 客户端 |
| 存储 | Redis 仅存：房间注册（含邀请 secret 哈希）、统计、文件回执（outbox）；**聊天消息不落服务端**，历史存浏览器 IndexedDB；MinIO 保留：大文件、离线"上传-回执-领取"、直传兜底 |
| 房间业务 | 房间 API 与 Socket.IO **共用同一个房间服务**（`server/services/room.ts`） |

## 依赖定稿

| 用途 | 依赖 |
|---|---|
| HTTP 服务 | `fastify@5.12.8` |
| React Router 接入 | `@mcansh/react-router-fastify@6.0.2`（适配器同时负责生产静态文件托管） |
| 校验与 OpenAPI | `zod@4`、`fastify-type-provider-zod@7.0.0`、`@fastify/swagger@9.9.5`、`openapi-types@12.1.3` |
| 客户端生成 | `orval@8.48.0`（生成 fetch 客户端） |
| P2P 数据面 | 浏览器原生 `RTCPeerConnection`（零运行时依赖；simple-peer/trystero/PeerJS/LiveKit 对比与否决理由见 10 §2） |
| TURN 中继 | 自托管 coturn（运维组件；API 下发临时凭证，见 10 §9、07 §5） |

配套：`socket.io@4`、`socket.io-client`、`ioredis`、`minio`、`react-router@8`、
`@react-router/dev@8`、`@react-router/node@8`、`@heroui/react@3.2.6`、`@heroui/styles`、
`tailwindcss@4`、`@fastify/cors`、`@fastify/rate-limit`(Phase 7)、`tsx`、`typescript`、`pino`。
前端 WebRTC 无运行时 npm 依赖（浏览器原生 API）；coturn 为独立容器服务（07 §5）。
运行环境要求 **Node ≥ 22.22**（React Router 8 的要求）。

## 项目结构（目标）

```
app/                  React Router 页面、HeroUI 样式、P2P 传输层、本地历史、Orval 生成客户端
server/index.ts       createServer 工厂：创建 Fastify、挂载页面和 Socket.IO、启动监听
server/routes/        房间(注册/secret/回执)、上传签名、统计、健康检查、ICE 凭证 API
server/services/      房间注册与回执、Redis、MinIO、TURN 凭证
server/realtime/      Socket.IO 信令转发、在线名单、relay 降级
shared/events.ts      前后端共用的信令与事件类型（zod）
scripts/              从 Fastify 路由 schema 导出 OpenAPI，再运行 Orval
```

## 阅读顺序

| 文档 | 内容 |
|---|---|---|
| [01-功能提炼.md](./01-功能提炼.md) | 从现有代码提炼出的完整功能清单与技术债 |
| [10-P2P聊天方案.md](./10-P2P聊天方案.md) | **第二轮修订主文档**：P2P 数据面、信令时序、帧协议、离线回执、TURN 运维、安全 |
| [02-目标架构.md](./02-目标架构.md) | 总体架构、进程模型、请求分流、目录详解 |
| [03-HTTP-API契约.md](./03-HTTP-API契约.md) | REST 端点、Zod schema、错误约定、OpenAPI/orval 流程 |
| [04-实时事件契约.md](./04-实时事件契约.md) | **v2 重写**：Socket.IO 握手/信令/outbox/relay 事件、`shared/events.ts` |
| [05-前端页面设计.md](./05-前端页面设计.md) | 路由、页面结构、antd-mobile→HeroUI 映射、状态与数据流 |
| [06-服务与数据设计.md](./06-服务与数据设计.md) | Redis 键、房间服务、MinIO 签名、统计与清理 |
| [07-工程化与部署.md](./07-工程化与部署.md) | scripts、tsconfig、日志、CORS、Docker/PM2 |
| [08-迁移计划.md](./08-迁移计划.md) | 分阶段实施步骤与验收清单 |
| [09-功能映射对照表.md](./09-功能映射对照表.md) | 旧文件 → 新位置的可追溯矩阵 |

## 原型验证结论

临时样例已在开发和生产模式跑通：房间页面、Orval 请求、非法参数返回 400、
同端口 Socket.IO 消息确认（ack）。样例使用模拟房间数据，`send` 工作树干净。
本方案即以此为基线展开。
