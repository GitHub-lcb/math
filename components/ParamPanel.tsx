"use client";
// 参数面板：表达式输入 / 预设选择 / 参数滑块 / 功能开关
import type { Preset, ParamDef } from "@/lib/derivatives";
import { fmt } from "@/lib/math";
import type { Stage } from "@/lib/catalog";
import { IconAlert } from "./icons";

interface ParamPanelProps {
  stage: Stage;
  preset: Preset;
  presets: Preset[];
  exprText: string;
  parseError: string | null;
  params: Record<string, number>;
  usedParams: string[];
  showDerivative: boolean;
  showTangent: boolean;
  showArea: boolean;
  tangentX: number;
  secantX1: number;
  secantX2: number;
  areaM: number;
  areaN: number;
  onExprText: (v: string) => void;
  onSelectPreset: (id: string) => void;
  onParam: (name: string, v: number) => void;
  onShowDerivative: (v: boolean) => void;
  onShowTangent: (v: boolean) => void;
  onShowArea: (v: boolean) => void;
  onTangentX: (v: number) => void;
  onSecantX1: (v: number) => void;
  onSecantX2: (v: number) => void;
  onAreaM: (v: number) => void;
  onAreaN: (v: number) => void;
}

function Slider({ label, value, min, max, step, disabled, onChange }: {
  label: string; value: number; min: number; max: number; step: number; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <label className={"sliderRow" + (disabled ? " disabled" : "")} title={disabled ? "表达式中未使用该参数" : undefined}>
      <span className="sliderLabel">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="sliderValue">{fmt(value, 2)}</span>
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={"toggleRow" + (disabled ? " disabled" : "")}>
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={"toggle" + (checked ? " on" : "")}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}

export default function ParamPanel(props: ParamPanelProps) {
  const {
    stage, preset, presets, exprText, parseError, params, usedParams,
    showDerivative, showTangent, showArea, tangentX, secantX1, secantX2, areaM, areaN,
    onExprText, onSelectPreset, onParam, onShowDerivative, onShowTangent, onShowArea,
    onTangentX, onSecantX1, onSecantX2, onAreaM, onAreaN,
  } = props;
  const senior = stage === "senior";

  const paramDefs: ParamDef[] = preset.params.length > 0
    ? preset.params
    : (["a", "b", "c", "d"] as const).map((n) => ({ name: n, min: -10, max: 10, step: 0.1, def: 1 } as ParamDef));
  const showParams = paramDefs.filter((p) => usedParams.includes(p.name));
  const hiddenParams = paramDefs.filter((p) => !usedParams.includes(p.name));

  return (
    <div className="paramPanel">
      <div className="exprRow">
        <div className={"exprField" + (parseError ? " error" : "")}>
          <span className="exprPrefix">f(x) =</span>
          <input
            aria-label="函数表达式"
            spellCheck={false}
            autoComplete="off"
            value={exprText}
            onChange={(e) => onExprText(e.target.value)}
            placeholder="如 x^2 / sin(x) / a*x^2+b*x+c / ln(x)"
          />
        </div>
        <select
          className="presetSelect"
          value={preset.id}
          aria-label="预设函数"
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          {presets.map((p) => (<option key={p.id} value={p.id}>{p.stage === "senior" && stage === "junior" ? "⭐ " : ""}{p.name}</option>))}
        </select>
      </div>
      {parseError && (
        <div className="parseError" role="alert">
          <IconAlert size={13} /> <span>{parseError}</span>
        </div>
      )}
      <p className="presetDesc">{preset.desc}</p>
      <div className="sliderGroup">
        {showParams.map((p) => (
          <Slider
            key={p.name}
            label={p.name + " = "}
            value={params[p.name] ?? p.def}
            min={p.min}
            max={p.max}
            step={p.step}
            onChange={(v) => onParam(p.name, v)}
          />
        ))}
        {hiddenParams.slice(0, 2).map((p) => (
          <Slider key={p.name} label={p.name + " = "} value={params[p.name] ?? p.def} min={p.min} max={p.max} step={p.step} disabled onChange={onParam.bind(null, p.name)} />
        ))}
      </div>
      <div className="toggleGroup">
        {senior && (
          <Toggle label="导数曲线 f′(x)" checked={showDerivative} onChange={onShowDerivative} />
        )}
        <Toggle label={senior ? "切线（切点可拖）" : "割线（两点变化快慢）"} checked={showTangent} onChange={onShowTangent} />
        {senior && (
          <Toggle label="定积分面积 ∫" checked={showArea} onChange={onShowArea} />
        )}
      </div>
      {showTangent && (
        <div className="sliderGroup">
          {senior ? (
            <Slider label="切点 x₀ =" value={tangentX} min={-8} max={8} step={0.1} onChange={onTangentX} />
          ) : (
            <>
              <Slider label="割点 x₁ =" value={secantX1} min={-8} max={8} step={0.1} onChange={onSecantX1} />
              <Slider label="割点 x₂ =" value={secantX2} min={-8} max={8} step={0.1} onChange={onSecantX2} />
            </>
          )}
        </div>
      )}
      {senior && showArea && (
        <div className="sliderGroup">
          <Slider label="区间 m =" value={areaM} min={-8} max={8} step={0.1} onChange={onAreaM} />
          <Slider label="区间 n =" value={areaN} min={-8} max={8} step={0.1} onChange={onAreaN} />
        </div>
      )}
      <p className="paramHint">提示：点击画布可设置切点；拖拽画布平移，滚轮/按钮缩放</p>
    </div>
  );
}