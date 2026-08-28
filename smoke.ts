// 冒烟测试：node --experimental-strip-types smoke.ts
import { parseAndMakeEvaluator, parse, makeEvaluator, MAX_INPUT_LEN } from "./lib/parser.ts";
import { numericDerivative, secantSlope, PRESETS } from "./lib/derivatives.ts";
import { niceTicks, fmt } from "./lib/math.ts";

let failures = 0;
const assert = (name: string, cond: boolean, extra = "") => {
  if (cond) { console.log("  ✓ " + name); }
  else { failures++; console.error("  ✗ " + name + (extra ? "  [" + extra + "]" : "")); }
};

const evalAt = (s: string, x: number, p?: Record<string, number>) => {
  const r = parseAndMakeEvaluator(s, p ?? {});
  if (!r.ok) throw new Error(r.error ?? "parse fail");
  return r.fn!(x);
};

console.log("== parser ==");
assert("x^3-3x @2 = 2", Math.abs(evalAt("x^3 - 3*x", 2) - 2) < 1e-9);
assert("2sin(x)+1 @0 = 1", Math.abs(evalAt("2*sin(x)+1", 0) - 1) < 1e-12);
assert("1/x @0 非有限（断点）", !isFinite(evalAt("1/x", 0)));
assert("sqrt(x) @4 = 2", evalAt("sqrt(x)", 4) === 2);
assert("ln(-1) = NaN", Number.isNaN(evalAt("ln(x)", -1)));
assert("隐式乘法 2x @3 = 6", evalAt("2x", 3) === 6);
assert("1/2x 左结合 = (1/2)x @4 = 2", evalAt("1/2x", 4) === 2);
assert("隐式乘法 (x+1)(x-1) @2 = 3", evalAt("(x+1)(x-1)", 2) === 3);
assert("隐式乘法 2sin(x) @0 = 0", evalAt("2sin(x)", 0) === 0);
assert("-x^2 @3 = -9", evalAt("-x^2", 3) === -9);
assert("x^-2 @2 = 0.25", evalAt("x^-2", 2) === 0.25);
assert("2e3 = 2000", evalAt("2e3", 1) === 2000);
assert("pi 常量", Math.abs(evalAt("sin(pi/2)", 0) - 1) < 1e-12);
assert("参数 a*x+b @5 (a=2,b=1) = 11", evalAt("a*x + b", 5, { a: 2, b: 1 }) === 11);
let threw = false;
try { evalAt("x@", 1); } catch { threw = true; }
assert("非法字符抛错", threw);
assert("全角符号拒绝", (() => { try { evalAt("2×x", 1); return false; } catch { return true; } })());
assert("超长输入拒绝", (() => { try { evalAt("x".repeat(MAX_INPUT_LEN + 5), 1); return false; } catch { return true; } })());

console.log("== derivatives ==");
const f = (x: number) => x * x; // f' = 2x
assert("数值微分 x² @3 = 6", Math.abs(numericDerivative(f, 3) - 6) < 1e-6);
assert("割线斜率 (x², 1..3) = 4", Math.abs(secantSlope(f, 1, 3) - 4) < 1e-9);
assert("预设数量 = 7", PRESETS.length === 7);
assert("预设全部含公式", PRESETS.every((p) => p.formulas.length > 0));
assert("预设全部含易错点", PRESETS.every((p) => p.warn.length > 0));

console.log("== math ==");
const t = niceTicks(-8, 8, 10);
assert("niceTicks 覆盖区间", t.ticks[0] <= -8 && t.ticks[t.ticks.length - 1] >= 8, JSON.stringify(t));
assert("fmt(1.50) = 1.5", fmt(1.5) === "1.5");

console.log(failures === 0 ? "\nALL PASS" : "\nFAILURES: " + failures);
process.exit(failures === 0 ? 0 : 1);