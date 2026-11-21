import { Link } from 'react-router'

export function meta() {
  return [{ title: '页面不存在 · SEND' }]
}

/** SPA 通配 404（原版卡片语言）：兜底所有未匹配路由，替代 RR 内部 "No route matches" 错误 */
export default function NotFoundPage() {
  return (
    <div className="entry">
      <div
        className="list"
        style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="empty" style={{ paddingTop: 0 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: '#1677ff' }}>404</div>
          页面不存在
          <Link
            to="/"
            className="pill pill-primary"
            style={{ marginTop: 18, lineHeight: '48px', textAlign: 'center' }}
          >
            回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
