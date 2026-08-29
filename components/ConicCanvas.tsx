"use client";
// 第三个实验：圆锥曲线画板（椭圆 / 双曲线 / 抛物线）
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as plt from "@/lib/plotter";
import { fmt } from "@/lib/math";

export type ConicType = "ellipse" | "hyperbola" | "parabola";

export interface ConicState {
  type: ConicType;
  a: number;
  b: number;
  p: number;
  t: number;
}

interface Props {
  state: ConicState;
  theme: "dark" | "light";
}

const TAU = Math.PI * 2;

export default function ConicCanvas({ state, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const palette = useMemo(() => {
    if (typeof window === "undefined") return null;
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    return {
      grid: g("--line-soft", "rgba(233,237,244,0.1)"),
      axis: g("--muted-ink", "#8b94a6"),
      label: g("--muted-ink", "#8b94a6"),
      accent: g("--accent", "#8b7bff"),
      red: g("--danger", "#f87171"),
      green: g("--green", "#4ade80"),
      warn: g("--warn", "#fbbf24"),
      infl: g("--infl", "#22d3ee"),
      ink: g("--ink", "#e9edf4"),
      paper: g("--paper", "#12151b"),
      chipBg: g("--paper-soft", "#181d25"),
    };
  }, [theme]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const e = es[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !palette || size.w <= 0) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = size.w;
    const h = size.h;
    const vp: plt.Viewport = { xMin: -8, xMax: 8, yMin: -(8 * h) / w, yMax: (8 * h) / w };
    const d: plt.DrawCtx = {
      ctx, w, h, dpr, vp,
      palette: {
        grid: palette.grid,
        gridMinor: palette.grid,
        axis: palette.axis,
        label: palette.label,
        accent: palette.accent,
        accent2: palette.green,
        tangent: palette.warn,
        area: "rgba(139,123,255,0.14)",
        danger: palette.red,
        white: palette.paper,
        paper: palette.paper,
        chipBg: palette.chipBg,
        warn: palette.warn,
        infl: palette.infl,
      } as plt.Palette,
    };
    plt.clear(d);
    plt.drawGrid(d);

    const { type, a, b, p, t } = state;
    ctx.font = "11px system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif";
    ctx.lineJoin = "round";

    const drawCurve = (pts: [number, number][], color: string, width = 2.4) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = plt.toScreen(d, pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    };
    const drawPoint = (x: number, y: number, color: string, r = 4.5, label?: string) => {
      const [sx, sy] = plt.toScreen(d, x, y);
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = palette.paper;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (label) {
        ctx.fillStyle = palette.label;
        ctx.textAlign = "left";
        ctx.fillText(label, sx + 9, sy - 5);
      }
    };
    const drawDashed = (pts: [number, number][], color: string, width = 1.4) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = plt.toScreen(d, pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    };
    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, width = 1.2, dash = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const [a1, b1] = plt.toScreen(d, x1, y1);
      const [a2, b2] = plt.toScreen(d, x2, y2);
      ctx.moveTo(a1, b1);
      ctx.lineTo(a2, b2);
      ctx.stroke();
      ctx.restore();
    };
    const chip = (lines: string[], color: string) => {
      ctx.save();
      ctx.font = "11px system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif";
      const lineH = 15;
      const cw2 = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
      const ch2 = lines.length * lineH + 12;
      const ccx = w - cw2 - 14;
      const ccy = 12;
      ctx.fillStyle = palette.chipBg;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ccx + 8, ccy);
      ctx.arcTo(ccx + cw2, ccy, ccx + cw2, ccy + ch2, 8);
      ctx.arcTo(ccx + cw2, ccy + ch2, ccx, ccy + ch2, 8);
      ctx.arcTo(ccx, ccy + ch2, ccx, ccy, 8);
      ctx.arcTo(ccx, ccy, ccx + cw2, ccy, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, ccx + 8, ccy + 6 + i * lineH + lineH / 2));
      ctx.restore();
    };

    if (type === "ellipse") {
      const aa = Math.max(0.5, a);
      const bb = Math.max(0.3, Math.min(b, aa * 0.99));
      const c = Math.sqrt(aa * aa - bb * bb);
      const e = c / aa;
      const pts: [number, number][] = [];
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * TAU;
        pts.push([aa * Math.cos(th), bb * Math.sin(th)]);
      }
      drawCurve(pts, palette.accent, 2.6);
      drawDashed([[-8, 0], [8, 0]], palette.label, 1);
      drawDashed([[0, vp.yMin], [0, vp.yMax]], palette.label, 1);
      if (e > 0.05) {
        drawLine(-aa / e, vp.yMin, -aa / e, vp.yMax, palette.green, 1.4, true);
        drawLine(aa / e, vp.yMin, aa / e, vp.yMax, palette.green, 1.4, true);
      }
      drawPoint(-c, 0, palette.warn, 4, "F₁");
      drawPoint(c, 0, palette.warn, 4, "F₂");
      const thP = t * TAU;
      const px = aa * Math.cos(thP);
      const py = bb * Math.sin(thP);
      drawLine(px, py, -c, 0, palette.red, 1.2, true);
      drawLine(px, py, c, 0, palette.red, 1.2, true);
      drawPoint(px, py, palette.accent, 5, "P");
      const d1 = Math.hypot(px + c, py);
      const d2 = Math.hypot(px - c, py);
      chip([
        "|PF₁| = " + fmt(d1, 3) + "   |PF₂| = " + fmt(d2, 3),
        "|PF₁|+|PF₂| = " + fmt(d1 + d2, 3) + "  ＝ 2a = " + fmt(2 * aa, 3),
        "离心率 e = c/a = " + fmt(e, 4),
      ], palette.accent);
    } else if (type === "hyperbola") {
      const aa = Math.max(0.6, a);
      const bb = Math.max(0.4, b);
      const c = Math.sqrt(aa * aa + bb * bb);
      const e = c / aa;
      const N = 160;
      for (const sgn of [1, -1]) {
        const pts: [number, number][] = [];
        for (let i = 0; i <= N; i++) {
          const u = -2.3 + (i / N) * 4.6;
          pts.push([sgn * aa * Math.cosh(u), bb * Math.sinh(u)]);
        }
        drawCurve(pts, palette.accent, 2.4);
      }
      drawLine(-8, (-bb / aa) * -8, 8, (-bb / aa) * 8, palette.green, 1.3, true);
      drawLine(-8, (bb / aa) * -8, 8, (bb / aa) * 8, palette.green, 1.3, true);
      drawPoint(-c, 0, palette.warn, 4, "F₁");
      drawPoint(c, 0, palette.warn, 4, "F₂");
      const u = -2.2 + t * 4.4;
      const px = aa * Math.cosh(u);
      const py = bb * Math.sinh(u);
      drawLine(px, py, -c, 0, palette.red, 1.2, true);
      drawLine(px, py, c, 0, palette.red, 1.2, true);
      drawPoint(px, py, palette.accent, 5, "P");
      const d1 = Math.hypot(px + c, py);
      const d2 = Math.hypot(px - c, py);
      chip([
        "|PF₁| = " + fmt(d1, 3) + "   |PF₂| = " + fmt(d2, 3),
        "|PF₁|−|PF₂| = " + fmt(d1 - d2, 3) + "  ＝ 2a = " + fmt(2 * aa, 3),
        "渐近线 y = ±(b/a)x   e = " + fmt(e, 4),
      ], palette.accent);
    } else {
      const pp = Math.max(0.3, p);
      const N = 160;
      const pts: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const y = -6 + (i / N) * 12;
        pts.push([(y * y) / (2 * pp), y]);
      }
      drawCurve(pts, palette.accent, 2.6);
      drawLine(-pp / 2, vp.yMin, -pp / 2, vp.yMax, palette.green, 1.4, true);
      drawPoint(pp / 2, 0, palette.warn, 4, "F");
      const py2 = -5.5 + t * 11;
      const px2 = (py2 * py2) / (2 * pp);
      drawLine(px2, py2, pp / 2, 0, palette.red, 1.2, true);
      drawLine(px2, py2, -pp / 2, py2, palette.warn, 1.2, true);
      drawPoint(px2, py2, palette.accent, 5, "P");
      const dF = Math.hypot(px2 - pp / 2, py2);
      const dD = px2 + pp / 2;
      chip([
        "|PF| = " + fmt(dF, 3) + "   到准线距离 = " + fmt(dD, 3),
        "抛物线定义：二者恒等 = " + (Math.abs(dF - dD) < 1e-9 ? "✓ 成立" : "计算中"),
      ], palette.accent);
    }  }, [palette, size, state]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || size.w <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    draw();
  }, [size, draw]);

  return (
    <div className="canvasWrap conicWrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="experimentCanvas"
        role="img"
        aria-label="圆锥曲线画布：椭圆、双曲线与抛物线的焦点、准线、离心率可视化"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}