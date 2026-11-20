# 03 · HTTP API 契约

**Zod 路由 schema 是 HTTP 契约的唯一来源。** Fastify 用它校验请求与序列化响应，
`@fastify/swagger` 从同一批 schema 导出 OpenAPI 3.1，orval 再由 OpenAPI 生成前端
fetch 客户端。三者永远一致，因为只有一份定义。

## 1. 端点总览（旧 RPC → 新 REST）

| # | 新端点 | 旧调用（ts-brpc） | 说明 |
|---|---|---|---|
| A1 | `POST /api/rooms` | `Room.join()` 无参 | 创建房间：4 位数字号 + **邀请 secret**（D14 修复） |
| A2 | `GET /api/rooms/{roomId}` | `Room.join(roomId)` | 进房校验：存在且 secret 匹配（`x-room-secret` 头）；403/404 |
| A3 | `GET/PUT /api/rooms/{roomId}/outbox` | `Room.getRoomMessageHistory`（坏） | **v2 修订**：聊天历史端点随 P2P 退役（历史在本地 IndexedDB）；此端点改为**离线文件回执**列表/投递（10 §8），`PUT` 需 `x-room-secret` 头 |
| A4 | `POST /api/uploads/sign` | `Upload.getUploadAction` | MinIO 预签名 PUT/GET；另支持 `{ key }` 形态换取回执文件的下载签名（限本房间前缀） |
| A5 | `GET /api/statistics/rooms` | `Statistics.getCurrentRoomts` | 活跃房间号列表 |
| A6 | `GET /api/statistics/users` | `Statistics.getUserList` | 用户列表（改为 peerId，配合 D9/D13） |
| A7 | `GET /api/health` | `Ping.ping` | 存活检查 |
| A8 | `GET /api/webrtc/ice-servers` | （无） | **v2 新增**：下发 ICE 清单（STUN + TURN 临时 HMAC 凭证）；需 `x-room-secret`，限流防刷（10 §9） |

## 2. 响应与错误约定

- **成功：直接返回类型化数据对象，不再包 `{ code, status, data }` 信封。**
  HTTP 状态码表达结果（201 创建、200 查询、204 无内容），orval 客户端据此收窄类型。
  这是对旧信封（错误也返回 200）的修正；前端旧代码里 `res.status !== 'ok'` 的分支
  全部由 fetch 的 `response.ok` / orval 错误类型替代。
- **校验失败：Fastify + zod 自动返回 400**，体为统一错误结构（原型样例已验证此行为）：

```jsonc
// 400 响应体（fastify-type-provider-zod 的 Validation error 格式化）
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/fileName must be longer than or equal to 1 characters",
  "details": [ { "path": "body.fileName", "message": "..." } ]
}
```

| 状态码 | 场景 |
|---|---|
| 400 | zod 校验失败（params/query/body 任一） |
| 403 | 邀请 secret 缺失/错误（A2/A3-PUT/A8） |
| 404 | 房间不存在或已过期（A2/A3） |
| 413 | 申请上传签名时声明的 size 超过限额 |
| 500 | Redis/MinIO 故障（Fastify setErrorHandler 统一转错误结构，pino 记日志） |
| 502 | MinIO 签名失败（上游错误） |

## 3. Schema 定义（设计稿，放 `server/routes/*.ts` 顶部）

通用类型放 `shared/`，HTTP 与 Socket 复用：

```ts
// shared/message.ts
import { z } from 'zod'

export const roomIdSchema = z.string().regex(/^\d{4}$/)

export const messageSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'file']),
  text: z.string().max(10_000).optional(),
  url: z.string().url().optional(),
  file: z.object({ name: z.string().min(1).max(200), size: z.number().int().min(0) }).optional(),
  time: z.number().int().optional(),
  sendBy: z.string().max(64).optional(),
})
export type Message = z.infer<typeof messageSchema>
```

### A1 创建房间

```ts
const createRoomRoute = {
  method: 'POST',
  url: '/api/rooms',
  schema: {
    tags: ['Rooms'],
    body: z.object({}).optional(),                     // 保留扩展位（如自定义号段）
    response: { 201: z.object({
      roomId: roomIdSchema,
      secret: z.string().length(22),                   // base64url(16B)，仅创建时返回一次
    }) },
  },
} as const
```

行为（修正 D2/D14）：`crypto.randomInt` 生成 4 位数字，`SETNX` 占位，**有界重试**
（20 次）防死循环；同时生成邀请 secret，服务端只存其 SHA-256（写入房间注册，06 §3）。
客户端拼分享链接 `/room/{roomId}#s={secret}`（fragment 不进服务端日志，10 §11）。

### A2 进房校验

```ts
schema: {
  tags: ['Rooms'],
  headers: z.object({ 'x-room-secret': z.string().length(22).optional() }),
  params: z.object({ roomId: roomIdSchema }),
  response: { 200: z.object({
    roomId: roomIdSchema,
    onlinePeers: z.number().int(),     // v2：服务器无消息计数，返回在线人数
    ttlSeconds: z.number().int(),      // 剩余有效期，前端可显示「xx 天后过期」
  }) },
}
```

- 房间不存在/过期 → 404；secret 缺失或不匹配 → 403（D14）。
- 旧实现是 200 + `status:'error'` +「房间号不存在或者已过期」；页面按 403/404
  引导「链接失效，请对方重新创建」。

### A3 离线文件回执（v2：取代「历史消息」）

```ts
// GET：领取列表（登录时与 outbox:new 互补）
schema: {
  tags: ['Rooms'],
  params: z.object({ roomId: roomIdSchema }),
  response: { 200: z.object({
    items: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(), size: z.number().int(),
      sha256: z.string().length(64),
      expiresAt: z.string().datetime(),
    })),
  }) },
}

// PUT：投递回执（需 x-room-secret 头；请求体含 key，服务端校验必须在本房间前缀下）
schema: {
  tags: ['Rooms'],
  params: z.object({ roomId: roomIdSchema }),
  body: z.object({ name, size, sha256, key }),
  response: { 201: z.object({ id: z.string().uuid() }) },
}
```

> 聊天消息历史**没有对应端点**：P2P 模式下服务器不留痕，历史只存客户端 IndexedDB（10 §3）。
> D1 的原修复（服务端读历史）随该职责退役一并取消。

### A4 上传签名

```ts
schema: {
  tags: ['Uploads'],
  body: z.object({
    roomId: roomIdSchema.optional(),      // 缺省时服务端生成 uuid 目录（匿名一次性文件）
    fileName: z.string().min(1).max(200),
    size: z.number().int().nonnegative().optional(),
  }),
  response: { 200: z.object({
    method: z.literal('PUT'),
    key: z.string(),                      // 服务端最终对象键，回显便于排查
    uploadUrl: z.string().url(),
    downloadUrl: z.string().url(),
    expiresAt: z.string().datetime(),     // 与 URL 过期时间一致
  }) },
}
```

行为（修正 D8/D12）：
- 对象键 = `{roomId ?? uuidv4()}/{随机8位hex}-{清洗后的fileName}`；`fileName` 仅取
  basename 并去除 `..`、路径分隔符与控制字符。
- **v2 扩展**：请求体支持 `{ key }` 形态（key 必须以本房间 `{roomId}/` 开头），
  只返回 `downloadUrl`——供接收端领取 outbox 回执文件（10 §8）。
- 预签名有效期 7 天（同现状 `signedUrlExpireSeconds`），房间消息 TTL 与签名期分开配置。
- **URL 协议由配置项决定**（`PUBLIC_MINIO_SCHEME=https|protocol-relative|auto`），
  取代现状「从 referer 猜 https 再剥协议头」的 hack；`auto` 保留现行为（按请求
  `x-forwarded-proto`/referer），作为过渡默认。
- `size` 超过 `MAX_UPLOAD_SIZE`（env，默认 2GiB）→ 413。
- 日志只打 key 与耗时，**禁止再打印 AK/SK**（销 D4）。

### A5/A6 统计

```ts
response: { 200: z.object({ rooms: z.array(roomIdSchema) }) }   // A5
response: { 200: z.object({ users: z.array(z.string()) }) }     // A6
```

### A7 健康检查

```ts
schema: { tags: ['System'], response: { 200: z.object({
  status: z.literal('ok'), uptime: z.number(), version: z.string(),
}) } }
```

不带任何业务依赖检查也可（保持旧 Ping 语义）；`/api/health/deep` 视运维需要再加。

### A8 ICE 服务器清单（v2 新增）

```ts
schema: {
  tags: ['WebRTC'],
  headers: z.object({ 'x-room-secret': z.string().length(22) }),  // 防匿名刷 TURN
  query: z.object({ peerId: peerIdSchema }),
  response: { 200: z.object({
    iceServers: z.array(z.object({
      urls: z.array(z.string()),
      username: z.string().optional(),
      credential: z.string().optional(),
    })),
    ttlSeconds: z.number().int(),
  }) },
}
```

- STUN 静态下发；TURN 凭证为 coturn REST 风格临时凭证
  `username = ${过期epoch}:${roomId}-${peerId}`（peerId 作 query 传入以便审计）、
  `credential = base64(HMAC-SHA1(TURN_SECRET, username))`，默认 12h。
- 凭证与房间绑定、按房间限流，签发逻辑在 `server/services/ice.ts`（10 §9）。

## 4. 路由组织与注册

```ts
// server/app.ts（示意，非实现）
export async function buildApp(opts?: { docs?: boolean }) {
  const app = fastify({ logger: pinoConfig, ajv: ajvFormats })
    .withTypeProvider<ZodTypeProvider>()

  app.register(fastifyTypeProviderZod)          // validatorCompiler + serializerCompiler
  app.register(@fastify/cors, corsConfig)        // origin 白名单入 env（替代硬编码）
  if (opts?.docs) app.register(@fastify/swagger, swaggerOptions) // UI 挂 /documentation
  app.register(roomsRoutes, { prefix: '/api/rooms' })
  app.register(uploadsRoutes, { prefix: '/api/uploads' })
  app.register(statisticsRoutes, { prefix: '/api/statistics' })
  app.register(healthRoutes)
  app.register(webrtcRoutes, { prefix: '/api/webrtc' })   // A8（v2）
  return app
}
```

`server/index.ts` 拿 `buildApp()` 的实例：注册 `fastifyReactRouter` 适配器（catch-all 页面）、
`attachSocket(app.server)`，然后 `listen({ port: PORT ?? 3000, host: '0.0.0.0' })`。
路由文件内部只写 `schema` + handler，**handler 里不出现业务逻辑**，一律调
`server/services/*`（与 realtime 共用，见 06）。

## 5. OpenAPI 导出与 orval 代码生成

链路：`zod schema → Fastify 校验 → app.swagger() → openapi.json → orval → app/api/*`

```
scripts/export-openapi.ts   # buildApp({docs:true}) → 不 listen → app.swagger()
                            # → 写 openapi.json（进 git，作为契约快照）
scripts/orval.config.ts     # input:  ../openapi.json
                            # output: ../app/api
                            #   client: 'fetch'，mode: 'tags-split'
                            #   clean: true（重新生成前清空）
```

对应脚本（package.json，详见 07）：

```
npm run openapi   # tsx scripts/export-openapi.ts
npm run codegen   # orval --config scripts/orval.config.ts   （内含先跑 openapi 导出）
```

生成结果的使用约定：
- 页面组件**只 import `app/api` 的函数与类型**（如 `postApiRooms`、`getApiRoomsRoomIdMessages`），
  不手写 fetch/axios；类型与后端同源，非法参数在开发期即编译报错。
- orval 的 fetch 客户端默认 `throw` 非 2xx：页面用 try/catch 将 400/404 映射回用户提示
  （对齐现状「房间号不存在或者已过期 → Toast → 回首页」交互）。
- `app/api` 为生成目录，禁止手改；CI 里跑 `npm run codegen && git diff --exit-code app/api`
  防止「改了 schema 忘记重新生成」。

## 6. 兼容与切换

- 旧 `POST /api/Room/join` 等 RPC 路径**不做兼容层**：客户端与 API 同仓库同进程、原子发布，
  页面切换和 API 切换在同一个部署版本完成（见 08 Phase 6）。
- 若有外部脚本依赖旧路径，过渡期在 `server/routes/legacy.ts` 加 301→410 的桩，
  一个版本后移除（默认不加）。
