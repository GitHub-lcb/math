# 象限先生的数学实验室 — 设计文档

- 日期：2025-06（会话内）
- 状态：已获用户批准
- 参考站：https://liziwuli.com/（粒子先生的物理实验室）

## 1. 项目定位

仿照「粒子先生的物理实验室」（高中物理可视化交互实验站），构建数学方向的同等站点：

> 初高中数学可视化交互实验：实时图像仿真、可调参数、公式推导与实验指南。

品牌名：象限先生的数学实验室（呼应参考站“粒子先生”）。

## 2. 已确认决策

| 项 | 决策 |
|---|---|
| 技术栈 | Next.js 15 (App Router) + TypeScript + CSS Modules |
| 学段 | 高中 + 初中双目录（侧边栏切换） |
| 首版实验数 | 1 个旗舰实验：函数图像与导数探究 |
| 视觉 | 参考站暗色实验室风格，数学化改造（蓝/紫主色） |
| 部署 | 暂不部署，先本地运行；预留 ICP 备案位 + 部署说明文档 |
| 附加功能 | 主题切换（暗/亮）、整屏手写板圈画 |

## 3. 页面布局（单页应用，复刻参考站结构）

顶栏: 品牌标志 + 站点名 | 主题切换 | 手写板按钮

侧边栏（课程目录）:
- 目录卡片: 数学目录 / N 个学习模块 / 模块化初高中数学实验
- 学段切换: [高中][初中]（胶囊按钮）
- 搜索框: 搜实验名 / 知识点 / 易错点
- 免费体验分组（含当前旗舰实验）
- 其余模块/实验: 即将上线（锁定，不可点击）

主区域（实验工作区）:
- 工作区头部：实验名 + 状态
- 画布：坐标系网格 + 函数曲线 + 切线 + 导数曲线 + 定积分面积
- 表达式输入 + 预设函数下拉
- 参数滑块 a/b/c/d（实时联动图像）
- 开关: 导数曲线 / 切线 / 定积分面积
- 面板: 公式推导 | 实验指南 | 易错点（KaTeX 公式）

页脚: 实验名居中 | 右侧 ICP 备案位（占位）.

## 4. 旗舰实验：函数图像与导数探究

### 4.1 功能清单
1. 表达式输入：安全解析器支持 x、参数 a b c d、+ - * / ^、sin cos tan ln log2 log10 abs sqrt exp、常量 pi e；非法输入红色提示。
2. 预设函数卡（下拉 + 卡片网格）：
   - 二次函数 a*x^2 + b*x + c（含推导：极值点公式）
   - 三次函数 x^3 - 3*x + a
   - 正弦 a*sin(b*x + c) + d（振幅/频率/相位/平移）
   - 指数 a*e^(b*x) + c
   - 对数 a*ln(b*x + c)
   - 反比例 a/(x - b) + c
   - 阻尼振荡 a*x*sin(x)（正弦与线性项乘积，包络 ±ax）
   每个预设自带：显示名、表达式字符串、f'(x) 公式卡（KaTeX）、说明、易错点。
3. 参数滑块：a/b/c/d 实时重绘；参数出现于表达式中才启用。
4. 切线模式：切点 x0 滑块（默认 1），实时绘制切线 + 斜率标签；画布点击可设置切点。
5. 导数曲线开关：f'(x) 以次色调绘制（预设用解析式；自定义表达式用数值微分）。
6. 定积分面积开关：区间 [m,n] 滑块（m 起点 / n 终点，独立于函数参数 a-d），黎曼和近似填充 + 面积数值（有向面积）。
7. 视图交互：拖拽平移、+/− 缩放、复位适应。
8. 实时信息：悬停显示 (x, f(x)) 坐标。

### 4.2 数学正确性要求
- 切线斜率：预设函数解析导数；自定义表达式中心差分数值微分。
- 预设函数支持解析极值点/零点标注。
- KaTeX 渲染全部公式，含导数定义 f'(x) = lim(h→0) (f(x+h)-f(x))/h。

## 5. 目录结构（数据驱动）

lib/catalog.ts 定义：

- type Stage = 'senior' | 'junior'
- interface Experiment { id; name; keywords[]; available; lockedNote? }
- interface Module { title; icon; experiments[] }
- const CATALOG: Record<Stage, Module[]>

高中模块（约 9 个）：
集合与逻辑 / 函数与导数★(旗舰:函数图像与导数探究) / 三角函数 / 数列 / 不等式 / 解析几何 / 立体几何 / 概率统计 / 平面向量与复数

初中模块（约 7 个）：
数与式 / 方程与不等式 / 函数初步★(旗舰实验双学段共用) / 三角形与四边形 / 圆 / 图形的变换 / 统计与概率

搜索按 名称/知识点/易错点 过滤；首版锁定项展示“即将上线”标签，免费体验分组仅含旗舰实验。

## 6. 技术设计

### 6.1 依赖
- next@15, react@19, react-dom@19, typescript@5
- katex + @types/katex（公式渲染）
- 无其他重型依赖；绘图自研 Canvas 引擎

### 6.2 代码结构

app/ layout.tsx（主题 boot、manifest、SEO）、page.tsx（主页面）、globals.css（设计系统）
components/ TopBar / CatalogSidebar / Workspace / ExperimentCanvas / ParamPanel / MathTabs / AnnotationBoard / MathFormula
lib/ catalog.ts（双学段目录数据）、parser.ts（tokenizer + Pratt 解析 + 安全求值）、plotter.ts（网格/坐标轴/曲线/切线/填充）、derivatives.ts（预设解析导数 + 数值微分）
docs/ superpowers/specs/（本文件）、DEPLOY.md（部署说明）

### 6.3 画布引擎要点
- Viewport 模型 { xMin, xMax, yMin, yMax, dpr }，世界坐标↔屏幕坐标换算
- devicePixelRatio 适配高清屏；参数变化触发重绘（非动画循环）
- 采样：按像素步进采样，NaN/±Infinity 断点断开曲线
- 切线：由 (x0, f(x0)) 与斜率延伸至视口边缘

### 6.4 主题系统
- html[data-theme="dark"|"light"] + CSS 变量（--paper / --ink / --accent / --line-soft / --muted-ink）
- localStorage key: math-theme；boot 脚本内联于 layout 防闪烁（仿参考站）
- 暗色默认；主色数学蓝紫 --accent: #7c5cff，辅助色 --green: #4ade80 等

### 6.5 SEO / PWA（复刻参考站）
- title/description/og/twitter 标签；theme-color
- manifest.webmanifest（name=象限先生的数学实验室，图标 192/512）
- favicon.ico / icon-192.png / apple-touch-icon（象限坐标风格自绘）

### 6.6 手写板
- 全屏 canvas 浮层，pointer events 绘制笔迹
- 工具：笔颜色（白/黄/红）/ 撤销 / 清空 / 关闭
- 工具栏可拖拽

## 7. 验收标准
1. npm run dev 后 localhost:3000 正常渲染，控制台无错误
2. 暗色默认、主题切换即时生效且刷新后保持
3. 侧边栏高中/初中切换、搜索过滤、免费体验分组、锁定项均正确
4. 输入自定义表达式或选预设，曲线/滑块/切线/导数开关实时正确
5. 公式推导面板 KaTeX 渲染无报错
6. 手写板可圈画、清除、关闭
7. npm run build 通过；SSR HTML 含标题与主要文案
8. 页脚含备案占位


---

## 8. 评审修订（第一轮，2026-08-28）

评审结论：修改后批准。以下修订全部采纳：

### R1（Blocker）积分区间符号冲突
参数滑块仍是 a/b/c/d；**定积分区间改用 [m, n]**（区间起点 m、终点 n），与参数符号彻底分离。

### R2（Blocker）初中学段门控（旗舰实验分级呈现）
初中课程不含导数/极限/积分，实验按学段门控：
- 初中模式：隐藏「导数曲线」「定积分面积」开关与导数定义公式卡；切线工具**降级为割线**（两点 x1、x2 连线，显示平均变化率 (f(x2)-f(x1))/(x2-x1)，寓意"变化快慢"）；画布点击设置距离更近的割点；公式卡只展示 f(x) 与 Δy/Δx 入门内容；预设子集为 二次/三次/正弦/反比例，指数/对数/阻尼振荡在下拉中带「⭐ 高中进阶」标记（选中即切换到高中学段内容）。
- 高中模式：完整功能（导数曲线、切线、定积分、导数定义公式卡）。
- 门控在 page 级 state（stage）驱动，组件以 props 接收。

### R3（Major）SSR/客户端边界
- layout.tsx 为服务端组件（metadata/主题 boot 内联脚本）；page.tsx 与全部交互组件 "use client"。
- 画布组件挂载后（useEffect）初始化尺寸/DPR，SSR 阶段渲染占位容器（固定高度、加载文案「正在加载实验工作区。」），杜绝 hydration 不一致。
- ResizeObserver 监听容器尺寸；dpr = min(devicePixelRatio, 2.5)；重绘用单 rAF 节流。

### R4（Major）画布配色接入主题系统
绘图颜色不硬编码：绘制时 getComputedStyle 读取 CSS 变量（--accent/--green/--ink/--line-soft/--muted-ink/--warn/--danger），theme 变化触发重绘（theme 纳入重绘依赖）。

### R5（Major）滑块与开关默认值表
| 项 | 默认 | 范围 | 步长 |
|---|---|---|---|
| a b c d | a=1 b=0 c=0 d=0 | -10..10 | 0.1（preset 可覆写） |
| 切点 x0（高中切线） | 1 | -8..8 | 0.1 |
| 割点 x1/x2（初中割线） | x1=0 x2=2 | -8..8 | 0.1 |
| 积分区间 m/n | m=0 n=1 | -8..8 | 0.1 |
| 开关 | 切线开；导数曲线/定积分面积关 | — | — |

### R6（Major）表达式错误态
输入非法时：**保留上一条有效曲线**，输入框红描边 + 错误提示条（红底白字）；公式/指南面板中自定义表达式统一给通用内容并注明"采用数值微分近似"。

### R7（Major）解析器文法契约
- 输入长度上限 200 字符；嵌套深度上限 20（超出报"表达式过深"）。
- 隐式乘法：2x、2(x+1)、(x+1)(x-1)、2sin(x)；-x^2 = -(x^2)；x^-2 合法。
- 仅半角字符；全角符号（×÷（））给出中文提示"请使用半角符号"。
- 函数白名单同前；常量 pi/e；变量 x；参数 abcd。
- 除零/定义域外 → ±Infinity/NaN（画布断点），不抛错。

### R8（Major）数值不连续处理
- 曲线逐像素采样，NaN/±Inf 断开线段（渐近线留白）。
- 切线斜率 |slope|>1e5 → 显示"接近垂直"标签，不画线。
- 面积：每子区间中点采样，若任意端点/中点非有限则跳过该子区间；采用**有向面积**（x 轴下方为负），面板注明语义；数值保留 3 位有效数字。

### R9（Major）状态管理
页面级统一 state（单一事实源）：stage / activePreset / exprText / params / tangentX / secantX1,2 / areaM,N / show* / theme / annotationOpen / sidebarOpen；仅 theme 持久化到 localStorage；切预设重置 params 与视图；切学段保留当前预设（门控显隐）。

### R10（Minor，全部采纳）
- katex 样式：layout 或 globals 顶部 import 'katex/dist/katex.min.css'
- 点击设切点 vs 拖拽平移：移动 ≥3px 视为拖拽（不触发切点）
- 搜索作用域：当前学段内；无结果显示空态文案；锁定项搜到也显示（灰显+"即将上线"）
- 禁用滑块（表达式未含该参数）：置灰 + tooltip"表达式中未使用参数 a"
- 画布 aria-label="函数图像画布：拖拽平移，点击设置切点"
- PWA：仅 manifest（可安装清单），不注册 Service Worker，DEPLOY.md 注明
- Node ≥ 18.18 基线（本项目 node 24 实测）
- theme-color meta 随主题切换同步（boot 脚本与切换函数都更新）
- 预设 7 组文案（说明/推导/易错点）已按其数学内容逐条撰写（见 derivatives.ts），实现后人工抽查一轮
- 悬停坐标显示 2 位小数；画布对比度满足亮/暗主题可读

### 验收标准增补
- 解析器纯函数单测全过（x^3-3x@2=2；2sin(x)@0=0；1/x@0=NaN；x@ 抛错；长度/深度上限生效）
- 非法输入标红且保留上一条曲线
- 学段门控显隐正确（初中无导数/面积/导数定义公式卡，割线替代切线）
- 亮/暗主题画布对比度可读
- build 无 hydration 警告
