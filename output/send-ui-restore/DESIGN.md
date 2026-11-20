# SEND 原版 UI 复原方案

> 状态：**已实施**（2026-11-21 落地 `app/`，dev/prod 双模式逐屏验证通过；
> 移动端分享弹层与粘贴确认改用自研 sheet/dialog 替代 HeroUI Modal 复合组件——
> 实测其 Body 内容在受控模式下不渲染，自研版与原型 1:1 且消除了 PressResponder 警告）。
> 配套高保真原型：[prototype.html](./prototype.html)。
> 设计基线：2026-11-20 线上站 send.8and1.cn 实测（computed styles + 素材）、git 历史 `src/client/**/*.less` 全量样式、新工作区 `app/` 实现现状。
> 视觉体系：HeroUI 3.2.6 组件保持功能不变，外观按原版规格覆写；Tailwind v4 token 层承载；不引入新依赖、不引暗色模式。

## 0. 结论速览

| 议题 | 结论 |
| ---- | ---- |
| 设计目标 | **照抄原版**：以 send.8and1.cn 视觉为唯一标准，不做现代化改造 |
| 背景 | **定稿 B 矢量场景**（§4.10 七层结构），不依赖外链素材 |
| 视频区 | **改为纯 CSS/SVG 演示动画**「手机递文件给电脑」6 秒循环（§4.11），替代 example.mp4 |
| 主行动按钮 | 保留胶囊 pill 蓝 `#1677ff` + 投影 `0 0 8px rgba(0,0,0,.25)`，HeroUI Button 用 className 覆写，不改组件库 |
| 房间双栏 | 恢复原版尺寸关系：消息卡 `#ECECEC` 700×600 radius 8px + 分享卡白色 300×600，间距 180px（≤1290px 收为 80px） |
| 气泡 | 恢复「右上尾」白气泡 `border-radius: 20px 4px 20px 20px`，时间行 12px 右对齐，复制 chip 挂气泡左侧 |
| 输入条 | 恢复 60px 白条贴底、20px 字号、右侧 40px「+」；发送按钮有文本才出现（原版行为） |
| 进入房间动画 | 恢复输入框从按钮上「宽度 0→100%」展开动画（4px #CCC 描边胶囊），这是原版标志性交互 |
| 拖拽遮罩 | 恢复灰罩 + 黑色虚线框 + 「可以松开了哦」 |
| 移动端（≤920px） | 隐藏视频/页脚/分享侧栏；列表 100vw；输入条 fixed；分享入口收进原版没有的位置 → **维持新版弹窗方案**（原版移动端无分享入口，属新版补位，不算视觉偏差） |
| 数据页 `/data` | 原版无此页样式（裸 HTML）→ 按同一卡片语言轻设计（白卡 + 同款 pill 链接），标注为「无原版参照，从简」 |
| 深色模式 | 不做（用户确认） |
| 字体 | 恢复系统栈 `-apple-system…PingFang SC / Microsoft Yahei`，正文 14px，气泡 14px/1.7 |

## 1. 现状与问题（对应源码）

新实现入口：`app/`（Tailwind + HeroUI 默认外观）。原版样式来源：git `HEAD:src/client/**`。

| # | 现状（新版） | 代码位置 | 与原版差异 |
| - | ------------ | -------- | ---------- |
| 1 | 页面灰底 `bg-neutral-50`，无背景图 | `app/root.tsx` body / `app/styles/app.css` | 原版全屏动漫背景 + blur，是产品识别度核心 |
| 2 | 头部黑字纯文本，无半透明条 | `app/routes/_layout.tsx` | 原版 50px 半透明黑条 + 白色描边 SEND |
| 3 | 按钮 HeroUI 默认圆角矩形 | `app/routes/index.tsx` | 原版 pill 胶囊 + 投影 + 18px 字 |
| 4 | 输入房间号为静态展开的 TextField | `app/routes/index.tsx` | 原版是宽度动画展开的胶囊输入框（覆盖在按钮上） |
| 5 | 消息卡白底圆角 12px 边框 | `app/features/room/room-page.tsx` | 原版 `#ECECEC` 无边框 700×600 radius 8px |
| 6 | 气泡 `rounded-2xl rounded-br-md` 浅蓝底 | `message-bubble.tsx` | 原版白底、**右上尾** `20px 4px 20px 20px`、max-width 80% |
| 7 | 复制按钮在气泡左侧常驻 ghost icon | `message-bubble.tsx` | 原版是白色圆形 chip 悬浮于气泡左缘（`left:-24px`） |
| 8 | 输入区 HeroUI TextArea rows=1 + 边框 | `chat-input.tsx` | 原版 60px 白条贴底、无边框 20px 字、右侧大号「+」 |
| 9 | 分享侧栏 w-72 无边距体系 | `room-page.tsx`/`share-panel.tsx` | 原版 300×600 白卡、标题 24px、二维码 300px、copy 行 180×30 |
| 10 | 房间号导航条左对齐小字 | `chat-nav.tsx` | 原版 40px 居中 20px 字 + 下边框 #DDD |
| 11 | 拖拽遮罩为蓝色半透明圆角 | `drag-cover.tsx` | 原版灰色半透明 + 黑色虚线框 |
| 12 | 页脚灰字常驻 | `_layout.tsx` | 原版白色 14px 居中，≤920px 隐藏 |

**核心诊断**：新版走的是「通用 SaaS 工具」视觉，而原版是「轻快 ACG 分享小工具」——识别度来自三层：①全屏背景图 + 半透明黑头部构成的场景感；②胶囊按钮/胶囊输入/右上尾气泡的「圆润 + 指向性」语言；③消息卡灰底浮于背景图之上的层次。复原不是换色，而是把这三层逐件还原并沉淀为 token。

## 2. 设计原则

1. **照抄优先**：凡原版有定义的尺寸/颜色/圆角/阴影，一律以 git less 文件与线上 computed styles 为准；本方案中每个数值均可回溯到来源（标注在 §4）。
2. **原版没做的不发明**：暗色模式、动效体系、数据页视觉原版均无 → 数据页仅套用同一卡片语言，不单独发挥。
3. **组件库不动，外观下沉 token**：HeroUI 组件保留（可访问性、焦点管理、Modal/Toast 行为已验证），视觉覆写只通过 CSS 变量 + className，不 fork 组件。
4. **状态即事实**（红线沿用）：发送中/已送达/失败三态仍由 ack 驱动；原版无发送状态视觉（旧版只有进度环），复原时进度环样式照旧版 Bubble 的 ProgressCircle（32px 环 + 百分比），失败红叉保留。
5. **背景素材本地化**：`background.jpg`、`example.mp4`、`poster.png` 从 minio 外链迁到 `public/static/`，原型中以近似渐变代替（原型零依赖要求），落地用真图。
6. **表驱动**：气泡状态、按钮态、收起断点均以配置表实现（§4、§3.4）。

## 3. 信息架构与布局

### 3.1 职责分区（沿用原版，无重排）

```
┌─────────────────────────────────────────────┐
│ Header 50px  rgba(0,0,0,.12)  SEND(白描边)   │  全局身份
├─────────────────────────────────────────────┤
│                                             │
│   内容区（flex 居中，height: calc(100%-50px)）│  页面主体
│                                             │
├─────────────────────────────────────────────┤
│ Footer 30px  白字居中（≤920px 隐藏）          │  说明
└─────────────────────────────────────────────┘
背景层：全屏图 blur(2px) opacity .8，z-index:-1
```

### 3.2 主场景线框

**入口页**（桌面 ≥920px）
```
        ┌200px┐          ┌────── 700×400 ──────┐
        │ 创建房间 pill │                      │
        │              │   演示视频(阴影/圆角0) │
        │ 进入房间 pill │                      │
        └──────────────┘  └────────────────────┘
        两列间距 200px，整组垂直居中、上移 10%
「进入房间」激活态：输入胶囊以宽度动画覆盖按钮（4px #CCC 描边）
```

**房间页**（桌面）
```
┌────── 700×600 #ECECEC r8 ──────┐  ←180px→ ┌─ 300×600 白 r8 ─┐
│ 房间号: 6010 (40px居中 #DDD 下框)│           │ 分享 (24px)      │
│ ┌────────────────────────────┐ │           │ ┌────────────┐   │
│ │ 时间行(12px 右对齐)          │ │           │ │ QR 300×300 │   │
│ │ 消息 ●●●●●●▓ ←右上尾白气泡  │ │           │ └────────────┘   │
│ │ [复制chip] 气泡   (32px环)  │ │           │ 手机扫码进房      │
│ └────────────────────────────┘ │           │ 链接 [180×30]⧉  │
│ ┌──── 输入条 60px 白 ─────────┐ │           │ 房间号 [180×30]⧉ │
│ │ 20px 文本…          + 发送  │ │           └──────────────────┘
│ └────────────────────────────┘ │
└─────────────────────────────────┘
```

### 3.3 次要场景

- **窄屏 ≤920px**：视频/页脚/分享侧栏隐藏；消息卡 `width:100vw`（去圆角外边距），高度自适应；输入条 `position:fixed` 贴底并加 safe-area；「进入房间」输入展开动画保持（宽度 100%）。分享入口 = 头部「分享」文字按钮 → 底部弹层（**新版补位**，原版移动端无此入口）。
- **≤1290px**：双栏间距 180px→80px。
- **数据页**：两张白卡（房间 chip 列表 / 用户 chip 列表），chip 用 `#ECECEC` 底 + 蓝链接色 `#11b5f1`，无原版参照从简。

### 3.4 收起规则（container/viewport 断点，照抄原版 920/1290）

| 容器宽 | 形态 |
|---|---|
| ≥1290px | 双栏 700+300，间距 180 |
| 920–1290px | 双栏，间距 80 |
| ≤920px | 单栏全宽，分享收弹层，输入条 fixed，页脚/视频隐藏 |
| ≤400px | 按钮文字保持（原版 pill 天然可缩），输入字号降为 16px（防 iOS 聚焦缩放，标注为**唯一主动偏差**） |

触控目标：pill 按钮 48px、输入条 60px、复制 chip 28px（原版即小，保留 hover 态但移动端改为点气泡直接复制——记入偏差清单）。

## 4. 组件规格（数值来源：git less / 线上 computed）

### 4.0 Token 总表（落地进 `app/styles/app.css` @theme）

| token | 值 | 来源 |
|---|---|---|
| `--send-primary` | `#1677ff` | 线上按钮 computed |
| `--send-link` | `#11b5f1` | msgType `.url-text` |
| `--send-focus` | `#409eff` | copyInput focus |
| `--send-panel` | `#ECECEC` | list-container |
| `--send-card` | `#FFFFFF` | bubble/share |
| `--send-muted` | `rgba(0,0,0,.5)` / `#AAA` / `#505050` | 时间/文件大小/标签 |
| `--send-border` | `#DDD` / `#dcdfe6` / `#CCC` | nav/输入框/展开输入描边 |
| `--send-shadow` | `0 0 8px rgba(0,0,0,.25)` | mixin.boxShadow |
| `--send-pill` | `1000px` | 按钮/展开输入 |
| `--send-radius-card` | `8px` | 面板/复制图标钮 |
| `--send-radius-bubble` | `20px 4px 20px 20px` | bubble |
| `--send-header-bg` | `rgba(0,0,0,.12)` | header |
| `--send-font` | `-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,"Segoe UI",Arial,Roboto,"PingFang SC","Microsoft Yahei",sans-serif` | 线上 body |

徽标色调：原版只有蓝/灰/红叉三档，沿用现状 success/warning/danger 语义色即可，不扩表。

### 4.1 PillButton（创建/进入/发送）
- 结构：HeroUI `Button` + `className` 覆写。规格：高 48px、字号 18px、radius 1000px、primary 底 `--send-primary` 白字、default 底白黑字、投影 `--send-shadow`。
- 状态表：

| 状态 | 视觉 |
|---|---|
| 默认 | 如上 |
| hover | 原版无变化（antd-mobile 无 hover）→ 加 `filter:brightness(.95)` 作为触屏外唯一反馈，标注微偏差 |
| 按下 | `brightness(.9)` |
| 禁用 | `opacity:.4` 无投影 |
| 加载（创建中） | 文案不变 + 内置 Spinner（原版无，属可用性补位） |

### 4.2 进入房间展开输入（标志动效）
- 触发：点「进入房间」→ 输入胶囊覆盖按钮，`width:0→100%` 100ms linear（原版数值），4px `#CCC` 描边、白底、radius 1000px、padding `4px 8px 4px 18px`；失焦/清空 → 收回。
- 输入满 4 位数字 → 200ms 延迟跳转（原版行为）；非数字过滤。
- 状态：默认收起 / 展开聚焦（光标白底黑字）/ 满位跳转动效期间保持展开。

### 4.3 消息卡（List 面板）
- `#ECECEC` radius 8px；桌面 700×600 固定高、内部滚动；导航条 40px 居中 20px 文本 `房间号: 6010`，下边框 1px `#DDD`；空态「暂无分享」/「connecting…」居中 14px `--send-muted`。
- 在线状态 chip（新版功能，原版无）：放导航条右侧，灰底小字，**不破坏居中主文本**——记入偏差清单。

### 4.4 气泡 MessageBubble
- 白底、radius `20px 4px 20px 20px`、padding `5px 12px`、line-height 1.7、max-width 80%、右对齐、下间距 20px；时间行 12px `rgba(0,0,0,.5)` 右对齐 padding-right 16px margin-bottom 4px。
- 复制 chip：绝对定位气泡左缘外（`left:-24px`），白底 padding 2px radius 10px，图标 16px；resolved 才显示（原版条件保留）。
- 状态表（发送态视觉，功能沿用现状语义）：

| 状态 | 视觉 |
|---|---|
| sending | 气泡正常 + 右侧 32px 空心环缓转 |
| uploading | 32px 进度环 + 百分比（原版 ProgressCircle 样式） |
| resolved | 无状态件 + 复制 chip |
| rejected | 32px 环内红叉 + 可点重发（原版无重发，补位标注） |

### 4.5 文件/图片消息（气泡内）
- 文件：min-width 200px；文件名 14px 可换行 max-width 80%；大小 `#AAA` 12px；类型图标 36px 绝对右上（`right:18px top:7px`）；整卡可点新窗口下载。
- 图片：max 350×400 圆角 0（原图风格），点击大图预览（原版 ImageViewer 黑底 → 用 HeroUI Modal 全屏黑底复刻）。
- 链接文本：`--send-link` 色 + 下划线（原版无下划线，hover 才加，记偏差）。

### 4.6 输入条
- 白底 60px 贴底（面板内 absolute bottom；移动端 fixed）；textarea 无边框 20px padding 16px；右侧「+」图标 40px 灰黑；发送按钮（有文本才出现）= 小号 pill primary；IME 组合期 Enter 不发送（现状实现保留）。
- placeholder：「请输入内容」（原版无 placeholder → 照抄留空，记偏差：可用性建议保留，默认**照抄留空**，用户可后改）。

### 4.7 分享卡
- 白卡 300×600 radius 8px padding：标题「分享」24px（margin 8px/32px/20px）；QR 300×300 白底；「手机扫码进房」14px；两行 copy：标签 16px `#505050` + 输入框 180×30 radius 4px 边框 `#dcdfe6` focus `#409eff` + 复制图标钮 30×30 radius 8px hover 蓝底白字。

### 4.8 拖拽遮罩
- 覆盖消息卡：`rgba(123,121,121,.2)` + 1px dashed `#000` radius 10px；居中「可以松开了哦」20px 600 深灰。

### 4.9 滚动条与微交互（精细化轮新增）

| 项 | 规格 |
|---|---|
| 滚动条（消息流/分享卡/弹层/数据页） | 宽 8px、透明轨道；滑块 `rgba(0,0,0,.18)`、2px 透明内描边（视觉 4px）、圆角 8px；hover `.32`；Firefox 用 `scrollbar-width:thin + scrollbar-color` 等价 |
| 滚动行为 | 消息流 `overscroll-behavior:contain`（禁滚动穿透）；新消息到达自动滚底 |
| 选中色 | `::selection` 用 `#cfe3ff`（primary 浅底） |
| 按钮反馈 | pill 悬停 `brightness(.96)`、按下 `.9`，过渡 150ms（原版无 hover——已列偏差，触屏不受影响） |
| 输入聚焦 | `focus-visible` 2px 蓝偏移环（原版 outline:0 不照抄，无障碍红线） |
| 消息入场 | 180ms `fade + translateY(6px)`；`prefers-reduced-motion` 下全部动效停用 |
| 气泡阴影 | `0 1px 3px rgba(0,0,0,.08)`（比原版纯平略提层次，可回退） |
| 移动端弹层蒙层 | 增加 `backdrop-filter: blur(3px)` |
| 空态 | 居中像素方块+气泡小插画 + 「暂无分享」（图形化，替代纯文字） |

### 4.10 背景层（二次元化规格）

原版是动漫插画照片（2237 + MC 场景）。落地二选一，原型演示 B 方案：

- **A 素材复原**：`public/static/background.jpg` 用原图（blur 2px / opacity .8，同旧版）。
- **B 矢量场景（原型采用，更"二次元"且不依赖外链素材）**：内联 SVG 分层——
  1. 天空五段渐变（`#3d8fd9→#79c3ee→#c6e8fa→暖黄地平线→草绿`）+ 右上暖日晕；
  2. 新海诚式大积云（圆形堆叠 + 底缘浅蓝阴影），3 朵、9–16s 往复缓移；
  3. 像素云（16px 方块网格，致敬原版 MC 场景）2 组，70–95s 横向漂移；
  4. 浮空草方块 3 块（绿顶 + 泥土纹理），5.5s 上下浮动；
  5. 远山两层（蓝雾 `#a9d3ea` / 浅绿 `#bfe0c8`）+ 前景双丘陵渐变收底；
  6. 四角星闪烁 3 点（3.2s 呼吸）；
  7. 樱花瓣 7 片（15×11 粉色渐变椭圆，8–12s 飘落 + 摆荡 + 旋转，pointer-events:none）。

  整体 `blur(1px) saturate(1.15)`——比原版照片更锐、更饱和，插画感优先。
  全部动画受 `prefers-reduced-motion` 关停。

### 4.11 入口页演示舞台动画（代替 example.mp4）

用户确认方向后新增：视频区不再放外链 mp4，改为**产品自演 6 秒循环小剧场**（纯 SVG+CSS，零素材依赖）：

| 节拍 | 内容 |
|---|---|
| 0–6% | 静止：手机屏上文件卡待命 |
| 6–52% | 草方块载荷沿虚线航迹**抛物线飞行**（X 匀速 × Y 缓动两层 transform 合成弧线，附带翻转），手机进度环同步画满 |
| 52–60% | 落点：电脑屏虚线框内文件卡**弹跳出现**（scale 1.18→.94→1 回弹曲线） |
| 60–92% | 手机绿 ✓、电脑「收到!」蓝色气泡浮现，顶部火花闪烁 |
| 92–100% | 收拢回到待命，无缝循环 |
| 常驻 | 左上 `● LIVE DEMO` 红点呼吸；底部蓝色假进度条 6s 走满（"视频感"来源）；深色网格舞台与背景场景形成"屏幕"层次 |

- 实现：`@keyframes fly-x/fly-y/fly-spin/send-ring/pop-in/thanks/scrub/live/twk`，
  6s 同周期对齐；SVG `transform-box:fill-box` 保证旋转/缩放原点正确。
- `prefers-reduced-motion`：全部停帧并显示"已完成"静态态（✓+收到）。
- 落地映射：`app/routes/index.tsx` 内联组件 `<DemoStage/>`，原 `example.mp4` 依赖删除；
  若日后要真录屏视频，容器不变，替换内容为 `<video>` 即可。
- 已知验证边界：浏览器后台标签页会节流 CSS 动画（截图验证时观察到冻结帧），
  前台打开正常——交付说明已注明。

## 5. 交互通则

- 焦点：pill 按钮/输入框保留可见焦点环（原版 :focus outline:0 —— **不照抄**，无障碍红线，用 2px `--send-primary` 偏移环，记偏差）。
- 键盘：Enter 发送、Shift+Enter 换行、IME 组合保护（现状实现保留）；Modal Esc 关闭（HeroUI 自带）。
- 截断：长文件名 `white-space:pre-wrap; max-width:80%`（原版）；长链接 break-word。
- 加载：进房「正在进入房间…」居中灰字（现状保留，原版为空白页）；历史消息直接渲染。
- 触控：pill 48px、输入条 60px；复制 chip 移动端热区扩到 44px（透明 padding）。

## 6. 与现有代码的映射

| 文件 | 改动 | 说明 |
|---|---|---|
| `app/styles/app.css` | 新增 §4.0 token + `.send-pill/.send-card/.send-bubble` 等组件类 | 单一视觉来源 |
| `public/static/` | 新增 background.jpg / example.mp4 / poster.png（从 minio 下载入库） | 素材本地化 |
| `app/root.tsx` | body 字体栈 + 背景层组件 | |
| `app/routes/_layout.tsx` | Header 半透明黑条 + SEND 描边白字；Footer 白字 ≤920 隐藏 | |
| `app/routes/index.tsx` | 双列布局 + PillButton 覆写 + 展开输入动画 | 动画纯 CSS width 过渡 |
| `app/features/room/room-page.tsx` | 700×600/300×600 双卡 + 断点间距 | |
| `chat-nav.tsx` | 40px 居中式 + 右侧状态 chip | |
| `message-bubble.tsx` | 右上尾气泡 + 时间行 + chip 定位 + 32px 环 | |
| `message-content.tsx` | 文件卡/图片/链接色规格 | |
| `chat-input.tsx` | 60px 白条 + 20px 字 + 大号 + | 保留 IME/粘贴逻辑 |
| `drag-cover.tsx` | 灰罩虚线 | |
| `share-panel.tsx` | 24px 标题 + QR 300 + copy 行规格 | |
| `app/routes/data.tsx` | 卡片语言套用（无原版参照） | |
| `image-preview.tsx` | 全屏黑底预览 | |

契约依赖：无新增接口。素材入库需 CI 允许二进制（或部署脚本从 minio 拉取，二选一，实施时定）。

## 7. 分阶段实施

- **P1 纯样式**（0 逻辑改动）：token + 背景 + 头部/页脚 + 入口页（含展开动画）+ 房间页双卡/气泡/输入条/分享卡/拖拽罩。验收：与原型逐屏对照截图一致。
- **P2 状态接线**：气泡四态视觉表驱动化、复制 chip 显隐条件、移动端 fixed 输入与分享弹层。验收：发送/上传/失败/重发流转 + 320–1440px 无横向溢出。
- **P3 素材与数据页**：static 入库、视频占位、数据页卡片化。验收：断网环境素材可用。

## 8. 验收清单（原型已逐项验证）

> 实测记录（2026-11-20，浏览器工具逐项验证，全部通过）。
> 实测中发现并修复：背景地平线硬边、文件名被链接色覆盖、shell 被 flex 压缩、
> 数据页窄屏卡片拉伸、拖拽演示改为可切换（定时形态与截图时序竞态）。
> **精细化轮（§4.9/§4.10）复验**：SVG 背景被 `.app>*` 规则拉入文档流导致头部错位（已修）；
> 滚动条细胶囊样式、空态插画、消息入场动效、花瓣飘落、移动端入口/房间逐屏截图通过。

- [x] 入口页：双 pill + 展开输入动画 + 视频位（桌面）/隐藏（≤920）
- [x] 房间页：双卡尺寸间距、右上尾气泡、时间行、复制 chip 位置
- [x] 输入条：60px 贴底、+ 图标、有文本出发送按钮、IME 回车不误发
- [x] 分享卡：QR、扫码文案、两行 copy 输入 + hover 蓝钮
- [x] 拖拽遮罩虚线样式（700×600 覆盖消息卡）
- [x] 移动端：单栏全宽、分享弹层、无横向溢出
- [x] 数据页：卡片语言一致、窄屏纵向堆叠内容高度
- [x] 文件消息：图标右上、大小灰字、文件名黑字
- [x] 状态流转：发送中→已送达、上传进度环推进、失败红叉+重发→成功

## 9. 明确不做

- 暗色模式（用户确认不做）。
- 新版式发明/信息架构调整——本次是复原，不是再设计。
- 不改 HeroUI 组件内部与任何 API 契约；在线数 chip、重发按钮、placeholder 三处「可用性补位」已在偏差清单标注，可一键回退为纯原版。
