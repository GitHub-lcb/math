"use client";
// 主页面：象限先生的数学实验室
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import CatalogSidebar from "@/components/CatalogSidebar";
import ParamPanel from "@/components/ParamPanel";
import ExperimentCanvas from "@/components/ExperimentCanvas";
import MathTabs from "@/components/MathTabs";
import AnnotationBoard from "@/components/AnnotationBoard";
import { FLAGSHIP_ID, type Stage } from "@/lib/catalog";
import { getPreset, getPresetOrFirst, PRESETS, presetsForStage, analyticDerivative, numericDerivative, slopeAt, secantSlope as secantSlopeFn } from "@/lib/derivatives";
import { parseAndMakeEvaluator } from "@/lib/parser";
import { SITE_ICP, SITE_NAME, SITE_THEME_KEY, DEFAULT_THEME } from "@/lib/siteConfig";
import { fmt } from "@/lib/math";

const presetDefaults = (id: string): Record<string, number> => {
  const p = getPreset(id);
  if (!p) return { a: 1, b: 0, c: 0, d: 0 };
  const out: Record<string, number> = {};
  for (const pd of p.params) out[pd.name] = pd.def;
  return out;
};

export default function Home() {
  // ---- 持久化与外观 ----
  const [theme, setTheme] = useState<"dark" | "light">(DEFAULT_THEME);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- 实验状态（单一事实源） ----
  const [stage, setStage] = useState<Stage>("senior");
  const [presetId, setPresetId] = useState("quadratic");
  const [exprText, setExprText] = useState(PRESETS[0].expr);
  const [params, setParams] = useState<Record<string, number>>(() => presetDefaults("quadratic"));
  const [usedParams, setUsedParams] = useState<string[]>(["a", "b", "c"]);
  const [showDerivative, setShowDerivative] = useState(false);
  const [showTangent, setShowTangent] = useState(true);
  const [showArea, setShowArea] = useState(false);
  const [tangentX, setTangentX] = useState(1);
  const [secantX1, setSecantX1] = useState(0);
  const [secantX2, setSecantX2] = useState(2);
  const [areaM, setAreaM] = useState(0);
  const [areaN, setAreaN] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const lastGoodFnRef = useRef<((x: number) => number) | null>(null);

  const preset = useMemo(() => getPresetOrFirst(presetId), [presetId]);
  const isCustom = exprText.trim() !== preset.expr;
  const senior = stage === "senior";

  // ---- 表达式解析：非法时保留上一条有效曲线 ----
  const parseState = useMemo(() => {
    const r = parseAndMakeEvaluator(exprText, params);
    if (r.ok && r.fn) {
      lastGoodFnRef.current = r.fn;
      return { fn: r.fn, used: r.params ?? [], error: null as string | null };
    }
    return { fn: lastGoodFnRef.current, used: usedParams, error: r.error ?? null };
  }, [exprText, params]);

  const fn = parseState.fn;
  useEffect(() => {
    if (parseState.used.length && JSON.stringify(parseState.used) !== JSON.stringify(usedParams)) {
      setUsedParams(parseState.used);
    }
  }, [parseState.used, usedParams]);

  // ---- 导数函数 ----
  const fnDerivative = useMemo(() => {
    if (!fn) return null;
    if (!isCustom) {
      const ad = analyticDerivative(preset.id, params);
      if (ad) return ad;
    }
    return (x: number) => numericDerivative(fn, x);
  }, [fn, isCustom, preset.id, params]);

  const slopeAtPoint = useCallback((x: number) => {
    if (!fn) return NaN;
    return slopeAt(isCustom ? "" : preset.id, fn, params, x);
  }, [fn, isCustom, preset.id, params]);

  const secantSlopeCb = useCallback((x1: number, x2: number) => {
    if (!fn) return NaN;
    return secantSlopeFn(fn, x1, x2);
  }, [fn]);

  // ---- 面积（有向，中点黎曼和） ----
  const areaValue = useMemo(() => {
    if (!senior || !showArea || !fn) return null;
    return riemannMid(fn, Math.min(areaM, areaN), Math.max(areaM, areaN), 120);
  }, [senior, showArea, fn, areaM, areaN]);

  // ---- 实时数值 ----
  const fnValue = useMemo(() => (fn ? fn(senior ? tangentX : secantX2) : null), [fn, senior, tangentX, secantX2]);
  const slopeNow = useMemo(() => {
    if (!fn) return null;
    if (senior) {
      const s = slopeAtPoint(tangentX);
      return Number.isFinite(s) ? s : null;
    }
    const s = secantSlopeFn(fn, secantX1, secantX2);
    return Number.isFinite(s) ? s : null;
  }, [fn, senior, slopeAtPoint, tangentX, secantSlopeCb, secantX1, secantX2]);

  // ---- 主题 ----
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    try { localStorage.setItem(SITE_THEME_KEY, theme); } catch { /* ignore */ }
    const m = document.querySelector("meta[name=\"theme-color\"]");
    if (m) {
      const paper = getComputedStyle(el).getPropertyValue("--paper").trim();
      if (paper) m.setAttribute("content", paper);
    }
  }, [theme]);

  // ---- 预设/学段操作 ----
  const applyPreset = useCallback((id: string) => {
    const p = getPreset(id) ?? getPresetOrFirst(id);
    setPresetId(p.id);
    setExprText(p.expr);
    setParams(presetDefaults(p.id));
    setShowDerivative(false);
    setShowArea(false);
    setTangentX(1);
    setSecantX1(0);
    setSecantX2(2);
    setAreaM(0);
    setAreaN(1);
    setResetToken((x) => x + 1);
  }, []);

  const changeStage = useCallback((s: Stage) => {
    setStage(s);
    const vis = presetsForStage(s);
    const cur = getPreset(presetId) ?? getPresetOrFirst(presetId);
    if (!vis.some((p) => p.id === cur.id)) {
      applyPreset(vis[0].id);
    } else {
      applyPreset(cur.id);
    }
    setShowDerivative(false);
    setShowArea(false);
  }, [presetId, applyPreset]);

  const onSelectExperiment = useCallback((id: string) => {
    if (id === FLAGSHIP_ID) {
      setSidebarOpen(false);
    }
  }, []);

  const presets = useMemo(() => presetsForStage(stage), [stage]);

  return (
    <>
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onOpenAnnotation={() => setAnnotationOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="appShell">
        {sidebarOpen && <div className="sidebarBackdrop" onClick={() => setSidebarOpen(false)} />}
        <div className={"sidebar" + (sidebarOpen ? " open" : "")}>
          <CatalogSidebar
            stage={stage}
            onStageChange={changeStage}
            activeId={FLAGSHIP_ID}
            onSelect={onSelectExperiment}
            onExpand={() => setSidebarOpen(true)}
          />
        </div>
        <main className="mainColumn">
          <div className="workspaceHeader">
            <h2>{senior ? "函数图像与导数探究" : "函数图像与变化规律"}</h2>
            <span className="stageChip">{senior ? "高中实验" : "初中实验"}</span>
            <span className="statusHint">实时仿真 · 可调参数 · 公式推导</span>
          </div>
          <div className="experimentArea">
            <div className="canvasPane">
              <ExperimentCanvas
                fn={fn}
                fnDerivative={fnDerivative}
                error={parseState.error}
                stage={stage}
                showDerivative={senior && showDerivative}
                showTangent={showTangent}
                showArea={senior && showArea}
                tangentX={tangentX}
                secantX1={secantX1}
                secantX2={secantX2}
                areaM={areaM}
                areaN={areaN}
                slopeAtPoint={slopeAtPoint}
                secantSlope={secantSlopeCb}
                resetToken={resetToken}
                onSetTangentX={setTangentX}
                onSetSecantX={(x1, x2) => { setSecantX1(x1); setSecantX2(x2); }}
                theme={theme}
              />
            </div>
            <div className="rightRail">
              <ParamPanel
                stage={stage}
                preset={preset}
                presets={presets}
                exprText={exprText}
                parseError={parseState.error}
                params={params}
                usedParams={usedParams}
                showDerivative={showDerivative}
                showTangent={showTangent}
                showArea={showArea}
                tangentX={tangentX}
                secantX1={secantX1}
                secantX2={secantX2}
                areaM={areaM}
                areaN={areaN}
                onExprText={setExprText}
                onSelectPreset={applyPreset}
                onParam={(n, v) => setParams((s) => ({ ...s, [n]: v }))}
                onShowDerivative={setShowDerivative}
                onShowTangent={setShowTangent}
                onShowArea={setShowArea}
                onTangentX={setTangentX}
                onSecantX1={setSecantX1}
                onSecantX2={setSecantX2}
                onAreaM={setAreaM}
                onAreaN={setAreaN}
              />
              <MathTabs
                preset={preset}
                stage={stage}
                params={params}
                isCustom={isCustom}
                tangentX={tangentX}
                fnValue={fnValue}
                slope={slopeNow}
                secantX1={secantX1}
                secantX2={secantX2}
                areaValue={areaValue}
                areaM={areaM}
                areaN={areaN}
              />
            </div>
          </div>
          <footer className="appFooter">
            <span aria-hidden="true" />
            <span>{senior ? "函数图像与导数探究" : "函数图像与变化规律"}</span>
            <span className="icpRow">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">{SITE_ICP}</a>
            </span>
          </footer>
        </main>
      </div>
      <AnnotationBoard open={annotationOpen} onClose={() => setAnnotationOpen(false)} />
    </>
  );
}

// 中点黎曼和（与画布填充保持一致）
function riemannMid(fn: (x: number) => number, a: number, b: number, bars: number): number {
  if (!isFinite(a) || !isFinite(b) || a >= b) return 0;
  const dw = (b - a) / bars;
  let sum = 0;
  for (let i = 0; i < bars; i++) {
    const xm = a + (i + 0.5) * dw;
    const ym = fn(xm);
    if (Number.isFinite(ym)) sum += ym * dw;
  }
  return sum;
}