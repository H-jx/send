/**
 * 入口页演示舞台（DESIGN.md §4.11）：代替 example.mp4 的 6 秒循环自演动画。
 * 手机 → 抛物线飞草方块 → 电脑弹跳收货 + ✓/收到! 气泡 + LIVE 角标 + 假进度条。
 * 节拍与 reduced-motion 静态态由 CSS（app.css）驱动。
 */
export function DemoStage() {
  return (
    <div className="entry-right" title="SEND 演示动画">
      <svg className="stage" viewBox="0 0 700 400" role="img" aria-label="演示动画：手机向电脑传输文件">
        <defs>
          <linearGradient id="send-stageG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16283f" />
            <stop offset="1" stopColor="#0a1626" />
          </linearGradient>
        </defs>
        <rect width="700" height="400" fill="url(#send-stageG)" />
        <g stroke="#274b6d" strokeWidth="1" opacity=".18">
          <path d="M0 100H700M0 200H700M0 300H700M140 0V400M280 0V400M420 0V400M560 0V400" />
        </g>
        <path d="M184 200 Q350 92 516 176" fill="none" stroke="#3d6a96" strokeWidth="2.5"
              strokeDasharray="1 9" strokeLinecap="round" opacity=".85" />
        {/* 手机 */}
        <g>
          <rect x="86" y="150" width="96" height="176" rx="16" fill="#0d1926" stroke="#2c4a6b" strokeWidth="2" />
          <rect x="94" y="166" width="80" height="136" rx="8" fill="#12283e" />
          <rect x="102" y="176" width="64" height="26" rx="6" fill="#1b3a57" />
          <rect x="108" y="182" width="14" height="14" rx="3" fill="#7fbf5f" />
          <line x1="128" y1="186" x2="158" y2="186" stroke="#3d6a96" strokeWidth="4" strokeLinecap="round" />
          <line x1="128" y1="194" x2="148" y2="194" stroke="#274b6d" strokeWidth="4" strokeLinecap="round" />
          <circle cx="134" cy="256" r="14" fill="none" stroke="#1b3a57" strokeWidth="5" />
          <circle className="ring" cx="134" cy="256" r="14" fill="none" stroke="#1677ff" strokeWidth="5"
                  strokeLinecap="round" transform="rotate(-90 134 256)" />
          <g className="chk">
            <circle cx="134" cy="256" r="14" fill="#16a34a" />
            <path d="M127 256l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
        {/* 电脑 */}
        <g>
          <rect x="492" y="118" width="152" height="102" rx="10" fill="#0d1926" stroke="#2c4a6b" strokeWidth="2" />
          <rect x="500" y="126" width="136" height="78" rx="6" fill="#12283e" />
          <rect x="557" y="220" width="22" height="18" fill="#0d1926" />
          <rect x="534" y="238" width="68" height="8" rx="4" fill="#0d1926" />
          <rect x="512" y="140" width="112" height="50" rx="8" fill="none" stroke="#274b6d" strokeWidth="2" strokeDasharray="6 6" />
          <g className="pop">
            <rect x="514" y="142" width="108" height="46" rx="8" fill="#1b3a57" />
            <rect x="524" y="152" width="26" height="10" fill="#7fbf5f" />
            <rect x="524" y="162" width="26" height="16" fill="#b2875a" />
            <line x1="560" y1="158" x2="610" y2="158" stroke="#3d6a96" strokeWidth="5" strokeLinecap="round" />
            <line x1="560" y1="172" x2="592" y2="172" stroke="#274b6d" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="thx">
            <path d="M556 62h84a11 11 0 0 1 11 11v20a11 11 0 0 1-11 11h-44l-14 15v-15h-26a11 11 0 0 1-11-11V73a11 11 0 0 1 11-11z" fill="#1677ff" />
            <text x="598" y="92" fontSize="17" fontWeight="700" fill="#fff" textAnchor="middle">收到!</text>
          </g>
        </g>
        {/* 飞行载荷：fx(水平匀速) > fy(垂直缓动) 合成抛物线，fs 自旋 */}
        <g className="fx">
          <g className="fy">
            <g className="fs">
              <g transform="translate(170 190)">
                <rect x="-15" y="-4" width="30" height="15" fill="#b2875a" />
                <rect x="-15" y="-13" width="30" height="10" fill="#7fbf5f" />
                <rect x="-6" y="-17" width="8" height="5" fill="#7fbf5f" />
                <rect x="-11" y="2" width="6" height="5" fill="#9a7148" />
              </g>
            </g>
          </g>
        </g>
        <g className="twk" fill="#fff">
          <path d="M350 118l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" />
        </g>
        <g className="twk t2" fill="#fff">
          <path d="M430 108l1.3 3.5 3.5 1.3-3.5 1.3-1.3 3.5-1.3-3.5-3.5-1.3 3.5-1.3z" />
        </g>
        <g>
          <circle className="live-dot" cx="26" cy="26" r="5" fill="#e5484d" />
          <text x="38" y="31" fontSize="13" letterSpacing="2" fill="#8fb3d9">LIVE DEMO</text>
        </g>
        <rect x="0" y="390" width="700" height="10" fill="#0a121d" />
        <rect className="scrub" x="0" y="393" width="700" height="4" fill="#1677ff" />
      </svg>
    </div>
  )
}
