"use client";
import { useMemo, useState } from "react";
import MathFormula from "./MathFormula";
import { fmt } from "@/lib/math";
import type { ConicState } from "./ConicCanvas";

export default function ConicTabs({ state, resultsRef }: { state: ConicState; resultsRef?: { current: (t: ConicState) => number[][] } }) {
  const [tab, setTab] = useState<"formula" | "guide" | "warn" | "challenge">("formula");
  const [results, setResults] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("math-conic-challenges-v1");
      if (raw) return JSON.parse(raw);
    } catch { }
    return {};
  });
  const [checked, setChecked] = useState<Record<string, boolean | "pending">>({});

  const { type, a, b, p, t } = state;
  const e = useMemo(() => {
    if (type === "ellipse") {
      const aa = Math.max(0.5, a), bb = Math.max(0.3, Math.min(b, aa * 0.99));
      return Math.sqrt(aa * aa - bb * bb) / aa;
    }
    if (type === "hyperbola") {
      const aa = Math.max(0.6, a), bb = Math.max(0.4, b);
      return Math.sqrt(aa * aa + bb * bb) / aa;
    }
    return 1;
  }, [type, a, b]);

  const challenges = useMemo(() => [
    {
      id: "e-half",
      prompt: "椭圆模式：把离心率 e 调到 0.5 附近",
      hint: "b = a·√(1−e²)；e = 0.5 时 b = a·√0.75 ≈ 0.866a",
      check: () => type === "ellipse" && Math.abs(e - 0.5) < 0.03,
    },
    {
      id: "focus-show",
      prompt: "双曲线模式：让两个焦点都在画布视野内（焦点距 c < 6）",
      hint: "c = √(a²+b²)，把 a、b 调小一些",
      check: () => {
        if (type !== "hyperbola") return false;
        const aa = Math.max(0.6, a), bb = Math.max(0.4, b);
        return Math.sqrt(aa * aa + bb * bb) < 6;
      },
    },
    {
      id: "parabola-eq",
      prompt: "抛物线模式：观察 |PF| 与到准线距离（打开画布芯片）",
      hint: "观察题：无论 P 走到哪，两个值恒相等",
      check: () => type === "parabola",
    },
    {
      id: "vertex-top",
      prompt: "椭圆模式：把动点 P 移到上顶点（t ≈ 0.25）",
      hint: "上顶点即 (0, b)，参数 t 处于全程的 1/4 处",
      check: () => type === "ellipse" && Math.abs(t - 0.25) < 0.02,
    },
  ], [type, e, a, b, t]);

  const doneCount = challenges.filter((c2) => results[c2.id] === true).length;
  void resultsRef;
  const formula = type === "ellipse"
    ? ["\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1\\quad(a>b>0)", "c^2=a^2-b^2\\ ,\\ e=\\frac{c}{a}\in(0,1)", "|PF_1|+|PF_2|=2a\\ \\text{（椭圆定义）}"]
    : type === "hyperbola"
      ? ["\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1", "c^2=a^2+b^2\\ ,\\ e=\\frac{c}{a}>1", "||PF_1|-|PF_2||=2a\\ \\text{（双曲线定义）}"]
      : ["y^2=2px\\ (p>0) \\ \\text{，焦点 } F(\\tfrac{p}{2},0)", "\\text{准线 } x=-\\tfrac{p}{2}", "|PF|=d(P,\\text{准线})\\ \\text{（抛物线定义）}"];

  const guides = type === "ellipse"
    ? ["拖动 a、b 改变椭圆形状，观察两个焦点的位置", "离心率 e 反映椭圆扁平程度：e→0 越接近圆，e→1 越扁", "拖动动点 P，芯片里 |PF₁|+|PF₂| 恒等于 2a", "准线 x=±a/e 与焦点一一对应"]
    : type === "hyperbola"
      ? ["两支曲线由渐近线 y=±(b/a)x 界定，P 在右支上", "|PF₁|−|PF₂| = 2a 恒定（芯片实时验证）", "e>1：越大张开角越小", "焦点在实轴上，c=√(a²+b²)，c>a"]
      : ["抛物线 y²=2px 开口向右，焦点 F(p/2,0)", "准线 x=−p/2：P 到焦点与到准线距离恒等", "p 越大曲线越“胖”", "顶点在原点，对称轴为 x 轴"];

  const warns = type === "ellipse"
    ? ["a>b>0 是最小条件：a 是半长轴，写方程时勿颠倒", "e=c/a，焦点离中心越远 e 越大（不是 b 越小）", "准线 x=±a/e 在焦点外侧"]
    : type === "hyperbola"
      ? ["双曲线没有 b>c 的说法：c²=a²+b² 恒成立", "渐近线不是曲线本身，两支逼近但永不相交", "|PF₁|−|PF₂| 要取绝对值（左右支符号不同）"]
      : ["p>0 才开口向右；p<0 开口向左（本实验只取 p>0）", "焦点在 (p/2,0) 而非 (p,0)——最常见错误", "准线在 y 轴左侧，勿画到右侧"];

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
            {formula.map((f, i) => (
              <div className="formulaItem" key={i}>
                <MathFormula tex={f} block />
              </div>
            ))}
            <div className="liveValues">
              <span>当前离心率 e = {fmt(e, 4)}</span>
              <span>动点参数 t = {fmt(t, 3)}</span>
            </div>
          </div>
        )}
        {tab === "guide" && (<ol className="guideList">{guides.map((g2, i) => (<li key={i}>{g2}</li>))}</ol>)}
        {tab === "warn" && (<ul className="warnList">{warns.map((w2, i) => (<li key={i}>{w2}</li>))}</ul>)}
        {tab === "challenge" && (
          <div className="challengeList">
            <p className="challengeIntro">切换类型、调参数、移动作点，达成目标后点「验证」。</p>
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
                        const nn = { ...results, [ch.id]: true };
                        setResults(nn);
                        try { localStorage.setItem("math-conic-challenges-v1", JSON.stringify(nn)); } catch { }
                      }
                    }}>{done ? "已完成" : "验证"}</button>
                  </div>
                </div>
              );
            })}
            {doneCount === challenges.length && <div className="challengeDone">🏆 你已征服三种圆锥曲线！</div>}
          </div>
        )}
      </div>
    </div>
  );
}