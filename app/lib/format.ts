export const IMAGE_EXT = ['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']

export function isImageFile(name: string): boolean {
  const ext = getFileExt(name).toLowerCase()
  return IMAGE_EXT.includes(ext)
}

export function getFileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes == null || Number.isNaN(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${i === 0 ? Math.round(value) : value.toFixed(value >= 100 ? 0 : 1)}${units[i]}`
}

export function formatMessageTime(ts: number | undefined): string {
  const d = ts != null ? new Date(ts) : new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${hh}:${mm}`
}
