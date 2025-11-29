import { ResponseCodeType, ResponseBody } from '@/server/interface/Http'

/**
 * 成功反馈的数据格式
 * @param {object}
 */
export function successJSON<T>(
  { data, message = 'success', ...otherData }: Partial<ResponseBody<T>> = {} as Partial<ResponseBody<T>>,
) {
  return {
    code: ResponseCodeType.success,
    message,
    status: 'ok',
    data,
    ...otherData,
  }
}
/**
 * 失败反馈的数据格式
 * @param {object}
 */
export function errorJSON<T>(
  { code = ResponseCodeType.otherError, message = 'error' }: Partial<ResponseBody<T>> = {} as Partial<ResponseBody<T>>,
) {
  const errorData = {
    code,
    message: `${message}`,
    status: 'error',
  }

  return errorData
}
