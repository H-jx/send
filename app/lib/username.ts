/** 浏览器身份：username cookie（旧实现只读不写，D13；现在缺失时初始化并持久） */
const KEY = 'username'

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : undefined
}

function writeCookie(name: string, value: string) {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`
}

export function getUsername(): string {
  if (typeof document === 'undefined') return ''
  let name = readCookie(KEY)
  if (!name) {
    name = `匿名${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    writeCookie(KEY, name)
  }
  return name
}
