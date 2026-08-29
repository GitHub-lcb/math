"use client";
// 主页面：象限先生的数学实验室
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import CatalogSidebar from "@/components/CatalogSidebar";
import ParamPanel from "@/components/ParamPanel";
import ExperimentCanvas from "@/components/ExperimentCanvas";
import MathTabs from "@/components/MathTabs";
import AnnotationBoard from "@/components/AnnotationBoard";
import GuideToast from "@/components/GuideToast";
import TrigCanvas from "@/components/TrigCanvas";
import TrigPanel from "@/components/TrigPanel";
import TrigTabs from "@/components/TrigTabs";
import { CATALOG, FLAGSHIP_ID, type Stage } from "@/lib/catalog";
import { getPreset, getPresetOrFirst, PRESETS, presetsForStage, analyticDerivative, analyticSecondDerivative, numericDerivative, secondDerivativeAt, slopeAt, secantSlope as secantSlopeFn } from "@/lib/derivatives";
import { parseAndMakeEvaluator } from "@/lib/parser";
import { SITE_ICP, SITE_NAME, SITE_THEME_KEY, DEFAULT_THEME } from "@/lib/siteConfig";
import { fmt, findExtrema, findInflections, findZeros } from "@/lib/math";

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

  // ---- 实验切换 ----
  const [activeId, setActiveId] = useState<string>(FLAGSHIP_ID);
  const [theta, setTheta] = useState(Math.PI / 4);
  const [trigPlaying, setTrigPlaying] = useState(false);
  const [showCos, setShowCos] = useState(true);
  const isTrig = activeId === "trig-unit-circle";

  // ---- 实验状态（单一事实源） ----
  const [stage, setStage] = useState<Stage>("senior");
  const [presetId, setPresetId] = useState("quadratic");
  const [exprText, setExprText] = useState(PRESETS[0].expr);
  const [params, setParams] = useState<Record<string, number>>(() => presetDefaults("quadratic"));
  const [usedParams, setUsedParams] = useState<string[]>(["a", "b", "c"]);
  const [showDerivative, setShowDerivative] = useState(false);
  const [showF2, setShowF2] = useState(false);
  const [showTangent, setShowTangent] = useState(true);
  const [showArea, setShowArea] = useState(false);
  const [tangentX, setTangentX] = useState(1);
  const [secantX1, setSecantX1] = useState(0);
  const [secantX2, setSecantX2] = useState(2);
  const [areaM, setAreaM] = useState(0);
  const [areaN, setAreaN] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const [demoMode, setDemoMode] = useState<"params" | "tangent" | null>(null);
  const demoRafRef = useRef<number | null>(null);
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

  // ---- 二阶导数函数 ----
  const fnSecondDerivative = useMemo(() => {
    if (!fn) return null;
    if (!isCustom) {
      const a2 = analyticSecondDerivative(preset.id, params);
      if (a2) return a2;
    }
    return (x: number) => secondDerivativeAt(preset.id, isCustom, fn, params, x);
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

  // ---- 零点 / 极值点标注（预设解析优先，自定义数值扫描） ----
  const annotations = useMemo(() => {
    if (!fn) return [];
    const pts: { type: "zero" | "extrema" | "inflection"; x: number; y: number }[] = [];
    // 零点
    const zeros = findZeros(fn, -8, 8);
    for (const z of zeros.slice(0, 4)) {
      const y = fn(z);
      if (Number.isFinite(y) && Math.abs(y) < 0.5) pts.push({ type: "zero", x: z, y });
    }
    // 极值（预设解析式优先）
    if (isCustom) {
      const d = fnDerivative;
      if (d) {
        for (const ex of findExtrema(fn, d, -8, 8).slice(0, 3)) {
          const y = fn(ex);
          if (Number.isFinite(y)) pts.push({ type: "extrema", x: ex, y });
        }
      }
    } else {
      const pd = getPreset(preset.id);
      if (pd && pd.id === "quadratic") {
        const a = params.a ?? 1, b = params.b ?? 0;
        if (a !== 0) {
          const xv = -b / (2 * a);
          pts.push({ type: "extrema", x: xv, y: fn(xv) });
        }
      } else if (pd && pd.id === "cubic") {
        pts.push({ type: "extrema", x: -1, y: fn(-1) });
        pts.push({ type: "extrema", x: 1, y: fn(1) });
      }
    }
    // 拐点（f'' 变号）
    const f2 = fnSecondDerivative;
    if (f2) {
      const infls = findInflections(f2, -8, 8);
      for (const ix of infls.slice(0, 3)) {
        const y = fn(ix);
        if (Number.isFinite(y)) pts.push({ type: "inflection", x: ix, y });
      }
    }
    return pts;
  }, [fn, fnDerivative, fnSecondDerivative, isCustom, preset.id, params]);

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

  // ---- URL 状态恢复（刷新/分享后保持实验现场） ----
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const qs = new URLSearchParams(window.location.search);
      const e = qs.get("e");
      if (e) {
        const p = getPreset(e);
        if (p) {
          setPresetId(p.id);
          setExprText(p.expr);
          const defs = presetDefaults(p.id);
          setParams(defs);
          setShowDerivative(false);
          setShowArea(false);
          setShowTangent(true);
        }
      }
      const s = qs.get("s");
      if (s === "junior" || s === "senior") setStage(s);
      const pj = qs.get("p");
      if (pj) {
        try {
          const parsed = JSON.parse(pj) as Record<string, number>;
          if (parsed && typeof parsed === "object") {
            setParams((prev) => ({ ...prev, ...parsed }));
          }
        } catch { /* ignore */ }
      }
      const lab = qs.get("lab");
      if (lab === "trig-unit-circle" || lab === FLAGSHIP_ID) setActiveId(lab);
      const th = qs.get("th");
      if (th !== null && !Number.isNaN(parseFloat(th))) setTheta((parseFloat(th) * Math.PI) / 180);
      const x = qs.get("x");
      if (x !== null && !Number.isNaN(parseFloat(x))) setTangentX(parseFloat(x));
      const d = qs.get("d");
      if (d !== null) setShowDerivative(d === "1");
      const a = qs.get("a");
      if (a !== null) setShowArea(a === "1");
      const r = qs.get("r");
      if (r !== null) setResetToken((v) => v + 1);
    } catch { /* ignore */ }
  }, []);

  // ---- URL 状态写入（防抖 500ms，replaceState 不产生历史） ----
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const qs = new URLSearchParams();
        qs.set("e", presetId);
        qs.set("s", stage);
        qs.set("p", JSON.stringify(params));
        qs.set("x", tangentX.toFixed(2));
        qs.set("d", showDerivative ? "1" : "0");
        qs.set("a", showArea ? "1" : "0");
        qs.set("lab", activeId);
        qs.set("th", ((theta * 180) / Math.PI).toFixed(1));
        history.replaceState(null, "", "?" + qs.toString());
      } catch { /* ignore */ }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [presetId, stage, params, tangentX, showDerivative, showArea, activeId, theta]);

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
  const stopDemo = useCallback(() => {
    if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
    demoRafRef.current = null;
    setDemoMode(null);
  }, []);

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
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  // 单位圆自动旋转（rAF，≈12s 一圈）
  useEffect(() => {
    if (!trigPlaying) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      setTheta((t) => (t + Math.PI / 90) % (Math.PI * 2));
      void now; void t0;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [trigPlaying]);

  const presets = useMemo(() => presetsForStage(stage), [stage]);

  // 当前模块（标志实验所在模块）→ 色点展示
  const currentModule = useMemo(() => {
    return CATALOG[stage].find((m) => m.experiments.some((e) => e.id === FLAGSHIP_ID)) ?? null;
  }, [stage]);

  // ---- 演示启动 ----
  const startDemo = useCallback((mode: "params" | "tangent") => {
    if (mode === "tangent" && !showTangent) setShowTangent(true);
    setDemoMode(mode);
  }, [showTangent]);

  // ---- 重置实验：恢复预设默认参数 + 默认开关 + 视图复位 ----
  const resetExperiment = useCallback(() => {
    const p = getPresetOrFirst(presetId);
    setExprText(p.expr);
    setParams(presetDefaults(presetId));
    setShowDerivative(false);
    setShowTangent(true);
    setShowArea(false);
    setTangentX(1);
    setSecantX1(0);
    setSecantX2(2);
    setAreaM(0);
    setAreaN(1);
    setResetToken((x) => x + 1);
    stopDemo();
  }, [presetId, stopDemo]);

  // ---- 快捷键：1-7 预设 / R 重置 / D 参数演示 / T 切点巡航 ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= presets.length) {
        const p = presets[n - 1];
        if (p.id !== preset.id) applyPreset(p.id);
        return;
      }
      if (e.key === "r" || e.key === "R") { resetExperiment(); return; }
      if (e.key === "d" || e.key === "D") { if (demoMode) stopDemo(); else startDemo("params"); return; }
      if (e.key === "t" || e.key === "T") { if (demoMode) stopDemo(); else startDemo("tangent"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presets, preset.id, applyPreset, resetExperiment, startDemo, demoMode]);

  // ---- 演示循环：'params' 参数演示 / 'tangent' 切线巡航 ----

  useEffect(() => {
    if (!demoMode) return;
    const t0 = performance.now();
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let last = t0;
    const STEP = 40; // 25fps
    let finished = false;

    const step = (now: number) => {
      if (now - last < STEP) {
        demoRafRef.current = requestAnimationFrame(step);
        return;
      }
      last = now;
      if (demoMode === "params") {
        // 参数演示：首个参数 起→峰→回（3.2s）
        const DUR = 3200;
        const p = Math.min(1, (now - t0) / DUR);
        const pd = preset.params[0];
        if (pd) {
          const lo = pd.def, hi = Math.max(pd.max * 0.75, Math.abs(lo) * 1.5 || 2);
          const v = p < 0.5 ? lo + (hi - lo) * easeInOut(p * 2) : hi - (hi - lo) * easeInOut((p - 0.5) * 2);
          setParams((s) => ({ ...s, [pd.name]: +v.toFixed(2) }));
        }
        if (p >= 1) finished = true;
      } else {
        // 切线巡航：切点沿曲线慢扫（4.2s，画布侧同时推进）
        const DUR = 4200;
        const p = Math.min(1, (now - t0) / DUR);
        setTangentX(+(-6.5 + 13 * easeInOut(p)).toFixed(2));
        if (p >= 1) finished = true;
      }
      if (finished) {
        if (demoMode === "params" && preset.params[0]) {
          setParams((s) => ({ ...s, [preset.params[0].name]: preset.params[0].def }));
        }
        stopDemo();
        return;
      }
      demoRafRef.current = requestAnimationFrame(step);
    };
    demoRafRef.current = requestAnimationFrame(step);

    // 演示期间：预设切换 / 表达式编辑 / 学段切换 / 手动滑块 均打断
    const interrupt = () => stopDemo();
    window.addEventListener("pointerdown", interrupt, { capture: true, once: true });
    return () => {
      if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
      window.removeEventListener("pointerdown", interrupt, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, preset, stopDemo]);

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
            <span
              className="modDot"
              style={currentModule?.hue ? ({ "--mod-hue": currentModule.hue } as React.CSSProperties) : undefined}
              aria-hidden="true"
            />
            <h2>{isTrig ? "单位圆与三角函数线" : senior ? "函数图像与导数探究" : "函数图像与变化规律"}</h2>
            <span className="stageChip">{isTrig ? "高中实验" : senior ? "高中实验" : "初中实验"}</span>
            <span className="statusHint">{isTrig ? "实时仿真 · 点击或拖动 · 三角联动" : "实时仿真 · 可调参数 · 公式推导"}</span>
          </div>
          <div className="experimentArea">
            {isTrig ? (
              <>
            <div className="canvasPane">
              <TrigCanvas
                theta={theta}
                onTheta={setTheta}
                showCos={showCos}
                theme={theme}
                playing={trigPlaying}
                onTogglePlay={() => setTrigPlaying((v) => !v)}
              />
            </div>
            <div className="rightRail">
              <TrigPanel
                theta={theta}
                onTheta={setTheta}
                playing={trigPlaying}
                onTogglePlay={() => setTrigPlaying((v) => !v)}
                showCos={showCos}
                onShowCos={setShowCos}
              />
              <TrigTabs theta={theta} onTheta={setTheta} />
            </div>
              </>
            ) : (
              <>
            <div className="canvasPane">
              <GuideToast />
              <ExperimentCanvas
                fn={fn}
                fnDerivative={fnDerivative}
                fnSecondDerivative={fnSecondDerivative}
                error={parseState.error}
                stage={stage}
                showDerivative={senior && showDerivative}
                showF2={senior && showF2}
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
                demoMode={demoMode}
                annotations={annotations}
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
                showF2={showF2}
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
                onShowF2={setShowF2}
                onShowTangent={setShowTangent}
                onShowArea={setShowArea}
                onTangentX={setTangentX}
                onSecantX1={setSecantX1}
                onSecantX2={setSecantX2}
                onAreaM={setAreaM}
                onAreaN={setAreaN}
                demoActive={demoMode !== null}
                onDemo={(m) => (m === null ? stopDemo() : startDemo(m))}
                onReset={resetExperiment}
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
                challengeState={{
                  presetId: preset.id,
                  stage,
                  fn,
                  params,
                  tangentX,
                  showTangent,
                  areaValue,
                  areaM,
                  areaN,
                  slopeAt: slopeAtPoint,
                  showArea,
                }}
              />
            </div>
              </>
            )}
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