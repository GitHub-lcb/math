"use client";
// 单位圆实验参数面板：角度滑块 / 播放 / 数值卡 / 曲线开关
import { fmt } from "@/lib/math";

function frac(v: number): string {
  // 把弧度转为好看的 π 分数文本
  const div = Math.PI;
  const k = v / div;
  const round = Math.round(k * 48) / 48;
  const eps = 0.002;
  const table: [number, string][] = [
    [1 / 6, "π/6"], [1 / 4, "π/4"], [1 / 3, "π/3"], [1 / 2, "π/2"], [2 / 3, "2π/3"], [3 / 4, "3π/4"],
    [5 / 6, "5π/6"], [1, "π"], [7 / 6, "7π/6"], [5 / 4, "5π/4"], [4 / 3, "4π/3"], [3 / 2, "3π/2"],
    [5 / 3, "5π/3"], [7 / 4, "7π/4"], [11 / 6, "11π/6"], [2, "2π"],
    [0, "0"],
  ];
  for (const [r2, s] of table) {
    if (Math.abs(round - r2) < eps) return s;
  }
  return fmt(v, 2);
}

export default function TrigPanel({
  theta, onTheta, playing, onTogglePlay, showCos, onShowCos,
}: {
  theta: number;
  onTheta: (t: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  showCos: boolean;
  onShowCos: (v: boolean) => void;
}) {
  const deg = (theta * 180) / Math.PI;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const t = Math.tan(theta);
  return (
    <div className="paramPanel trigPanel">
      <div className="angleReadout">
        <span className="angleBig">θ = {frac(theta)}</span>
        <span className="angleDeg">{fmt(deg, 1)}°</span>
      </div>
      <label className="sliderRow">
        <span className="sliderLabel">θ =</span>
        <input
          type="range"
          min={0}
          max={360}
          step={0.5}
          value={deg}
          onChange={(e) => onTheta((parseFloat(e.target.value) * Math.PI) / 180)}
          aria-label="角度 θ（度）"
        />
        <span className="sliderValue">{fmt(deg, 1)}°</span>
      </label>
      <div className="valueCards">
        <div className="valueCard red"><span>sin θ</span><b>{fmt(s, 3)}</b></div>
        <div className="valueCard green"><span>cos θ</span><b>{fmt(c, 3)}</b></div>
        <div className="valueCard warn"><span>tan θ</span><b>{Math.abs(c) < 0.03 ? "无定义" : fmt(t, 3)}</b></div>
      </div>
      <div className="toggleGroup">
        <label className="toggleRow">
          <span>显示余弦曲线 y = cos x</span>
          <button role="switch" aria-checked={showCos} aria-label="显示余弦曲线" className={"toggle" + (showCos ? " on" : "")} onClick={() => onShowCos(!showCos)} />
        </label>
      </div>
      <p className="paramHint">点击单位圆任意位置可设角 · ▶ 自动旋转 · 曲线随 θ 联动</p>
    </div>
  );
}