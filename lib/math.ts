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

// 数值求零点（二分法）：在 [lo,hi] 均匀采样，符号变化处二分收敛
export function findZeros(fn: (x: number) => number, lo: number, hi: number, samples = 240, max = 8): number[] {
  const out: number[] = [];
  const dx = (hi - lo) / samples;
  let prevX = lo;
  let prevY = fn(lo);
  for (let i = 1; i <= samples; i++) {
    const x = lo + dx * i;
    const y = fn(x);
    if (!isFinite(prevY) || !isFinite(y)) {
      prevX = x; prevY = y;
      continue;
    }
    if (y === 0) {
      // 精确命中零点
      if (out.length === 0 || Math.abs(x - out[out.length - 1]) > dx * 0.5) out.push(x);
    } else if (prevY !== 0 && Math.sign(prevY) !== Math.sign(y)) {
      // 二分精化
      let a = prevX;
      let b = x;
      for (let k = 0; k < 40; k++) {
        const mid = (a + b) / 2;
        const ym = fn(mid);
        if (!isFinite(ym)) break;
        if (Math.sign(ym) === Math.sign(prevY)) a = mid;
        else b = mid;
      }
      const root = (a + b) / 2;
      if (out.length === 0 || Math.abs(root - out[out.length - 1]) > dx * 0.5) {
        out.push(root);
      }
    }
    prevX = x;
    prevY = y;
    if (out.length >= max) break;
  }
  return out;
}



// 数值求拐点：f'' 变号处（跳过断点）
export function findInflections(fn2: (x: number) => number, lo: number, hi: number, samples = 300, max = 4): number[] {
  const out: number[] = [];
  const dx = (hi - lo) / samples;
  let prevX = lo;
  let prevD2 = fn2(lo);
  for (let i = 1; i <= samples; i++) {
    const x = lo + dx * i;
    const d2 = fn2(x);
    if (!isFinite(prevD2) || !isFinite(d2)) {
      prevX = x; prevD2 = d2;
      continue;
    }
    if (d2 === 0) {
      if (out.length === 0 || Math.abs(x - out[out.length - 1]) > dx * 0.6) out.push(x);
    } else if (prevD2 !== 0 && Math.sign(prevD2) !== Math.sign(d2)) {
      // 线性插值精化
      const t = prevD2 / (prevD2 - d2);
      const root = prevX + t * dx;
      if (out.length === 0 || Math.abs(root - out[out.length - 1]) > dx * 0.6) {
        out.push(+root.toFixed(5));
      }
    }
    prevX = x;
    prevD2 = d2;
    if (out.length >= max) break;
  }
  return out;
}

// 数值求极值点：扫描导数符号变化（f' 由中心差分近似）
export function findExtrema(fn: (x: number) => number, fnDeriv: (x: number) => number, lo: number, hi: number, samples = 260, max = 5): number[] {
  const out: number[] = [];
  const dx = (hi - lo) / samples;
  let prevX = lo;
  let prevD = fnDeriv(lo);
  for (let i = 1; i <= samples; i++) {
    const x = lo + dx * i;
    const d = fnDeriv(x);
    if (!isFinite(prevD) || !isFinite(d)) {
      prevX = x; prevD = d;
      continue;
    }
    if (prevD !== 0 && d !== 0 && Math.sign(prevD) !== Math.sign(d)) {
      // 抛物线插值精化极值位置
      const x0 = prevX;
      const x1 = x;
      const x2 = Math.min(hi, x1 + dx);
      const f0 = fn(x0);
      const f1 = fn(x1);
      const f2 = fn(x2);
      const denom = f0 - 2 * f1 + f2;
      let peak: number;
      if (isFinite(denom) && denom !== 0) {
        const t = 0.5 * (f0 - f2) / denom;
        peak = x1 + t * dx;
      } else {
        peak = x1;
      }
      if (out.length === 0 || Math.abs(peak - out[out.length - 1]) > dx * 0.6) {
        out.push(+peak.toFixed(5));
      }
    }
    prevX = x;
    prevD = d;
    if (out.length >= max) break;
  }
  return out;
}
