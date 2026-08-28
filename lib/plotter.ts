// 绘制引擎：世界坐标 ↔ 屏幕坐标 + 网格/曲线/切线/面积/标注
import { niceTicks, fmt } from "./math";

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Palette {
  grid: string;      // 普通网格线
  gridMinor: string; // 次要网格线
  axis: string;      // 坐标轴
  label: string;     // 刻度文字
  accent: string;    // 主曲线
  accent2: string;   // 导数曲线
  tangent: string;   // 切线/割线
  area: string;      // 面积填充
  danger: string;    // 错误/警告
  white: string;     // 悬停标注底色
  paper: string;     // 画布背景（marker 空心填充）
  chipBg: string;    // 悬停信息芯片底色
}

export interface CanvasGeom {
  w: number;   // CSS 像素宽
  h: number;   // CSS 像素高
  vp: Viewport;
}

export interface DrawCtx extends CanvasGeom {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  palette: Palette;
}

export function toScreen(g: CanvasGeom, x: number, y: number): [number, number] {
  const sx = ((x - g.vp.xMin) / (g.vp.xMax - g.vp.xMin)) * g.w;
  const sy = g.h - ((y - g.vp.yMin) / (g.vp.yMax - g.vp.yMin)) * g.h;
  return [sx, sy];
}

export function toWorld(g: CanvasGeom, px: number, py: number): [number, number] {
  const x = g.vp.xMin + (px / g.w) * (g.vp.xMax - g.vp.xMin);
  const y = g.vp.yMax - (py / g.h) * (g.vp.yMax - g.vp.yMin);
  return [x, y];
}

const PEN = (d: DrawCtx, color: string, width: number, dash: number[] = []) => {
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = width;
  d.ctx.setLineDash(dash);
};

export function clear(d: DrawCtx): void {
  d.ctx.clearRect(0, 0, d.w, d.h);
}

export function drawGrid(d: DrawCtx): void {
  const { ctx, vp, w, h } = d;
  const { ticks: xTicks, step: xStep } = niceTicks(vp.xMin, vp.xMax, Math.max(8, Math.floor(w / 90)));
  const { ticks: yTicks, step: yStep } = niceTicks(vp.yMin, vp.yMax, Math.max(6, Math.floor(h / 70)));
  const [zxs, zys] = toScreen(d, 0, 0);

  ctx.save();
  ctx.font = "11px system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "middle";

  // 网格竖线
  PEN(d, d.palette.grid, 0.6);
  ctx.beginPath();
  for (const t of xTicks) {
    if (Math.abs(t) < xStep * 1e-9) continue; // 跳过轴
    const [sx] = toScreen(d, t, 0);
    ctx.moveTo(sx + 0.5, 0);
    ctx.lineTo(sx + 0.5, h);
  }
  // 网格横线
  for (const t of yTicks) {
    if (Math.abs(t) < yStep * 1e-9) continue;
    const [, sy] = toScreen(d, 0, t);
    ctx.moveTo(0, sy + 0.5);
    ctx.lineTo(w, sy + 0.5);
  }
  ctx.stroke();

  // 坐标轴
  PEN(d, d.palette.axis, 1.2);
  ctx.beginPath();
  if (zys >= 0 && zys <= h) {
    ctx.moveTo(0, zys + 0.5);
    ctx.lineTo(w, zys + 0.5);
  }
  if (zxs >= 0 && zxs <= w) {
    ctx.moveTo(zxs + 0.5, 0);
    ctx.lineTo(zxs + 0.5, h);
  }
  ctx.stroke();

  // 刻度标签
  ctx.fillStyle = d.palette.label;
  ctx.textAlign = "center";
  const labelFmt = (v: number) => {
    const a = Math.abs(v);
    if (a > 0 && a < 1) return fmt(v, 2);
    if (a > 10000 || (a > 0 && a < 0.001)) return v.toExponential(1);
    return fmt(v, 1).replace(/0$/, "");
  };
  for (const t of xTicks) {
    if (Math.abs(t) < xStep * 1e-9) continue;
    const [sx, sy] = toScreen(d, t, 0);
    const ly = Math.min(h - 8, Math.max(8, zys + 14));
    const lx = Math.min(w - 6, Math.max(6, sx));
    ctx.fillText(labelFmt(t), lx, ly);
  }
  ctx.textAlign = "right";
  for (const t of yTicks) {
    if (Math.abs(t) < yStep * 1e-9) continue;
    const [sx, sy] = toScreen(d, 0, t);
    const lx = Math.max(14, Math.min(w - 30, zxs - 8));
    if (lx < 14) continue;
    ctx.fillText(labelFmt(t), lx, Math.min(h - 4, Math.max(10, sy)));
  }
  // 原点
  ctx.textAlign = "left";
  ctx.fillText("O", Math.min(w - 14, zxs + 6), Math.max(10, Math.min(h - 10, zys + 12)));
  ctx.restore();
}

// 绘制函数曲线：逐像素采样，NaN/±Inf 处断开；可选 xRange 截断（入场生长动画）
export function drawCurve(d: DrawCtx, fn: (x: number) => number, color: string, width = 2.4, xRange?: [number, number]): void {
  const { ctx, w, vp } = d;
  ctx.save();
  PEN(d, color, width);
  ctx.lineJoin = "round";
  ctx.beginPath();
  let drawing = false;
  const pxStep = Math.max(1, Math.round(w / 1000));
  for (let px = 0; px <= w; px += pxStep) {
    const [wx] = toWorld(d, px, 0);
    if (xRange && (wx < xRange[0] || wx > xRange[1])) {
      drawing = false;
      continue;
    }
    const y = fn(wx);
    if (Number.isNaN(y) || !isFinite(y)) {
      drawing = false;
      continue;
    }
    if (y > vp.yMax * 40 || y < vp.yMin * 40) {
      drawing = false;
      continue;
    }
    const [, sy] = toScreen(d, wx, y);
    if (!drawing) {
      ctx.moveTo(px, sy);
      drawing = true;
    } else {
      ctx.lineTo(px, sy);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// 切线：由 (x0, y0) 与斜率延伸至视口边缘
export function drawLineThrough(d: DrawCtx, x0: number, y0: number, slope: number, color: string, width = 2, label?: string): void {
  const { ctx } = d;
  if (!isFinite(slope)) return;
  // 直线 y = slope*(x - x0) + y0，求与视口四边的交点
  const { vp, w, h } = d;
  const pts: [number, number][] = [];
  const push = (sx: number, sy: number) => {
    if (sx >= -2 && sx <= w + 2 && sy >= -2 && sy <= h + 2) pts.push([sx, sy]);
  };
  const xs = [vp.xMin, vp.xMax];
  for (const x of xs) {
    const y = slope * (x - x0) + y0;
    if (isFinite(y)) push(...toScreen(d, x, y));
  }
  const ys = [vp.yMin, vp.yMax];
  for (const y of ys) {
    const x = x0 + (y - y0) / slope;
    if (slope !== 0 && isFinite(x)) push(...toScreen(d, x, y));
  }
  if (pts.length < 2) return;
  ctx.save();
  PEN(d, color, width, [8, 5]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.stroke();
  if (label) {
    ctx.font = "12px system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const mid = pts[0];
    ctx.fillStyle = d.palette.label;
    ctx.textAlign = "left";
    ctx.fillText(label, mid[0] + 8, mid[1] - 8);
  }
  ctx.restore();
}

// 面积：中点黎曼和（有向面积），每子区间校验有限性
export function drawArea(d: DrawCtx, fn: (x: number) => number, a: number, b: number, color: string, progress = 1): number {
  const { ctx, w, h, vp } = d;
  if (!isFinite(a) || !isFinite(b) || a >= b) return NaN;
  const lo = Math.max(vp.xMin, a);
  const hi = Math.min(vp.xMax, progress >= 1 ? b : a + (b - a) * progress);
  if (lo >= hi) return NaN;
  const total = Math.abs(b - a);
  const bars = Math.max(20, Math.min(120, Math.floor(w / 8)));
  const dw = total / bars;
  ctx.save();
  let sum = 0;
  ctx.beginPath();
  for (let i = 0; i < bars; i++) {
    const x0 = a + i * dw;
    const x1 = x0 + dw;
    if (x1 < lo || x0 > hi) continue;
    const xm = (x0 + x1) / 2;
    const ym = fn(xm);
    if (!isFinite(ym)) continue;
    const [sxA, syA] = toScreen(d, x0, 0);
    const [sxB] = toScreen(d, x1, 0);
    const [, syM] = toScreen(d, xm, ym);
    const yZero = syA;
    const top = syM;
    if (isFinite(sxA) && isFinite(sxB) && isFinite(top)) {
      const x0p = Math.max(0, Math.min(w, sxA));
      const x1p = Math.max(0, Math.min(w, sxB));
      const yT = Math.max(0, Math.min(h, top));
      const yB = Math.max(0, Math.min(h, yZero));
      ctx.rect(x0p, yT, x1p - x0p, yB - yT);
      sum += ym * dw;
    }
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  return sum;
}

// 点标注：空心圆 + 可选的坐标文本
export function drawMarker(d: DrawCtx, x: number, y: number, label?: string, color?: string, size = 5): void {
  const { ctx } = d;
  if (!isFinite(x) || !isFinite(y)) return;
  const [sx, sy] = toScreen(d, x, y);
  if (sx < -20 || sx > d.w + 20 || sy < -20 || sy > d.h + 20) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, size, 0, Math.PI * 2);
  ctx.fillStyle = d.palette.paper ?? "#13171c";
  ctx.fill();
  ctx.strokeStyle = color ?? d.palette.tangent;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  if (label) {
    ctx.font = "12px system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = d.palette.label;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, sx + 9, sy - 4);
  }
  ctx.restore();
}

// 悬停坐标信息（右上角芯片）
export function drawHoverInfo(d: DrawCtx, text: string): void {
  const { ctx, w } = d;
  ctx.save();
  ctx.font = "12px system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = d.palette.chipBg ?? "#1a1f27";
  ctx.strokeStyle = d.palette.grid;
  ctx.lineWidth = 1;
  const x = w - tw - 24;
  const y = 10;
  roundRect(ctx, x, y, tw + 16, 26, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = d.palette.label;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 8, y + 13.5);
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
