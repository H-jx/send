/** 房间消息合并：乐观上屏与重连历史按消息 ID 去重（验收项） */
import type { Message } from '@/shared/message'
import type { UiMessage } from './types'

export function mergeHistory(history: Message[], local: UiMessage[]): UiMessage[] {
  const historyIds = new Set(history.map((m) => m.id))
  // 历史在前（服务端顺序），本地尚未落库的消息（如上传中/未 ack）保留在尾部
  const pending = local.filter((m) => !historyIds.has(m.id))
  // 已在历史中的本地条目：若本地是乐观副本且服务端已持久化，用历史版本
  const merged = [...history]
  for (const m of pending) {
    if (!merged.some((h) => h.id === m.id)) merged.push(m)
  }
  return merged
}
