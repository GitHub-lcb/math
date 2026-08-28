"use client";
// 右侧数学面板：公式推导 / 实验指南 / 易错点
import { useState } from "react";
import MathFormula from "./MathFormula";
import type { Preset } from "@/lib/derivatives";
import type { Stage } from "@/lib/catalog";
import { fmt } from "@/lib/math";

interface MathTabsProps {
  preset: Preset;
  stage: Stage;
  params: Record<string, number>;
  isCustom: boolean;
  tangentX: number;
  fnValue: number | null;
  slope: number | null;
  secantX1: number;
  secantX2: number;
  areaValue: number | null;
  areaM: number;
  areaN: number;
}

export default function MathTabs(props: MathTabsProps) {
  const { preset, stage, isCustom, tangentX, fnValue, slope, secantX1, secantX2, areaValue, areaM, areaN } = props;
  const [tab, setTab] = useState<"formula" | "guide" | "warn">("formula");
  const senior = stage === "senior";

  const formulaItems: { tex: string; note: string }[] = [];
  if (isCustom) {
    formulaItems.push({ tex: "f(x)=" + (preset.expr.includes("x") ? "（当前自定义表达式）" : preset.expr), note: "自定义表达式按你输入的函数求值" });
    formulaItems.push({ tex: "f\\prime(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}", note: "采用数值微分 h→0 近似（图中导曲线即数值导数）" });
  } else {
    for (const f of preset.formulas) formulaItems.push({ tex: f, note: "" });
  }

  const guideItems = senior
    ? [
        "① 输入函数表达式，或从预设中选择一个函数（如二次函数）",
        "② 拖动参数滑块 a/b/c/d，观察图像实时变化与滑块数值的关系",
        "③ 打开「导数曲线」，对比 f(x) 与 f′(x) 的零点关系",
        "④ 拖动切点，观察切线斜率 = 瞬时变化率 = f′(x₀)",
        "⑤ 打开「定积分面积」，理解有向面积（x 轴下方为负）",
        "⑥ 拖拽平移画布、缩放按钮放大局部，悬停查看坐标",
      ]
    : [
        "① 输入函数表达式，或从预设中选择一个函数",
        "② 拖动参数滑块，观察图像如何随参数变化",
        "③ 拖动两个割点，观察两点间连线的倾斜程度（变化快慢）",
        "④ 斜率 = (y₂−y₁)/(x₂−x₁)：即两点间平均变化率",
        "⑤ 对比不同函数：一次函数斜率不变，二次函数斜率处处不同",
        "⑥ 拖拽平移画布、缩放按钮放大局部，悬停查看坐标",
      ];

  const warnList = preset.warn.length > 0
    ? preset.warn
    : ["检查定义域（如 ln 内须为正、分母不为 0）", "注意断点处曲线断开表示函数无定义"];

  return (
    <div className="mathTabs">
      <div className="tabsHead" role="tablist">
        <button role="tab" aria-selected={tab === "formula"} className={"tabBtn" + (tab === "formula" ? " active" : "")} onClick={() => setTab("formula")}>📐 公式推导</button>
        <button role="tab" aria-selected={tab === "guide"} className={"tabBtn" + (tab === "guide" ? " active" : "")} onClick={() => setTab("guide")}>🧭 实验指南</button>
        <button role="tab" aria-selected={tab === "warn"} className={"tabBtn" + (tab === "warn" ? " active" : "")} onClick={() => setTab("warn")}>⚠️ 易错点</button>
      </div>
      <div className="tabsBody">
        {tab === "formula" && (
          <div className="formulaList">
            {formulaItems.map((it, i) => (
              <div className="formulaItem" key={i}>
                <MathFormula tex={it.tex} block />
                {it.note && <p className="formulaNote">{it.note}</p>}
              </div>
            ))}
            {!isCustom && !senior && (
              <div className="formulaItem juniorOnly">
                <MathFormula tex={"\\text{平均变化率}=\\frac{f(x_2)-f(x_1)}{x_2-x_1}"} block />
                <p className="formulaNote">初中阶段：先理解两点间的变化快慢；导数与极限是高中进阶内容</p>
              </div>
            )}
            {!isCustom && senior && (
              <div className="formulaItem">
                <MathFormula tex={"f\\prime(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}"} block />
                <p className="formulaNote">导数的几何意义：f′(x₀) 是曲线在 x₀ 处切线的斜率</p>
              </div>
            )}
            <div className="liveValues">
              {senior ? (
                <>
                  <span>切点 x₀ = {fmt(tangentX, 2)}</span>
                  <span>f(x₀) = {fnValue == null ? "—" : fmt(fnValue, 3)}</span>
                  <span>斜率 f′(x₀) = {slope == null ? "—" : fmt(slope, 3)}</span>
                </>
              ) : (
                <>
                  <span>割点 x₁ = {fmt(secantX1, 2)} / x₂ = {fmt(secantX2, 2)}</span>
                  <span>平均变化率 = {slope == null ? "—" : fmt(slope, 3)}</span>
                </>
              )}
              {senior && areaValue != null && (
                <span>∫[{fmt(areaM, 2)},{fmt(areaN, 2)}] f ≈ {fmt(areaValue, 3)}（有向面积）</span>
              )}
            </div>
          </div>
        )}
        {tab === "guide" && (
          <ol className="guideList">
            {guideItems.map((g, i) => (<li key={i}>{g}</li>))}
          </ol>
        )}
        {tab === "warn" && (
          <ul className="warnList">
            {warnList.map((w, i) => (<li key={i}>{w}</li>))}
          </ul>
        )}
      </div>
    </div>
  );
}