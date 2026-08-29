"use client";
// 第二个实验：单位圆与三角函数线 ＋ 正弦/余弦波形联动
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/math";

export interface TrigCanvasProps {
  theta: number;         // 弧度
  onTheta: (t: number) => void;
  showCos: boolean;
  theme: "dark" | "light";
  playing: boolean;
  onTogglePlay: () => void;
}

const TAU = Math.PI * 2;

export default function TrigCanvas(props: TrigCanvasProps) {
  const { theta, onTheta, showCos, theme, playing, onTogglePlay } = props;
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
    ctx.clearRect(0, 0, size.w, size.h);
    const w = size.w, h = size.h;
    const wLeft = Math.max(220, w * 0.42);

    ctx.font = "11px system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif";

    // ===== 左栏：单位圆 =====
    const cx = wLeft / 2;
    const cy = h / 2;
    const r = Math.max(60, Math.min(wLeft / 2 - 28, h / 2 - 40));
    // 坐标轴
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, cx - r - 18), cy);
    ctx.lineTo(Math.min(wLeft, cx + r + 18), cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, Math.max(0, cy - r - 18));
    ctx.lineTo(cx, Math.min(h, cy + r + 18));
    ctx.stroke();
    // 单位圆
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    // 网格十字刻度
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    [0.5, -0.5].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(cx + v * r * 2, cy - 6);
      ctx.lineTo(cx + v * r * 2, cy + 6);
      ctx.stroke();
    });
    [0.5, -0.5].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + v * r * 2);
      ctx.lineTo(cx + 6, cy + v * r * 2);
      ctx.stroke();
    });
    ctx.fillStyle = palette.label;
    ctx.textAlign = "center";
    ctx.fillText("x", Math.min(wLeft - 12, cx + r + 10), cy - 6);
    ctx.fillText("y", cx + 8, Math.max(12, cy - r - 8));
    ctx.fillText("1", cx + r + 2, cy + 16);
    ctx.fillText("−1", cx - r - 2, cy + 16);
    ctx.fillText("−1", cx + 8, cy + r + 14);
    ctx.fillText("1", cx + 8, cy - r + 4);

    const s = Math.sin(theta);
    const c = Math.cos(theta);
    const t = Math.tan(theta);
    const Px = cx + c * r;
    const Py = cy - s * r;
    // 扇形
    ctx.fillStyle = palette.accent + "2a";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * 0.96, -Math.PI / 2, -Math.PI / 2 + theta, false);
    ctx.closePath();
    ctx.fill();
    // θ 射线
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(Px, Py);
    ctx.stroke();
    // sin 投影（红虚线）
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, Py);
    ctx.lineTo(Px, Py);
    ctx.stroke();
    // cos 投影（绿虚线）
    ctx.strokeStyle = palette.green;
    ctx.beginPath();
    ctx.moveTo(Px, cy);
    ctx.lineTo(Px, Py);
    ctx.stroke();
    ctx.setLineDash([]);
    // tan 线（若有限）
    if (Math.abs(c) > 0.05) {
      const Tpx = cx + r;
      const Ty = cy - t * r;
      if (Math.abs(t) < 3.4) {
        ctx.strokeStyle = palette.warn;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(Tpx, Ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(Tpx, Ty, 3.4, 0, TAU);
        ctx.fillStyle = palette.warn;
        ctx.fill();
        ctx.fillStyle = palette.label;
        ctx.fillText("T", Tpx + 8, Ty - 4);
      }
    }
    // P 点
    ctx.beginPath();
    ctx.arc(Px, Py, 5.5, 0, TAU);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.strokeStyle = palette.paper;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.fillText("P", Px + 10, Py - 6);
    // sin/cos 标签
    ctx.fillStyle = palette.red;
    ctx.fillText("sin θ", Math.max(6, cx - 46), Py > cy ? cy + 16 : Py - 6);
    ctx.fillStyle = palette.green;
    ctx.fillText("cos θ", Px, cy + 16);
    // θ 弧标
    ctx.strokeStyle = palette.infl;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, -Math.PI / 2, -Math.PI / 2 + theta, false);
    ctx.stroke();
    ctx.fillStyle = palette.infl;
    const la = -Math.PI / 2 + theta / 2;
    ctx.fillText("θ = " + fmt(theta, 2), cx + Math.cos(la) * r * 0.42, cy + Math.sin(la) * r * 0.42 + 4);

    // ===== 右栏：波形 =====
    const wx0 = wLeft + 30;
    const wx1 = w - 14;
    const amp = (h / 2) * 0.72;
    const my = h / 2;
    const toX = (x: number) => wx0 + (x / TAU) * (wx1 - wx0);
    const toY = (v: number) => my - v * amp;
    // 网格水平线
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    [-1, -0.5, 0.5, 1].forEach((v) => {
      if (v !== 0) {
        ctx.beginPath();
        ctx.moveTo(wx0, toY(v));
        ctx.lineTo(wx1, toY(v));
        ctx.fillStyle = palette.label;
        ctx.fillText(String(v), wx1 - 8, toY(v) - 3);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx0, my);
    ctx.lineTo(wx1, my);
    ctx.stroke();
    // x 刻度（π 分数）
    for (let k = 0; k <= 8; k++) {
      const xv = (k / 8) * TAU;
      const px = toX(xv);
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(px, my - 5);
      ctx.lineTo(px, my + 5);
      ctx.stroke();
      ctx.fillStyle = palette.label;
      ctx.fillText(fracLabel(k), px, my + 14);
    }
    ctx.fillText("x", wx1 - 12, my + 14);
    // sin 曲线
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const xv = (i / 160) * TAU;
      const px = toX(xv);
      const py = toY(Math.sin(xv));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // cos 曲线
    if (showCos) {
      ctx.strokeStyle = palette.green;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const xv = (i / 160) * TAU;
        const px = toX(xv);
        const py = toY(Math.cos(xv));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 当前 θ 贯穿线 + 交点
    const cxw = toX(theta);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cxw, 0);
    ctx.lineTo(cxw, h);
    ctx.stroke();
    ctx.setLineDash([]);
    const siY = toY(s);
    const coY = toY(c);
    ctx.beginPath();
    ctx.arc(cxw, siY, 4.4, 0, TAU);
    ctx.fillStyle = palette.red;
    ctx.fill();
    if (showCos) {
      ctx.beginPath();
      ctx.arc(cxw, coY, 4.4, 0, TAU);
      ctx.fillStyle = palette.green;
      ctx.fill();
    }
    // 图例
    ctx.textAlign = "left";
    ctx.fillStyle = palette.red;
    ctx.fillText("y = sin x", wx0 + 8, 16);
    if (showCos) {
      ctx.fillStyle = palette.green;
      ctx.fillText("y = cos x", wx0 + 8, 32);
    }
    // 值芯片
    const chipLines = [
      "sin θ = " + fmt(s, 3),
      "cos θ = " + fmt(c, 3),
      "tan θ = " + (Math.abs(c) < 0.03 ? "无定义" : fmt(t, 3)),
    ];
    ctx.font = "11px system-ui, sans-serif";
    const lineH = 15;
    const cw2 = Math.max(...chipLines.map((l) => ctx.measureText(l).width)) + 16;
    const ch2 = chipLines.length * lineH + 12;
    const ccx = wx1 - cw2 - 10;
    const ccy = h - ch2 - 10;
    ctx.fillStyle = palette.chipBg;
    ctx.strokeStyle = palette.accent;
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
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    chipLines.forEach((l, i) => {
      ctx.fillStyle = [palette.red, palette.green, palette.warn][i];
      ctx.fillText(l, ccx + 8, ccy + 6 + i * lineH + lineH / 2);
    });
    ctx.textBaseline = "alphabetic";
  }, [palette, size, theta, showCos]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || size.w <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    draw();
  }, [size, draw]);

  // 点击单位圆设置 θ
  const onPointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wLeft = Math.max(220, size.w * 0.42);
    const px = e.clientX - rect.left;
    if (px > wLeft - 10) return;
    const cx = wLeft / 2;
    const cy = size.h / 2;
    const r = Math.max(60, Math.min(wLeft / 2 - 28, size.h / 2 - 40));
    const dx = (px - cx) / r;
    const dy = (cy - (e.clientY - rect.top)) / r;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1.35) return;
    let ang = Math.atan2(dy, dx);
    if (ang < 0) ang += TAU;
    onTheta(+ang.toFixed(4));
  };

  function fracLabel(k: number): string {
    if (k === 0) return "0";
    if (k === 4) return "π";
    if (k === 8) return "2π";
    if (k % 2 === 1) return (k === 2 ? "" : k === 6 ? "3π/2" : "π/" + (8 / k) * 2);
    return (k / 4 === 1 ? "π/2" : "π");
  }

  return (
    <div className="canvasWrap trigWrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="experimentCanvas"
        role="img"
        aria-label="单位圆与三角函数线画布：点击单位圆设置角度"
        onPointerDown={onPointerDown}
        style={{ cursor: "crosshair", touchAction: "none" }}
      />
      <div className="canvasToolbar">
        <button onClick={onTogglePlay} aria-label={playing ? "暂停旋转" : "开始旋转"} title={playing ? "暂停旋转" : "开始旋转（角度自动增加）"}>
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={() => onTheta(0)} aria-label="角度归零" title="θ = 0">↺</button>
      </div>
    </div>
  );
}