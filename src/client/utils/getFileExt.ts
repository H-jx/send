/**
 * 获取文件后缀
 * @param name
 */
export function getFileExt(name: string) {
  const ext = name.split('.')
  return ext[ext.length - 1]
}
