"use client";
// 圆锥曲线参数面板：类型切换 / 参数滑块 / 动点 / 关键量
import { fmt } from "@/lib/math";
import type { ConicType, ConicState } from "./ConicCanvas";

interface Props {
  state: ConicState;
  onChange: (s: ConicState) => void;
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="sliderRow">
      <span className="sliderLabel">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="sliderValue">{fmt(value, 2)}</span>
    </label>
  );
}

export default function ConicPanel({ state, onChange }: Props) {
  const { type, a, b, p, t } = state;
  const set = (patch: Partial<ConicState>) => onChange({ ...state, ...patch });

  // 派生量
  let e = 0;
  let c = 0;
  if (type === "ellipse") {
    const aa = Math.max(0.5, a), bb = Math.max(0.3, Math.min(b, aa * 0.99));
    c = Math.sqrt(aa * aa - bb * bb);
    e = c / aa;
  } else if (type === "hyperbola") {
    const aa = Math.max(0.6, a), bb = Math.max(0.4, b);
    c = Math.sqrt(aa * aa + bb * bb);
    e = c / aa;
  }

  const types: { id: ConicType; label: string }[] = [
    { id: "ellipse", label: "椭圆" },
    { id: "hyperbola", label: "双曲线" },
    { id: "parabola", label: "抛物线" },
  ];

  return (
    <div className="paramPanel">
      <div className="conicTypeSwitch" role="group" aria-label="曲线类型">
        {types.map((x) => (
          <button
            key={x.id}
            className={"conicTypePill" + (type === x.id ? " active" : "")}
            aria-pressed={type === x.id}
            onClick={() => set({ type: x.id, t: 0.5 })}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="sliderGroup">
        {type === "parabola" ? (
          <SliderRow label="焦准距 p =" value={p} min={0.3} max={4} step={0.05} onChange={(v) => set({ p: v })} />
        ) : (
          <>
            <SliderRow label="半长轴 a =" value={a} min={0.5} max={6} step={0.1} onChange={(v) => set({ a: v })} />
            <SliderRow label="半短轴 b =" value={b} min={0.3} max={6} step={0.1} onChange={(v) => set({ b: v })} />
          </>
        )}
        <SliderRow label="动点 P =" value={t} min={0} max={1} step={0.005} onChange={(v) => set({ t: v })} />
      </div>

      <div className="valueCards">
        <div className="valueCard warn"><span>离心率 e</span><b>{type === "parabola" ? "1（定义）" : fmt(e, 3)}</b></div>
        <div className="valueCard red"><span>焦点距 c</span><b>{type === "parabola" ? fmt(p / 2, 2) : fmt(c, 3)}</b></div>
        <div className="valueCard green"><span>焦点位置</span><b>{type === "parabola" ? "(" + fmt(p / 2, 2) + ", 0)" : "(±" + fmt(c, 2) + ", 0)"}</b></div>
      </div>
      <p className="paramHint">椭圆 e&lt;1 · 双曲线 e&gt;1 · 抛物线 e=1（几何定义三兄弟）</p>
    </div>
  );
}