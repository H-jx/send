import { Link, Outlet } from 'react-router'
import { SceneBackground } from '@/app/components/scene-background'

/** 全局布局（原版 homeLayout）：背景场景 + 半透明黑头部 + 白字页脚 */
export default function LayoutRoute() {
  return (
    <div className="ff-app">
      <SceneBackground />
      <header className="ff-header">
        <Link to="/" className="ff-logo">
          SEND
        </Link>
        <div />
      </header>
      <main className="ff-main">
        <Outlet />
      </main>
      <footer className="ff-footer">文字、链接与文件，同房间即达</footer>
    </div>
  )
}
