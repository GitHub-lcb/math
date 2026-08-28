"use client";
// 手写板：全屏 canvas 浮层，整屏圈画讲解
import { useEffect, useRef, useState } from "react";
import { IconPen, IconTrash, IconUndo, IconX } from "./icons";

type Stroke = { color: string; points: [number, number][] };

export default function AnnotationBoard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [color, setColor] = useState("#ffffff");
  const [toolbarPos, setToolbarPos] = useState({ x: 24, y: 72 });
  const draggingRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  const redraw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokesRef.current) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (!open) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    const ctx = cv.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    redraw();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const onResize = () => {
      const d2 = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * d2;
      cv.height = window.innerHeight * d2;
      const c2 = cv.getContext("2d");
      if (c2) c2.scale(d2, d2);
      redraw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!open) return null;

  const startStroke = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.setPointerCapture(e.pointerId);
    const rect = cv.getBoundingClientRect();
    strokesRef.current.push({ color, points: [[e.clientX - rect.left, e.clientY - rect.top]] });
  };
  const moveStroke = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const s = strokesRef.current[strokesRef.current.length - 1];
    if (s) s.points.push([e.clientX - rect.left, e.clientY - rect.top]);
    redraw();
  };

  return (
    <div className="annotationOverlay" role="dialog" aria-label="手写板">
      <canvas
        ref={canvasRef}
        className="annotationCanvas"
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        style={{ width: "100vw", height: "100vh" }}
      />
      <div
        className="annotationToolbar"
        style={{ left: toolbarPos.x, top: toolbarPos.y }}
        onPointerDown={(e) => {
          draggingRef.current = { startX: e.clientX, startY: e.clientY, origin: { ...toolbarPos } };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) {
            setToolbarPos({
              x: draggingRef.current.origin.x + (e.clientX - draggingRef.current.startX),
              y: draggingRef.current.origin.y + (e.clientY - draggingRef.current.startY),
            });
          }
        }}
        onPointerUp={() => (draggingRef.current = null)}
      >
        <div className="annotationToolbarTitle">
          <IconPen size={13} /> 手写板 <span className="annotationHint">按住空白处拖动工具栏</span>
        </div>
        <div className="annotationTools">
          {["#ffffff", "#fbbf24", "#f87171"].map((c) => (
            <button
              key={c}
              className={"colorDot" + (color === c ? " active" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={"笔颜色 " + c}
            />
          ))}
          <button className="iconBtn" onClick={() => { strokesRef.current.pop(); redraw(); }} aria-label="撤销上一笔" title="撤销">
            <IconUndo size={15} />
          </button>
          <button className="iconBtn" onClick={() => { strokesRef.current = []; redraw(); }} aria-label="清空笔迹" title="清空">
            <IconTrash size={15} />
          </button>
          <button className="iconBtn" onClick={onClose} aria-label="关闭手写板" title="关闭 (Esc)">
            <IconX size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}