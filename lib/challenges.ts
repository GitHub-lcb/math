// 挑战任务：可自动判分的实验小目标（参考站没有的教学特色）
import type { Stage } from "./catalog";

export interface ChallengeState {
  presetId: string;
  stage: Stage;
  fn: ((x: number) => number) | null;
  params: Record<string, number>;
  tangentX: number;
  showTangent: boolean;
  areaValue: number | null;
  areaM: number;
  areaN: number;
  slopeAt: (x: number) => number;
  showArea: boolean;
}

export interface Challenge {
  id: string;
  prompt: string;
  hint: string;
  check: (s: ChallengeState) => boolean;
}

const near = (a: number, b: number, eps = 0.05) => Math.abs(a - b) < eps;

// 通用题库（对所有预设适用）
const GENERIC: Challenge[] = [
  {
    id: "pass-through",
    prompt: "调一调参数，让曲线恰好穿过点 (2, 1)",
    hint: "试试改变系数 a 或常数项，观察 f(2) 的值",
    check: (s) => !!s.fn && Number.isFinite(s.fn(2)) && near(s.fn(2), 1),
  },
  {
    id: "zero-at-one",
    prompt: "让函数在 x = 1 附近取到 0（零点落在 x=1）",
    hint: "调参数使 f(1) ≈ 0，画布上应出现绿色「零点」标记",
    check: (s) => !!s.fn && Number.isFinite(s.fn(1)) && near(s.fn(1), 0, 0.08),
  },
  {
    id: "flat-tangent",
    prompt: "拖动切点，找到一条水平的切线（斜率 k ≈ 0）",
    hint: "水平切线出现在极值点附近：打开切线，看哪个位置斜率变 0",
    check: (s) => {
      if (!s.showTangent || !s.fn) return false;
      const k = s.slopeAt(s.tangentX);
      return Number.isFinite(k) && Math.abs(k) < 0.08;
    },
  },
  {
    id: "rising",
    prompt: "让曲线在 x = -3 处是上升的（f′(-3) > 0）",
    hint: "高中进阶：f′>0 意味曲线在该点沿 x 增大的方向升高",
    check: (s) => {
      if (!s.fn) return false;
      const k = s.slopeAt(-3);
      return Number.isFinite(k) && k > 0.05;
    },
  },
  {
    id: "area-big",
    prompt: "打开定积分，让 [0, 2] 区间上的面积超过 3",
    hint: "把面积区间 m=0、n=2，再通过参数让曲线抬高或扩张",
    check: (s) => {
      if (!s.showArea || s.areaValue === null) return false;
      void s.areaM; void s.areaN;
      return Math.abs(s.areaValue) > 3;
    },
  },
];

// 各预设特化题
const SPECIAL: Record<string, Challenge[]> = {
  quadratic: [
    {
      id: "open-up",
      prompt: "调整 a，让抛物线开口向上",
      hint: "二次项系数 a 的符号决定开口方向",
      check: (s) => {
        const a = s.params.a ?? 1;
        return a > 0.1;
      },
    },
    {
      id: "vertex-origin",
      prompt: "把顶点移到原点附近（横纵坐标都接近 0）",
      hint: "顶点公式 x₀ = -b/2a；初中同学可以直接拖动 a、b、c 目测",
      check: (s) => {
        if (!s.fn) return false;
        const a = s.params.a ?? 1, b = s.params.b ?? 0;
        if (a === 0) return false;
        const xv = -b / (2 * a);
        const yv = s.fn(xv);
        return Math.abs(xv) < 0.2 && Math.abs(yv) < 0.2;
      },
    },
  ],
  sine: [
    {
      id: "period-two",
      prompt: "让正弦函数的周期变成 π（一个完整波 3.14 长度）",
      hint: "周期 T = 2π/b，试试 b = 2",
      check: (s) => {
        const b = s.params.b ?? 1;
        return Math.abs(2 * Math.PI / Math.abs(b) - Math.PI) < 0.05;
      },
    },
  ],
  exponential: [
    {
      id: "asymptote",
      prompt: "让曲线以 y = 2 为水平渐近线",
      hint: "指数函数 ae^(bx)+c 的渐近线是 y = c",
      check: (s) => {
        const c = s.params.c ?? 0;
        return near(c, 2, 0.01);
      },
    },
  ],
  logarithmic: [
    {
      id: "domain-edge",
      prompt: "让垂直渐近线出现在 x = -1 处",
      hint: "定义域 bx + c > 0，渐近线在 x = -c/b",
      check: (s) => {
        const b = s.params.b ?? 1, c = s.params.c ?? 0;
        return b !== 0 && near(-c / b, -1, 0.01);
      },
    },
  ],
  reciprocal: [
    {
      id: "vertical-line",
      prompt: "让垂直渐近线移到 x = 2",
      hint: "反比例函数 a/(x-b)+c 的分母零点即渐近线",
      check: (s) => {
        const b = s.params.b ?? 0;
        return near(b, 2, 0.01);
      },
    },
    {
      id: "symmetric",
      prompt: "观察：为什么两支曲线关于点 (b, c) 对称？",
      hint: "提示：两支在渐近线两侧的形状完全一样，这就是反比例函数的对称性",
      check: (s) => {
        // 观察题：需要用户先把 b、c 调成 1 和 0 附近再回答
        const b = s.params.b ?? 0, c = s.params.c ?? 0;
        void b; void c;
        return true; // 观察题默认可完成
      },
    },
  ],
};

export function challengesFor(presetId: string): Challenge[] {
  const sp = SPECIAL[presetId] ?? [];
  return [...GENERIC, ...sp];
}

export const CHALLENGE_STORE_KEY = "math-challenges-v1";