import type { LinkDescriptor, MetaDescriptor } from 'react-router'
import {
  Links as RouterLinks,
  Meta as RouterMeta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'
import type { ReactNode } from 'react'
import { ToastProvider } from '@heroui/react'
import appCss from './styles/app.css?url'

export function links() {
  return [{ rel: 'stylesheet', href: appCss }] satisfies LinkDescriptor[]
}

export function meta() {
  return [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { title: 'SEND · 房间分享' },
  ] satisfies MetaDescriptor[]
}

/** SPA shell（ssr:false）：html 壳 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <RouterMeta />
        <RouterLinks />
      </head>
      <body className="h-full">
        <div id="root" className="h-full">
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return (
    <>
      <ToastProvider placement="top" />
      <Outlet />
    </>
  )
}
