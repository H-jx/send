export enum ResponseCodeType {
  success = 0,
  /** 表单错误 */
  formError = -500,
  /** 未知错误 */
  otherError = -500,
  /** 权限错误 */
  authorizationError = 401,
}
export interface ResponseBody<T = any> {
  code: number
  message: string
  status: string
  data?: T
}
