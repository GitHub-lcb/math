# 前端开发规范 — 象限先生的数学实验室

> 制定依据：frontend-design / design-taste-frontend 技能原则 + 2026-08-28 项目扫描（20 文件 / 2974 行）。
> 本规范是改 UI 前的对照清单，也是新增实验组件的准入标准。

## 0. 设计立场（先读这个）

- **本项目的身份**：暗色实验室 + 数学手稿。一切视觉决策从「坐标系、函数曲线、公式、刻度」这个领域语言出发，而不是从通用模板出发。
- **签名元素只有一个**：那个实时绘制函数/切线/导数的 Canvas 工作区。它承载了品牌的全部个性，其余界面保持安静、克制、服务于它。
- **禁止默认三件套**：AI 紫渐变英雄区、圆角玻璃拟态、无限循环微动效。本项目已有深色纸面（--paper）+ 蓝紫主色（--accent）+ 单一线条语言，不引入新装饰。
- **动效只为信息而动**：状态切换（学段胶囊滑块）、曲线重绘、面板切换可以有 120–260ms 的缓动；跑马灯、漂浮、呼吸灯这类装饰性动画一律不做。

## 1. 主题与色彩纪律

1. **CSS 变量是唯一色源**：所有颜色必须来自 app/globals.css 的 :root / [data-theme] 变量（--paper / --ink / --accent / --green / --warn / --danger / --line-soft 等）。
2. **组件内禁止硬编码色值**（手写板笔色这类功能色除外）：getComputedStyle 读取变量时必带 fallback 且 fallback 值与暗色主题一致（当前实现即此模式，保持）。
3. **新增色彩先问三句**：是否必须？能否用语义变量（accent/green/warn/danger）表达？亮暗两主题都验证过对比度了吗？
4. 主题化：新增键值必须成对出现在深/亮两套主题中；theme-color meta 与 boot 脚本同步更新。
5. 对比度底线：正文/曲线颜色对 --paper 的对比度 ≥ 4.5:1；纯装饰线允许 ≥ 1.5:1。

## 2. 命名与文件结构

1. **CSS 采用全局 BEM 风格类名**（项目现状，延续）：块名驼峰（exprField）、状态修饰（.error / .active / .locked）、少嵌套、禁止元素选择器。
2. **一个文件一个职责**：组件按 components/ 单文件，数据与纯逻辑放 lib/（catalog / parser / plotter / derivatives / math），站点配置集中于 lib/siteConfig.ts。
3. 常量名称大写蛇形（MAX_INPUT_LEN、FLAGSHIP_ID）；组件文件 PascalCase；lib 工具函数 camelCase。
4. 修改 DOM 结构时同步检查 aria-label / role（见 §4）。

## 3. 组件与状态管理

1. **单一事实源**：实验工作区所有状态（stage / exprText / params / 开关 / 切点 / 区间）统一放在 app/page.tsx，子组件只通过 props 接收和回调，禁止子组件私有状态漂移（当前已如此，保持）。
2. 服务端 / 客户端边界：layout.tsx 保持服务端（metadata + boot 脚本）；一切触碰 window / canvas / localStorage 的组件加 use client 并在 useEffect 中初始化，SSR 阶段渲染占位。
3. 性能预算：首载 JS ≤ 250 kB（当前 197 kB）；列表/解析用 useMemo 且依赖数组写全；拖动重绘用 rAF 节流合并，禁止每帧同步 layout。
4. 新增实验组件必须复用 lib/plotter.ts 绘制原语（drawGrid / drawCurve / drawMarker…），禁止复制绘制逻辑。

## 4. 可达性（无障碍）底线

1. 所有可交互元素：按钮有 aria-label（图标按钮必须）、开关用 role=switch + aria-checked、画布有 role=img + 描述性 aria-label。
2. **键盘可达**：侧边栏、滑块、开关、手写板全部可用 Tab/方向键/Enter 操作；画布平移缩放需提供按钮替代（已有工具栏）。
3. **焦点可见**：全局提供 :focus-visible 样式（当前缺失，待补），焦点环用 --accent 1.5px 描边 + 2px 偏移，禁止裸 outline:none。
4. 触控与指针：点击与拖拽用 ≥3px 位移阈值区分；画布 touch-action:none；手写板支持 Esc 关闭。
5. 文案：动作按钮用动词（切换主题）；错误不道歉、给原因与出路（参考现 parseError 模式：表达式无效：<原因>）。

## 5. Canvas 绘制纪律

1. 绘制函数必须是纯函数：输入 (ctx, viewport, palette, fn)，不读全局状态；颜色一律来自 palette 参数。
2. 曲线采样逐像素 + NaN/±Infinity 断点断开；渐近线留白是特性不是 bug。
3. 数值显示：坐标 2 位小数、斜率/面积 3 位有效数字；fmt() 是唯一格式化入口。
4. 大面积填充（定积分）用有向面积语义，并在面板注明；断点子区间跳过并允许显示「未定义」。
5. dpr ≤ 2.5，canvas 尺寸由 ResizeObserver 驱动，避免 resize 风暴。

## 6. 响应式断点

| 断点 | 行为 |
| --- | --- |
| > 1100px | 三栏：侧栏 300px + 画布 + 右侧 340px 参数面板 |
| 900–1100px | 右侧面板收窄至 300px |
| < 900px | 侧边栏转抽屉（遮罩 + 汉堡按钮）；参数面板移到画布下方（max-height 46vh 内滚动） |
| < 520px | 表达式行纵向堆叠；页脚单列居中 |

新增实验组件必须验证 375px 与 768px 宽度可用。

## 7. 文案与公式纪律

1. UI 词汇统一：预设函数名、实验名、易错点中的术语必须与 catalog.ts / derivatives.ts 一致（如「割点」不写作「端点」）。
2. 公式全部走 components/MathFormula.tsx（KaTeX，throwOnError:false），禁止手写 HTML 数学符号混排；公式字符串集中存于 Preset 数据。
3. 数学内容正确性：新增预设必须同时提供 f(x)、f′(x)、至少一条推导、至少一条易错点（冒烟测试断言这些字段非空）。
4. 中文与数字间不加空格；符号（∫、π、√）按数学排版惯例。

## 8. 动效克制清单

- 允许：胶囊学段切换（260ms cubic-bezier）、hover 微反馈（背景 150ms）、面板切换（≤200ms、尊重 prefers-reduced-motion）。
- 禁止：无限循环动画、入场弹跳、逐字打字、粒子漂浮、glassmorphism 装饰层。
- 画布重绘是「即时反应」不是「动画」：参数变化 → 下一帧直接重绘，不加补间。

## 9. 交付前自查清单（每个 UI 改动必过）

- [x] 颜色全部来自 CSS 变量（无新增硬编码色值）
- [x] 深色、浅色两个主题下对比度可读
- [x] 新增交互有 aria-label / role，键盘可操作，焦点可见
- [x] 375px 与 768px 宽度布局不破
- [x] 画布相关改动走 plotter 原语，parse/derivatives 纯函数单测过 npx tsx smoke.ts
- [x] 文案与数据目录术语一致，无模板腔
- [x] npm run build 零错误；页面控制台无 warning
- [x] 不引入新依赖（如必须：先说明理由并评估体积影响）

## 10. 已知待办（现状差距，下轮补齐）

- [ ] 全局 :focus-visible 焦点环样式
- [ ] prefers-reduced-motion 媒体查询接入
- [ ] ESLint + next/core-web-vitals 接入
- [ ] 画布缩放的 Shift+滚轮横向等高级手势（可选）