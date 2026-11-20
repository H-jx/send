/**
 * 背景矢量场景（DESIGN.md §4.10 B 方案）：
 * 天空渐变+日晕 / 积云×3 / 像素云×2 / 浮空草方块×3 / 远山两层 / 前景丘陵 / 星闪 / 樱花瓣。
 * 全局挂载一次（_layout），fixed 于视口底层；动效受 prefers-reduced-motion 关停（CSS 层）。
 */
const PETALS = [
  { left: '12%', duration: '9s', delay: '-2s' },
  { left: '26%', duration: '11s', delay: '-6s' },
  { left: '44%', duration: '8s', delay: '-1s' },
  { left: '58%', duration: '12s', delay: '-8s' },
  { left: '71%', duration: '9.5s', delay: '-4s' },
  { left: '85%', duration: '11.5s', delay: '-7s' },
  { left: '94%', duration: '8.5s', delay: '-3s' },
]

export function SceneBackground() {
  return (
    <>
      <svg className="bg-scene" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="send-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3d8fd9" />
            <stop offset=".34" stopColor="#79c3ee" />
            <stop offset=".58" stopColor="#c6e8fa" />
            <stop offset=".74" stopColor="#ffeccb" />
            <stop offset="1" stopColor="#d9f0c0" />
          </linearGradient>
          <linearGradient id="send-hillA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93c878" />
            <stop offset="1" stopColor="#6ba254" />
          </linearGradient>
          <linearGradient id="send-hillB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fb45f" />
            <stop offset="1" stopColor="#5c8f47" />
          </linearGradient>
          <radialGradient id="send-sun" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset=".5" stopColor="#fff3c4" stopOpacity=".8" />
            <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
          </radialGradient>
          <g id="send-cumulus">
            <circle cx="-62" cy="8" r="34" fill="#fff" />
            <circle cx="0" cy="-16" r="48" fill="#fff" />
            <circle cx="62" cy="6" r="36" fill="#fff" />
            <circle cx="24" cy="10" r="34" fill="#fff" />
            <ellipse cx="0" cy="26" rx="96" ry="22" fill="#fff" />
            <ellipse cx="0" cy="34" rx="88" ry="14" fill="#e3f0fb" />
          </g>
          <g id="send-pxcloud" fill="#fff" opacity=".95">
            <rect x="16" y="0" width="16" height="16" />
            <rect x="32" y="0" width="16" height="16" />
            <rect x="48" y="16" width="16" height="16" />
            <rect x="0" y="16" width="16" height="16" />
            <rect x="16" y="16" width="16" height="16" />
            <rect x="32" y="16" width="16" height="16" />
            <rect x="64" y="16" width="16" height="16" />
            <rect x="48" y="32" width="16" height="16" />
            <rect x="64" y="32" width="16" height="16" />
            <rect x="80" y="32" width="16" height="16" />
            <rect x="32" y="32" width="16" height="16" />
          </g>
          <g id="send-grassblock">
            <rect x="0" y="16" width="110" height="52" fill="#b2875a" />
            <rect x="0" y="16" width="110" height="16" fill="#7fbf5f" />
            <rect x="0" y="32" width="10" height="8" fill="#7fbf5f" opacity=".7" />
            <rect x="86" y="36" width="12" height="8" fill="#7fbf5f" opacity=".7" />
            <rect x="18" y="44" width="10" height="10" fill="#9a7148" />
            <rect x="60" y="50" width="14" height="10" fill="#9a7148" />
            <rect x="0" y="68" width="110" height="6" fill="#5f8a45" opacity=".55" />
            <rect x="14" y="8" width="16" height="8" fill="#7fbf5f" />
            <rect x="46" y="4" width="20" height="12" fill="#7fbf5f" />
            <rect x="78" y="9" width="14" height="7" fill="#7fbf5f" />
          </g>
          <g id="send-sparkle" fill="#fff">
            <path d="M0 -10 L2.2 -2.2 L10 0 L2.2 2.2 L0 10 L-2.2 2.2 L-10 0 L-2.2 -2.2 Z" />
          </g>
        </defs>
        <rect width="1200" height="800" fill="url(#send-sky)" />
        <circle cx="950" cy="90" r="150" fill="url(#send-sun)" />
        <path d="M0 520 L150 430 L320 515 L500 425 L690 520 L860 455 L1030 530 L1200 470 V800 H0 Z" fill="#a9d3ea" opacity=".8" />
        <path d="M0 585 L210 495 L430 580 L660 505 L900 595 L1200 540 V800 H0 Z" fill="#bfe0c8" opacity=".85" />
        <g className="cloud c1"><use href="#send-cumulus" transform="translate(230 150) scale(1.15)" /></g>
        <g className="cloud c2"><use href="#send-cumulus" transform="translate(760 90) scale(.8)" /></g>
        <g className="cloud c3"><use href="#send-cumulus" transform="translate(1050 260) scale(.6)" /></g>
        <g className="pxcloud p1"><use href="#send-pxcloud" transform="translate(0 120) scale(1.1)" /></g>
        <g className="pxcloud p2"><use href="#send-pxcloud" transform="translate(0 300) scale(.8)" /></g>
        <g className="block b1"><use href="#send-grassblock" transform="translate(150 330)" /></g>
        <g className="block b2"><use href="#send-grassblock" transform="translate(880 380) scale(.8)" /></g>
        <g className="block b3"><use href="#send-grassblock" transform="translate(560 470) scale(.55)" /></g>
        <path d="M0 640 Q300 585 620 645 T1200 635 V800 H0 Z" fill="url(#send-hillA)" />
        <path d="M0 715 Q400 665 800 725 T1200 705 V800 H0 Z" fill="url(#send-hillB)" />
        <g fill="#5c8f47" opacity=".55">
          <ellipse cx="220" cy="700" rx="46" ry="10" />
          <ellipse cx="900" cy="740" rx="60" ry="12" />
        </g>
        <use className="spark s1" href="#send-sparkle" transform="translate(430 200)" />
        <use className="spark s2" href="#send-sparkle" transform="translate(640 130) scale(.7)" />
        <use className="spark s3" href="#send-sparkle" transform="translate(120 250) scale(.6)" />
      </svg>
      <div className="petals" aria-hidden="true">
        {PETALS.map((p) => (
          <i key={p.left} style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }} />
        ))}
      </div>
    </>
  )
}
