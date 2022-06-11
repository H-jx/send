import { Toast } from 'antd-mobile'
export function fallbackCopyTextToClipboard(text: string): void {
  const textArea = document.createElement('textarea')
  textArea.value = text

  // Avoid scrolling to bottom
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
    Toast.show({
      content: '复制成功',
    })
  } catch (err) {
    console.warn(err)
    Toast.show({
      content: '复制失败',
    })
  }

  document.body.removeChild(textArea)
}
