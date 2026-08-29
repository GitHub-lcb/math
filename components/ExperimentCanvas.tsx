"use client";
// 旗舰实验画布：坐标系渲染 + 曲线/切线/导数/面积 + 平移缩放交互
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as plt from "@/lib/plotter";
import type { Viewport } from "@/lib/plotter";
import { fmt } from "@/lib/math";
import type { Stage } from "@/lib/catalog";
import { IconDownload, IconZoomIn, IconZoomOut, IconMaximize } from "./icons";

export interface CanvasProps {
  fn: ((x: number) => number) | null;
  fnDerivative: ((x: number) => number) | null;
  fnSecondDerivative: ((x: number) => number) | null;
  error: string | null;
  stage: Stage;
  showDerivative: boolean;
  showF2: boolean;
  showTangent: boolean;
  showArea: boolean;
  tangentX: number;
  secantX1: number;
  secantX2: number;
  areaM: number;
  areaN: number;
  slopeAtPoint: (x: number) => number;
  secantSlope: (x1: number, x2: number) => number;
  resetToken: number;
  onSetTangentX: (x: number) => void;
  onSetSecantX: (x1: number, x2: number) => void;
  theme: "dark" | "light";
  demoMode?: "params" | "tangent" | null;
  annotations?: { type: "zero" | "extrema" | "inflection"; x: number; y: number }[];
}

const INIT_VP: Viewport = { xMin: -8, xMax: 8, yMin: -5.5, yMax: 5.5 };

export default function ExperimentCanvas(props: CanvasProps) {
  const {
    fn, fnDerivative, fnSecondDerivative, error, stage, showDerivative, showF2, showTangent, showArea,
    tangentX, secantX1, secantX2, areaM, areaN, slopeAtPoint, secantSlope, resetToken,
    onSetTangentX, onSetSecantX, theme, demoMode, annotations,
  } = props;
  const senior = stage === "senior";
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vpRef = useRef<Viewport>({ ...INIT_VP });
  const [, forceRender] = useState(0); // 视口变化触发重绘的辅助 state
  const dragState = useRef<{ startX: number; startY: number; vp: Viewport; moved: boolean } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  // 入场生长 / 面积刷入 / 演示轨迹（仅画布内部动画，不触发 React 重渲染）
  const growthRef = useRef(1);
  const areaProgRef = useRef(1);
  const trailRef = useRef<[number, number][]>([]); // 切点演示轨迹
  const demoTangentRef = useRef(0); // 当前演示切点 x（绘制用）
  const lastDemoSyncRef = useRef(0);

  // 主题取色（CSS 变量 → 调色板）
  const palette = useMemo(() => {
    if (typeof window === "undefined") return null;
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string, fallback: string) => {
      const v = cs.getPropertyValue(n).trim();
      return v || fallback;
    };
    return {
      grid: g("--line-soft", "rgba(232,235,244,0.10)"),
      gridMinor: g("--line-soft", "rgba(232,235,244,0.10)"),
      axis: g("--muted-ink", "#8a93a3"),
      label: g("--muted-ink", "#8a93a3"),
      accent: g("--accent", "#7c5cff"),
      accent2: g("--green", "#4ade80"),
      tangent: g("--warn", "#fbbf24"),
      area: g("--area-fill", "rgba(124,92,255,0.18)"),
      danger: g("--danger", "#f87171"),
      warn: g("--warn", "#fbbf24"),
      infl: g("--infl", "#22d3ee"),
      white: g("--paper", "#13171c"),
      paper: g("--paper", "#13171c"),
      chipBg: g("--paper-soft", "#1a1f27"),
    } as plt.Palette;
  }, [theme]);

  useEffect(() => {
    vpRef.current = { ...INIT_VP };
    forceRender((x) => x + 1);
  }, [resetToken]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !palette || size.w <= 0) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const d: plt.DrawCtx = { ctx, w: size.w, h: size.h, dpr, vp: vpRef.current, palette };
    const growth = growthRef.current;
    const xSpan = vpRef.current.xMax - vpRef.current.xMin;
    const xRange: [number, number] =
      growth >= 1 ? [vpRef.current.xMin, vpRef.current.xMax] : [vpRef.current.xMin, vpRef.current.xMin + xSpan * growth];
    plt.clear(d);
    plt.drawGrid(d);
    if (fn) {
      if (senior && showArea) {
        const v = plt.drawArea(d, fn, Math.min(areaM, areaN), Math.max(areaM, areaN), palette.area, areaProgRef.current);
        areaValueRef.current = Number.isFinite(v) ? v : null;
      }
      // 切点演示轨迹（淡色尾迹）
      if (demoMode === "tangent" && trailRef.current.length > 1) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = palette.tangent;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < trailRef.current.length; i++) {
          const [tx, ty] = trailRef.current[i];
          const [sx, sy] = plt.toScreen(d, tx, ty);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      }
      // 曲线辉光（暗色主题霓虹感）——仅入场完成后
      if (theme === "dark" && growth >= 1) {
        plt.drawGlow(d, xRange[0], xRange[1], fn, palette.accent);
      }
      plt.drawCurve(d, fn, palette.accent, 2.6, xRange);
      // 零点 / 极值点标注
      if (annotations && annotations.length > 0) {
        for (const a of annotations) {
          const y = fn(a.x);
          if (!Number.isFinite(y)) continue;
          if (a.type === "zero") {
            plt.drawMarker(d, a.x, y, "零点", palette.accent2, 3.6);
          } else if (a.type === "extrema") {
            plt.drawMarker(d, a.x, y, "极值", palette.warn, 3.6);
          } else if (a.type === "inflection") {
            plt.drawMarker(d, a.x, y, "拐点", palette.infl, 3.6);
          }
        }
      }
      if (senior && showDerivative && fnDerivative) {
        plt.drawCurve(d, fnDerivative, palette.accent2, 1.8);
        // 标注导数曲线
        ctx.save();
        ctx.font = "12px system-ui, sans-serif";
        const [lx, ly] = plt.toScreen(d, vpRef.current.xMin + (vpRef.current.xMax - vpRef.current.xMin) * 0.02, vpRef.current.yMax - (vpRef.current.yMax - vpRef.current.yMin) * 0.06);
        ctx.fillStyle = palette.accent2;
        ctx.textAlign = "left";
        ctx.fillText("f′(x)", lx, ly);
        ctx.restore();
      }
      if (senior && showDerivative && showF2 && fnSecondDerivative) {
        // 二阶导曲线（虚线，防与 f' 混淆）
        ctx.save();
        ctx.setLineDash([6, 5]);
        plt.drawCurve(d, fnSecondDerivative, palette.infl, 1.6);
        ctx.setLineDash([]);
        const [lx2, ly2] = plt.toScreen(d, vpRef.current.xMin + (vpRef.current.xMax - vpRef.current.xMin) * 0.02, vpRef.current.yMin + (vpRef.current.yMax - vpRef.current.yMin) * 0.06);
        ctx.fillStyle = palette.infl;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("f″(x)", lx2, ly2);
        ctx.restore();
      }
      if (showTangent && senior) {
        // 演示模式：切线跟随动画切点
        const demoX = demoMode === "tangent" ? demoTangentRef.current : NaN;
        const x0 = Number.isNaN(demoX) || demoMode !== "tangent" ? tangentX : demoX;
        {
          const y0 = fn(x0);
          const slope = slopeAtPoint(x0);
          if (Number.isFinite(y0)) {
            plt.drawProjection(d, x0, y0, palette.tangent);
            if (Number.isFinite(slope) && Math.abs(slope) < 1e5) {
              plt.drawLineThrough(d, x0, y0, slope, palette.tangent, 2, "");
              plt.drawMarker(d, x0, y0, "P", palette.tangent);
              plt.drawChip(
                d, x0, y0,
                ["x₀ = " + fmt(x0, 2), "f(x₀) = " + fmt(y0, 3), "k = " + fmt(slope, 3)],
                palette.tangent
              );
            } else {
              plt.drawMarker(d, x0, y0, "斜率接近垂直", palette.tangent);
            }
          }
          // 记录演示轨迹
          if (demoMode === "tangent" && Number.isFinite(y0)) {
            trailRef.current.push([x0, y0]);
            if (trailRef.current.length > 500) trailRef.current.shift();
          }
        }
      } else if (showTangent) {
        const y1 = fn(secantX1);
        const y2 = fn(secantX2);
        if (Number.isFinite(y1) && Number.isFinite(y2) && Math.abs(secantX2 - secantX1) > 1e-6) {
          const s = secantSlope(secantX1, secantX2);
          plt.drawLineThrough(d, secantX1, y1, s, palette.tangent, 2, "");
          plt.drawMarker(d, secantX1, y1, "B" + fmt(secantX1, 1), palette.tangent, 4.5);
          plt.drawMarker(d, secantX2, y2, "A" + fmt(secantX2, 1), palette.tangent, 4.5);
        }
      }
      if (hover) {
        const hy = fn(hover.x);
        if (Number.isFinite(hy)) {
          // 悬停处切线预览（淡色）
          const hs = slopeAtPoint(hover.x);
          if (Number.isFinite(hs) && Math.abs(hs) < 1e5 && !dragState.current?.moved) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            plt.drawLineThrough(d, hover.x, hy, hs, palette.tangent, 1.4, "");
            ctx.restore();
            plt.drawMarker(d, hover.x, hy, "", palette.tangent, 3);
          }
          plt.drawHoverInfo(d, "(" + fmt(hover.x, 2) + ", " + fmt(hy, 2) + ")");
        }
      }
    }
  }, [fn, fnDerivative, error, senior, showDerivative, showTangent, showArea, tangentX, secantX1, secantX2, areaM, areaN, slopeAtPoint, secantSlope, palette, size, hover, resetToken]);

  const areaValueRef = useRef<number | null>(null);
  void areaValueRef;

  // 尺寸监听
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 画布尺寸同步（dpr）
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || size.w <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    draw();
  }, [size, draw]);

  // 入场生长动画：曲线从左侧"生长"至全宽（mount 或 resetToken 后一次，1.25s）
  useEffect(() => {
    if (size.w === 0) return;
    const t0 = performance.now();
    const DUR = 1250;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    growthRef.current = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      growthRef.current = 0.35 + 0.65 * easeOut(p); // 起点 35% 成熟度，避免空屏太久
      drawRef.current();
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else growthRef.current = 1;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      growthRef.current = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, resetToken]);

  // 面积"刷入"动画：开关开启或区间变化时，从 m 向 n 填充（700ms）
  useEffect(() => {
    if (!showArea) {
      areaProgRef.current = 1;
      return;
    }
    const t0 = performance.now();
    const DUR = 700;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    areaProgRef.current = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      areaProgRef.current = easeOut(p);
      drawRef.current();
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else areaProgRef.current = 1;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      areaProgRef.current = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArea, areaM, areaN]);

  // drawRef 保持最新 draw（动画循环用）
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // 切线演示：demoMode === "tangent" 时推进动画切点（每帧 30fps 节流同步）
  useEffect(() => {
    if (demoMode !== "tangent") {
      trailRef.current = [];
      return;
    }
    const t0 = performance.now();
    const DUR = 4200;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let lastSync = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const x = -6.5 + 13 * ease(p);
      demoTangentRef.current = x;
      if (now - lastSync > 160) {
        lastSync = now;
        onSetTangentX(+x.toFixed(3));
      }
      drawRef.current();
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      trailRef.current = [];
      demoTangentRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  // 交互：拖拽平移（≥3px 判定） / 点击设切点 / 滚轮缩放
  const onPointerDown = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, vp: { ...vpRef.current }, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const d = dragState.current;
    if (d) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) >= 3 || Math.abs(dy) >= 3) d.moved = true;
      if (d.moved) {
        const vw = d.vp.xMax - d.vp.xMin;
        const vh = d.vp.yMax - d.vp.yMin;
        vpRef.current = {
          xMin: d.vp.xMin - (dx / rect.width) * vw,
          xMax: d.vp.xMax - (dx / rect.width) * vw,
          yMin: d.vp.yMin + (dy / rect.height) * vh,
          yMax: d.vp.yMax + (dy / rect.height) * vh,
        };
        forceRender((x) => x + 1);
      }
      return;
    }
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const [wx] = plt.toWorld({ w: rect.width, h: rect.height, vp: vpRef.current }, localX, localY);
    setHover({ x: wx, y: localY });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragState.current;
    dragState.current = null;
    if (!d || d.moved || !fn) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const [wx] = plt.toWorld({ w: rect.width, h: rect.height, vp: vpRef.current }, localX, localY);
    if (senior) onSetTangentX(+wx.toFixed(4));
    else {
      // 初中：点击设置距离更近的割点
      if (Math.abs(wx - secantX1) <= Math.abs(wx - secantX2)) onSetSecantX(+wx.toFixed(4), secantX2);
      else onSetSecantX(secantX1, +wx.toFixed(4));
    }
  };
  const onPointerLeave = () => setHover(null);
  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1 / 1.25 : 1.25;
    zoom(factor);
  };
  const zoom = (factor: number) => {
    const vp = vpRef.current;
    const cx = (vp.xMin + vp.xMax) / 2;
    const cy = (vp.yMin + vp.yMax) / 2;
    const nw = (vp.xMax - vp.xMin) * factor;
    const nh = (vp.yMax - vp.yMin) * factor;
    vpRef.current = { xMin: cx - nw / 2, xMax: cx + nw / 2, yMin: cy - nh / 2, yMax: cy + nh / 2 };
    forceRender((x) => x + 1);
  };
  const resetView = () => {
    vpRef.current = { ...INIT_VP };
    forceRender((x) => x + 1);
  };
  const exportPng = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    try {
      const url = cv.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "函数图像与导数探究.png";
      a.click();
    } catch {
      /* ignore */
    }
  };

  // 悬停坐标转世界坐标依赖 palette；palette 可能为 null（SSR 首帧），用哨兵
  void rafRef;

  return (
    <div className="canvasWrap" ref={containerRef}>
      {error ? (
        <div className="canvasError" role="alert">
          <p>表达式无效：{error}</p>
          <p className="canvasErrorSub">已保留上一条有效曲线，请修改表达式</p>
        </div>
      ) : size.w === 0 ? (
        <div className="canvasLoading">正在加载实验工作区…</div>
      ) : null}
      <canvas
        ref={canvasRef}
        className="experimentCanvas"
        role="img"
        aria-label="函数图像画布：拖拽平移，点击设置切点，滚轮缩放"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        style={{ cursor: dragState.current?.moved ? "grabbing" : "crosshair" }}
      />
      <div className="canvasToolbar">
        <button onClick={() => zoom(1 / 1.25)} aria-label="放大" title="放大"><IconZoomIn size={15} /></button>
        <button onClick={() => zoom(1.25)} aria-label="缩小" title="缩小"><IconZoomOut size={15} /></button>
        <button onClick={resetView} aria-label="适应窗口" title="复位视图"><IconMaximize size={15} /></button>
        <button onClick={exportPng} aria-label="导出图片" title="导出当前图像为 PNG"><IconDownload size={15} /></button>
      </div>
      {senior && showArea && areaValueRef.current != null && (
        <div className="areaBadge">∫ ≈ {fmt(areaValueRef.current, 3)}（有向面积）</div>
      )}
    </div>
  );
}