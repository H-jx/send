const KB = 1024
const MB = 1024 * 1024
const GB = 1024 * 1024 * 1024

/**
 * 保留几位小数
 * @param value 待处理的数值
 * @param digits 保留位数
 */
export const keepDecimalFixed = (value: number | string, digits = 0) => {
  const unit = 10 ** digits
  return Math.trunc(Number(value) * unit) / unit
}

/**
 * 获取文件大小
 * @param size
 */
export function getFileSize(size?: number) {
  if (!size) {
    return '0KB'
  }
  if (size < MB) {
    return `${keepDecimalFixed(size / KB, 2)}KB`
  } else if (size <= GB) {
    return `${keepDecimalFixed(size / MB, 2)}MB`
  } else {
    return `${keepDecimalFixed(size / GB, 2)}GB`
  }
}
