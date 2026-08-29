// 预设函数卡 + 导数支持（解析导数 ↔ 数值微分）
import type { Stage } from "./catalog";

export interface ParamDef {
  name: "a" | "b" | "c" | "d";
  min: number;
  max: number;
  step: number;
  def: number;
}

export interface PresetPoint {
  label: string;      // 中文说明
  formula: string;    // KaTeX 公式
}

export interface Preset {
  id: string;
  name: string;
  expr: string;              // 表达式文本（parser 输入）
  desc: string;              // 一句话说明
  derivativeExpr: string;    // f'(x) 表达式文本
  secondDerivativeExpr?: string; // f''(x) 表达式文本（解析标注拐点用）
  formulas: string[];        // KaTeX 公式卡（f(x)、f'(x)、其他推导）
  points: PresetPoint[];     // 极值点/特殊点
  warn: string[];            // 易错点
  params: ParamDef[];
  stage: "both" | "senior";  // 初中模式仅显示 both
}

const P = (name: ParamDef["name"], min = -10, max = 10, step = 0.1, def = 0): ParamDef => ({ name, min, max, step, def });

export const PRESETS: Preset[] = [
  {
    id: "quadratic",
    name: "二次函数",
    expr: "a*x^2 + b*x + c",
    desc: "抛物线：开口方向、顶点、对称轴与参数的关系，导数为一次函数（直线）。",
    derivativeExpr: "2*a*x + b",
    secondDerivativeExpr: "2*a",
    formulas: [
      "f(x)=ax^2+bx+c",
      "f'(x)=2ax+b",
      "顶点横坐标 x_v=-\\cfrac{b}{2a}，顶点纵坐标 y_v=f(x_v)",
    ],
    points: [
      { label: "开口方向", formula: "a>0 开口向上，a<0 开口向下" },
      { label: "对称轴", formula: "x=-\\cfrac{b}{2a}（此时 f'(x)=0）" },
    ],
    warn: [
      "二次项系数 a≠0；a 的符号决定开口方向",
      "顶点坐标要代回函数求 y 值，勿只记横坐标",
      "f'(x)=0 处是驻点，二次函数驻点恰为顶点",
    ],
    params: [P("a", -5, 5, 0.1, 1), P("b", -10, 10, 0.1, 0), P("c", -10, 10, 0.1, 0)],
    stage: "both",
  },
  {
    id: "cubic",
    name: "三次函数",
    expr: "x^3 - 3*x + a",
    desc: "三次曲线的拐点、极值与导数零点的关系：导数是二次函数。",
    derivativeExpr: "3*x^2 - 3",
    secondDerivativeExpr: "6*x",
    formulas: [
      "f(x)=x^3-3x+a",
      "f'(x)=3x^2-3=3(x-1)(x+1)",
      "驻点：x=-1（极大）与 x=1（极小）",
    ],
    points: [
      { label: "极大点", formula: "x=-1 时 f'(-1)=0，左右导数变号 → 极大值" },
      { label: "极小点", formula: "x=1 时 f'(1)=0 → 极小值" },
      { label: "拐点", formula: "x=0 处 f''(0)=0（可由 f' 的极值点看出）" },
    ],
    warn: [
      "驻点不一定是极值点：还要验证导数变号",
      "三次函数一定有拐点，但不一定有极值",
    ],
    params: [P("a", -10, 10, 0.1, 0)],
    stage: "both",
  },
  {
    id: "sine",
    name: "正弦函数",
    expr: "a*sin(b*x + c) + d",
    desc: "三角函数图像：振幅、周期、相位、纵向平移四个参数的综合舞台。",
    derivativeExpr: "a*b*cos(b*x + c)",
    secondDerivativeExpr: "-a*b^2*sin(b*x + c)",
    formulas: [
      "f(x)=a\\,\\sin(bx+c)+d",
      "f'(x)=ab\\,\\cos(bx+c)",
      "周期 T=\\cfrac{2\\pi}{b}，振幅 |a|",
    ],
    points: [
      { label: "最大值点", formula: "bx+c=\\cfrac{\\pi}{2}+2k\\pi 时取 |a|+d" },
      { label: "最小值点", formula: "bx+c=-\\cfrac{\\pi}{2}+2k\\pi 时取 -|a|+d" },
    ],
    warn: [
      "先平移还是先伸缩？所有变形围绕 x 进行：f(x)=a·sin(b(x+c/b))+d",
      "周期只与 b 有关，与 a、c、d 无关",
      "弧度制！切勿与角度制混用",
    ],
    params: [P("a", -5, 5, 0.1, 1), P("b", -5, 5, 0.1, 1), P("c", -10, 10, 0.1, 0), P("d", -5, 5, 0.1, 0)],
    stage: "both",
  },
  {
    id: "exponential",
    name: "指数函数",
    expr: "a*e^(b*x) + c",
    desc: "指数增长与衰减：底数与系数的图像特征，导数与自身成比例。",
    derivativeExpr: "a*b*e^(b*x)",
    secondDerivativeExpr: "a*b^2*e^(b*x)",
    formulas: [
      "f(x)=ae^{bx}+c",
      "f'(x)=abe^{bx}=b\\,(f(x)-c)",
      "水平渐近线：y=c",
    ],
    points: [
      { label: "渐近线", formula: "x→-∞（b>0 时）函数趋于 c，即 y=c 为水平渐近线" },
    ],
    warn: [
      "e^x 的导数还是 e^x：这是指数函数最重要的身份",
      "a<0 时图像关于 x 轴翻转，仍过渐近线 y=c",
    ],
    params: [P("a", -5, 5, 0.1, 1), P("b", -2, 2, 0.05, 1), P("c", -5, 5, 0.1, 0)],
    stage: "senior",
  },
  {
    id: "logarithmic",
    name: "对数函数",
    expr: "a*ln(b*x + c)",
    desc: "对数曲线：定义域约束 bx+c>0，导数随 x 增大而减小。",
    derivativeExpr: "a*b/(b*x + c)",
    secondDerivativeExpr: "-a*b^2/(b*x + c)^2",
    formulas: [
      "f(x)=a\\,\\ln(bx+c)",
      "f'(x)=\\cfrac{ab}{bx+c}",
      "定义域：bx+c>0（画布中定义域外用断点留白）",
    ],
    points: [
      { label: "定义域边界", formula: "x=-c/b 处为垂直渐近线" },
    ],
    warn: [
      "对数函数定义域是正实数区间，勿取负值",
      "ln(x) 增长极慢：x 很大时导数仍趋近 0",
    ],
    params: [P("a", -5, 5, 0.1, 1), P("b", -2, 2, 0.05, 1), P("c", -5, 5, 0.1, 0), P("d", -5, 5, 0.1, 0)],
    stage: "senior",
  },
  {
    id: "reciprocal",
    name: "反比例函数",
    expr: "a/(x - b) + c",
    desc: "双曲线：两支、渐近线 x=b 与 y=c，导数恒为负（a>0 时）。",
    derivativeExpr: "-a/(x - b)^2",
    secondDerivativeExpr: "2*a/(x - b)^3",
    formulas: [
      "f(x)=\\cfrac{a}{x-b}+c",
      "f'(x)=-\\cfrac{a}{(x-b)^2}",
      "两条渐近线：x=b 与 y=c",
    ],
    points: [
      { label: "垂直渐近线", formula: "x=b（分母为零，图像断开）" },
      { label: "水平渐近线", formula: "y=c" },
    ],
    warn: [
      "不要漏掉 x≠b 的定义域限制",
      "两支曲线并不相交于渐近线",
      "a>0 时两支都单调递减：f'(x)<0（x≠b）",
    ],
    params: [P("a", -5, 5, 0.1, 1), P("b", -5, 5, 0.1, 0), P("c", -5, 5, 0.1, 0)],
    stage: "both",
  },
  {
    id: "damped",
    name: "阻尼振荡",
    expr: "a*x*sin(x)",
    desc: "高中进阶：正弦与线性项的乘积，振幅逐渐增大的振荡曲线。",
    derivativeExpr: "a*(sin(x) + x*cos(x))",
    secondDerivativeExpr: "a*(2*cos(x) - x*sin(x))",
    formulas: [
      "f(x)=ax\\,\\sin x",
      "f'(x)=a(\\sin x+x\\cos x)",
      "包络线：y=±ax",
    ],
    points: [
      { label: "包络线", formula: "|f(x)|=|a|\\,|x|，振荡夹在两条直线之间" },
    ],
    warn: [
      "乘积求导：先导后不导 + 先不导后导",
      "振幅随 |x| 线性增长，不是等幅振荡",
    ],
    params: [P("a", -2, 2, 0.05, 1)],
    stage: "senior",
  },
];

export function getPreset(id: string): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}

export function getPresetOrFirst(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

// 学段门控后的可见预设
export function presetsForStage(stage: Stage): Preset[] {
  return PRESETS.filter((p) => p.stage === "both" || stage === "senior");
}

// 解析导数：命中预设返回解析式求值器，否则 null
import { parse, makeEvaluator } from "./parser";

export function analyticDerivative(presetId: string, params: Record<string, number>): ((x: number) => number) | null {
  const p = getPreset(presetId);
  if (!p) return null;
  try {
    const expr = parse(p.derivativeExpr);
    return makeEvaluator(expr, params);
  } catch {
    return null;
  }
}

// 解析二阶导数：命中预设返回 f'' 求值器，否则 null
export function analyticSecondDerivative(presetId: string, params: Record<string, number>): ((x: number) => number) | null {
  const p = getPreset(presetId);
  if (!p || !p.secondDerivativeExpr) return null;
  try {
    const expr = parse(p.secondDerivativeExpr);
    return makeEvaluator(expr, params);
  } catch {
    return null;
  }
}

// 统一二阶导入口
export function secondDerivativeAt(
  presetId: string,
  isCustom: boolean,
  f: (x: number) => number,
  params: Record<string, number>,
  x: number
): number {
  if (!isCustom) {
    const a2 = analyticSecondDerivative(presetId, params);
    if (a2) {
      const v = a2(x);
      return Number.isFinite(v) ? v : NaN;
    }
  }
  // 数值二阶导：中心差分商的差分
  const h = 1e-3 * Math.max(1, Math.abs(x));
  const y0 = f(x - h), y1 = f(x), y2 = f(x + h);
  if (!isFinite(y0) || !isFinite(y1) || !isFinite(y2)) return NaN;
  return (y2 - 2 * y1 + y0) / (h * h);
}

// 中心差分数值微分（h 随 |x| 自适应）
export function numericDerivative(f: (x: number) => number, x: number): number {
  const h = 1e-4 * Math.max(1, Math.abs(x));
  const y1 = f(x + h);
  const y2 = f(x - h);
  if (!isFinite(y1) || !isFinite(y2)) return NaN;
  return (y1 - y2) / (2 * h);
}

// 统一斜率入口：解析导数优先，否则数值微分
export function slopeAt(presetId: string, f: (x: number) => number, params: Record<string, number>, x: number): number {
  const ad = analyticDerivative(presetId, params);
  if (ad) {
    const s = ad(x);
    return isFinite(s) ? s : NaN;
  }
  return numericDerivative(f, x);
}

// 普通斜率（初中割线：平均变化率）
export function secantSlope(f: (x: number) => number, x1: number, x2: number): number {
  if (x2 === x1) return NaN;
  const y1 = f(x1);
  const y2 = f(x2);
  if (!isFinite(y1) || !isFinite(y2)) return NaN;
  return (y2 - y1) / (x2 - x1);
}
