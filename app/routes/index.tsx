import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '@heroui/react'
import { createRoom, ApiError } from '@/app/api'
import { DemoStage } from '@/app/components/demo-stage'

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad/i.test(navigator.userAgent)
}

/** 入口页（原版照抄）：双胶囊按钮 + 展开式房间号输入 + 演示舞台 */
export default function EntryPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const joinRoom = async () => {
    try {
      const { roomId } = await createRoom()
      navigate(`/room/${roomId}`)
    } catch (err) {
      toast.danger(err instanceof ApiError ? err.message : '网络开小差了！')
    }
  }

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    setCode(digits)
    if (digits.length === 4) {
      // 避免太快导致还未看清最后一位（同原版）
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        navigate(`/room/${digits}`)
        closeInput()
      }, 200)
    }
  }

  const openInput = () => {
    setShowInput(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const closeInput = () => {
    setShowInput(false)
    setCode('')
    clearTimeout(timerRef.current)
  }

  return (
    <div className="entry">
      <div className="entry-inner">
        <div className="entry-left">
          <button type="button" className="pill pill-primary" onClick={joinRoom}>
            创建房间
          </button>
          <div className={`receive-box${showInput ? ' open' : ''}`}>
            <button type="button" className="pill pill-default" onClick={openInput}>
              进入房间
            </button>
            <div className="receive-input">
              <input
                ref={inputRef}
                inputMode="numeric"
                placeholder="请输入4位房间号"
                value={code}
                onChange={(e) => onCodeChange(e.currentTarget.value)}
                onBlur={closeInput}
                aria-label="4位房间号"
              />
            </div>
          </div>
        </div>
        {!isMobile() && <DemoStage />}
      </div>
    </div>
  )
}
