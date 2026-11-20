/**
 * 过期记录清扫定时器（D7：不在 disconnect 回调里全库扫描）。
 * 按批处理 statistics-rooms 中的死房间。
 */
import type { AppServices } from './index.js'

export interface CleanupTimer {
  stop(): void
}

export function startCleanupTimer(services: AppServices): CleanupTimer {
  const run = async () => {
    try {
      const ids = await services.stats.listRooms()
      let removed = 0
      const BATCH = 100
      for (let cursor = 0; cursor < ids.length; cursor += BATCH) {
        removed += await services.room.sweepExpired(ids.slice(cursor, cursor + BATCH))
      }
      if (removed > 0) console.info(`[cleanup] 清理过期房间记录 ${removed} 条`)
    } catch (err) {
      console.error('[cleanup] 清扫失败:', (err as Error).message)
    }
  }
  const timer = setInterval(() => void run(), services.env.CLEANUP_INTERVAL * 1000)
  return {
    stop() {
      clearInterval(timer)
    },
  }
}
