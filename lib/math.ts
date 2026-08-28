// 通用数学工具
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// 取 1/2/5×10^k 的「漂亮」刻度步长
export function roundNice(v: number): number {
  if (!isFinite(v) || v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  if (f < 1.5) return base;
  if (f < 3.5) return 2 * base;
  if (f < 7.5) return 5 * base;
  return 10 * base;
}

// 针对 [min,max] 生成约 target 个的漂亮刻度
export function niceTicks(min: number, max: number, target = 10): { ticks: number[]; step: number } {
  if (!isFinite(min) || !isFinite(max) || max <= min) return { ticks: [], step: 1 };
  const rawStep = (max - min) / target;
  const step = roundNice(rawStep);
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step * 1e-9; v += step) {
    // 消浮点误差
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  }
  return { ticks, step };
}

// 格式化数值：去掉无意义的 0（1.50 → 1.5）
export function fmt(v: number, digits = 2): string {
  if (!isFinite(v)) return "—";
  const s = v.toFixed(digits);
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
