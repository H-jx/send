/**
 * Orval 生成客户端的同源封装：
 *  - URL/类型全部来自 app/api/generated（契约与后端 schema 同源）
 *  - 生成的 fetch 客户端对非 2xx 不抛错；这里补上「HTTP 错误 vs 业务成功」的区分
 */
import * as roomsApi from './generated/rooms/rooms'
import * as uploadsApi from './generated/uploads/uploads'
import * as statisticsApi from './generated/statistics/statistics'
import type { GetApiRoomsRoomIdMessagesParams } from './generated/sendAPI.schemas'
import type { Message } from '@/shared/message'
import type {
  GetApiRoomsRoomId200,
  GetApiRoomsRoomIdMessages200,
  GetApiStatisticsRooms200,
  GetApiStatisticsUsers200,
  PostApiRooms201,
  PostApiUploadsSign200,
} from './generated/sendAPI.schemas'

export class ApiError extends Error {
  readonly statusCode: number
  readonly details?: { path?: string; message?: string }[]
  constructor(statusCode: number, message: string, details?: ApiError['details']) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * 包装 fetch：2xx 返回 JSON；非 2xx 解析统一错误体并抛 ApiError。
 * 生成的 Url 函数保证「/api 只出现一次」（同源相对路径）。
 */
async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON 错误体 */
  }
  if (!res.ok) {
    const body = parsed as { message?: string; details?: ApiError['details'] } | null
    throw new ApiError(res.status, body?.message ?? `请求失败（HTTP ${res.status}）`, body?.details)
  }
  return parsed as T
}

export async function createRoom(): Promise<PostApiRooms201> {
  return jsonRequest(roomsApi.getPostApiRoomsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}

export async function checkRoom(roomId: string): Promise<GetApiRoomsRoomId200> {
  return jsonRequest(roomsApi.getGetApiRoomsRoomIdUrl(roomId), { method: 'GET' })
}

export async function getRoomMessages(
  roomId: string,
  params?: GetApiRoomsRoomIdMessagesParams,
): Promise<GetApiRoomsRoomIdMessages200> {
  return jsonRequest(roomsApi.getGetApiRoomsRoomIdMessagesUrl(roomId, params), { method: 'GET' })
}

export async function signUpload(body: {
  roomId?: string
  fileName: string
  size?: number
}): Promise<PostApiUploadsSign200> {
  return jsonRequest(uploadsApi.getPostApiUploadsSignUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getStatisticsRooms(): Promise<GetApiStatisticsRooms200> {
  return jsonRequest(statisticsApi.getGetApiStatisticsRoomsUrl(), { method: 'GET' })
}

export async function getStatisticsUsers(): Promise<GetApiStatisticsUsers200> {
  return jsonRequest(statisticsApi.getGetApiStatisticsUsersUrl(), { method: 'GET' })
}

// 直接复用生成的类型作为契约来源
export type {
  GetApiRoomsRoomId200,
  GetApiRoomsRoomIdMessages200,
  PostApiRooms201,
  PostApiUploadsSign200,
}
export type { Message }
export { roomsApi, uploadsApi, statisticsApi }
