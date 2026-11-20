import { index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/_layout.tsx', [
    index('routes/index.tsx'),
    // 新规范：路径参数
    route('room/:roomId', 'routes/room.$roomId.tsx'),
    // 旧链接兼容：/room?roomId=xxxx → 重定向（dev/prod 均可直达与刷新）
    route('room', 'routes/room.tsx'),
    route('data', 'routes/data.tsx'),
  ]),
]
