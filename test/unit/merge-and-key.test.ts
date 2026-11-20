import { describe, expect, it } from 'vitest'
import { mergeHistory } from '../../app/features/room/merge.js'
import { buildObjectKey, sanitizeFileName } from '../../server/services/minio.js'
import type { Message } from '../../shared/message.js'

describe('消息合并（乐观上屏 × 重连历史，按 id）', () => {
  const history: Message[] = [
    { id: '1', type: 'text', text: 'a', time: 1 },
    { id: '2', type: 'text', text: 'b', time: 2 },
  ]

  it('历史在前；本地未落库消息（上传中/未 ack）保留尾部', () => {
    const local = [
      { id: '2', type: 'text' as const, text: 'b', time: 2, status: 'resolved' as const },
      { id: '3', type: 'text' as const, text: 'c', status: 'sending' as const },
      { id: '9', type: 'file' as const, file: { name: 'f', size: 1 }, status: 'uploading' as const },
    ]
    const merged = mergeHistory(history, local)
    expect(merged.map((m) => m.id)).toEqual(['1', '2', '3', '9'])
    // 已存在于历史的条目用历史版本（无本地 status 残留）
    expect(merged[1]).toEqual(history[1])
  })

  it('历史全覆盖时无重复', () => {
    const local = [{ id: '1', type: 'text' as const, text: 'a', time: 1 }]
    expect(mergeHistory(history, local).map((m) => m.id)).toEqual(['1', '2'])
  })
})

describe('上传 key 清洗（D8）', () => {
  it('剥路径、剥 ..、剥控制字符、空名兜底', () => {
    expect(sanitizeFileName('../../evil/a b.txt')).toBe('a b.txt')
    expect(sanitizeFileName('C:\\Windows\\x.exe')).toBe('x.exe')
    expect(sanitizeFileName('a\u0000b<c>d.txt')).toBe('abcd.txt')
    expect(sanitizeFileName('...')).toBe('file')
    expect(sanitizeFileName('中文 报告.PDF')).toBe('中文 报告.PDF')
  })

  it('key 落在房间前缀下且带随机段', () => {
    const key = buildObjectKey('1234', 'sub/../../x.png')
    expect(key.startsWith('1234/')).toBe(true)
    expect(key).not.toContain('..')
    const anon = buildObjectKey(undefined, 'x.png')
    expect(anon.split('/')[0].length).toBeGreaterThanOrEqual(32) // uuid 目录
  })
})
