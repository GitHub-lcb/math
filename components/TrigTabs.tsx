"use client";
import { useMemo, useState } from "react";
import MathFormula from "./MathFormula";
import { fmt } from "@/lib/math";

export default function TrigTabs({ theta, onTheta }: { theta: number; onTheta: (t: number) => void }) {
  const [tab, setTab] = useState<"formula" | "guide" | "warn" | "challenge">("formula");
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const t = Math.tan(theta);
  const [results, setResults] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("math-trig-challenges-v1");
      if (raw) return JSON.parse(raw);
    } catch { }
    return {};
  });
  const [checked, setChecked] = useState<Record<string, boolean | "pending">>({});

  const challenges = useMemo(() => [
    {
      id: "sin-half",
      prompt: "旋转 θ，让 sin θ 恰好等于 0.5",
      hint: "特殊角：θ = 30°（π/6）时 sin = 1/2",
      check: () => Math.abs(s - 0.5) < 0.02,
    },
    {
      id: "cos-negative",
      prompt: "让 cos θ 变成负数（点在左半圆）",
      hint: "cos < 0 ⇔ 点 P 在 y 轴左侧",
      check: () => c < -0.02,
    },
    {
      id: "tan-dead",
      prompt: "让 tan θ 无定义（θ = 90°）",
      hint: "cos 90° = 0，tan = sin/cos 分母为 0",
      check: () => Math.abs(c) < 0.015,
    },
    {
      id: "same-value",
      prompt: "找到 sin θ = cos θ 的角度",
      hint: "45°（π/4）：正弦与余弦相等",
      check: () => Math.abs(s - c) < 0.02,
    },
  ], [s, c]);

  const doneCount = challenges.filter((c2) => results[c2.id] === true).length;

  return (
    <div className="mathTabs">
      <div className="tabsHead" role="tablist">
        <button role="tab" aria-selected={tab === "formula"} className={"tabBtn" + (tab === "formula" ? " active" : "")} onClick={() => setTab("formula")}>📐 公式推导</button>
        <button role="tab" aria-selected={tab === "guide"} className={"tabBtn" + (tab === "guide" ? " active" : "")} onClick={() => setTab("guide")}>🧭 实验指南</button>
        <button role="tab" aria-selected={tab === "warn"} className={"tabBtn" + (tab === "warn" ? " active" : "")} onClick={() => setTab("warn")}>⚠️ 易错点</button>
        <button role="tab" aria-selected={tab === "challenge"} className={"tabBtn" + (tab === "challenge" ? " active" : "")} onClick={() => setTab("challenge")}>🎯 挑战 {doneCount > 0 ? "(" + doneCount + "/" + challenges.length + ")" : ""}</button>
      </div>
      <div className="tabsBody">
        {tab === "formula" && (
          <div className="formulaList">
            <div className="formulaItem"><MathFormula tex={"\\sin^2\\theta + \\cos^2\\theta = 1"} block /><p className="formulaNote">勾股恒等式：P 点在单位圆上，横纵坐标平方和为 1</p></div>
            <div className="formulaItem"><MathFormula tex={"\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}"} block /><p className="formulaNote">正切 = 正弦 ÷ 余弦；cos θ = 0 时无定义</p></div>
            <div className="formulaItem"><MathFormula tex={"\\sin(\\theta + 2\\pi) = \\sin\\theta"} block /><p className="formulaNote">周期性：旋转一圈回到原位</p></div>
            <div className="formulaItem"><MathFormula tex={"\\begin{array}{c|c|c|c}\\theta & 30^\\circ & 45^\\circ & 60^\\circ \\\\ \\hline \\sin\\theta & \\frac{1}{2} & \\frac{\\sqrt{2}}{2} & \\frac{\\sqrt{3}}{2} \\\\ \\cos\\theta & \\frac{\\sqrt{3}}{2} & \\frac{\\sqrt{2}}{2} & \\frac{1}{2} \\\\ \\tan\\theta & \\frac{\\sqrt{3}}{3} & 1 & \\sqrt{3}\\end{array}"} block /><p className="formulaNote">特殊角数值表（30° / 45° / 60°）</p></div>
            <div className="liveValues">
              <span>θ = {fmt(theta, 3)}（{fmt((theta * 180) / Math.PI, 1)}°）</span>
              <span>P 坐标：({fmt(c, 3)}, {fmt(s, 3)})</span>
            </div>
          </div>
        )}
        {tab === "guide" && (
          <ol className="guideList">
            <li>拖动 θ 滑块或点击单位圆上的点，观察 P 点绕圆一周</li>
            <li>P 的横坐标 = cos θ（绿色投影线），纵坐标 = sin θ（红色投影线）</li>
            <li>正切线：过 (1, 0) 的竖线与 θ 射线的交点 T 的纵坐标即 tan θ</li>
            <li>右侧波形图是 sin θ 与 cos θ 随 θ 变化的展开——两条曲线相位差 π/2</li>
            <li>点击 ▶ 自动旋转，看波形如何“跑”起来</li>
          </ol>
        )}
        {tab === "warn" && (
          <ul className="warnList">
            <li>弧度制 vs 角度制：π rad = 180°，勿混用（sin 90 ≈ 0.894 而非 1）</li>
            <li>tan θ 在 θ = 90°、270° 处无定义（除以零）</li>
            <li>sin、cos 值域为 [-1, 1]：超过说明选错坐标</li>
            <li>“三角函数线”是线段长度与坐标的对应，不是角度本身</li>
          </ul>
        )}
        {tab === "challenge" && (
          <div className="challengeList">
            <p className="challengeIntro">用滑块旋转 θ，达成目标后点「验证」。</p>
            {challenges.map((ch) => {
              const done = results[ch.id] === true;
              const st = checked[ch.id];
              return (
                <div key={ch.id} className={"challengeItem" + (done ? " done" : "")}>
                  <div className="challengeHead">
                    <span className="challengeBadge">{done ? "✓" : st === "pending" ? "…" : st === false ? "✗" : "•"}</span>
                    <p className="challengePrompt">{ch.prompt}</p>
                  </div>
                  <div className="challengeActions">
                    <span className="challengeHint">{ch.hint}</span>
                    <button className="challengeBtn" disabled={done} onClick={() => {
                      const pass = ch.check();
                      setChecked((x) => ({ ...x, [ch.id]: pass }));
                      if (pass) {
                        const n = { ...results, [ch.id]: true };
                        setResults(n);
                        try { localStorage.setItem("math-trig-challenges-v1", JSON.stringify(n)); } catch { }
                      }
                    }}>{done ? "已完成" : "验证"}</button>
                  </div>
                </div>
              );
            })}
            {doneCount === challenges.length && <div className="challengeDone">🏆 三角函数的门已经为你打开！</div>}
          </div>
        )}
      </div>
    </div>
  );
}