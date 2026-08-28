// 安全数学表达式解析器：tokenizer + Pratt 解析 + 求值
// 支持: 常量 pi e；变量 x；参数 a b c d；+ - * / ^；一元 +/-；函数白名单；隐式乘法

export type Expr =
  | { type: "num"; value: number }
  | { type: "var"; name: string } // x
  | { type: "param"; name: string } // a b c d
  | { type: "unary"; op: "+" | "-"; arg: Expr }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; lhs: Expr; rhs: Expr }
  | { type: "call"; name: string; arg: Expr };

export class ParseError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.name = "ParseError";
    this.pos = pos;
  }
}

// ---------- 词法 ----------
type Tok =
  | { t: "num"; v: number; pos: number }
  | { t: "ident"; v: string; pos: number }
  | { t: "op"; v: string; pos: number }
  | { t: "lparen"; pos: number }
  | { t: "rparen"; pos: number }
  | { t: "eof"; pos: number };

const FUNCS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "ln", "log2", "log10", "abs", "sqrt", "exp", "sign", "floor", "ceil",
]);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  const pushErr = (msg: string, pos: number): never => {
    throw new ParseError(msg, pos);
  };
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      // 数字字面量（含 .5 / 1.5 / 1e3 / 2e-3）
      const start = i;
      let seenDot = false, seenExp = false;
      while (i < n) {
        const ch = src[i];
        if (/[0-9]/.test(ch)) { i++; continue; }
        if (ch === "." && !seenDot && !seenExp) { seenDot = true; i++; continue; }
        if ((ch === "e" || ch === "E") && !seenExp) {
          // 仅在后面跟数字（或 +/- 数字）时才算科学计数
          const j = i + 1;
          let k = j;
          if (k < n && (src[k] === "+" || src[k] === "-")) k++;
          if (k < n && /[0-9]/.test(src[k])) { seenExp = true; i = k + 1; continue; }
          break;
        }
        break;
      }
      // 纯 '.' 不是数字
      const raw = src.slice(start, i);
      if (raw === ".") pushErr("无法识别的符号: .", start);
      const v = parseFloat(raw);
      if (!isFinite(v)) pushErr("数字格式不正确: " + raw, start);
      toks.push({ t: "num", v, pos: start });
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const start = i;
      while (i < n && /[a-zA-Z]/.test(src[i])) i++;
      toks.push({ t: "ident", v: src.slice(start, i), pos: start });
      continue;
    }
    if ("+-*/^(),".includes(c)) {
      if (c === "(") toks.push({ t: "lparen", pos: i });
      else if (c === ")") toks.push({ t: "rparen", pos: i });
      else if (c === ",") toks.push({ t: "op", v: ",", pos: i });
      else toks.push({ t: "op", v: c, pos: i });
      i++;
      continue;
    }
    pushErr("无法识别的符号: " + c, i);
  }
  toks.push({ t: "eof", pos: n });
  return toks;
}

// ---------- 解析 ----------
const PREC: Record<string, number> = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 40 };

const IMPLICIT_MULT_START = (t: Tok): boolean =>
  t.t === "num" || t.t === "ident" || t.t === "lparen";

export const MAX_INPUT_LEN = 200;
export const MAX_DEPTH = 20;

export function parse(src: string): Expr {
  if (src.length > MAX_INPUT_LEN) {
    throw new ParseError("表达式过长（最多 " + MAX_INPUT_LEN + " 字符）", MAX_INPUT_LEN);
  }
  if (/[\uFF00-\uFFEF\u3000-\u303F\u00D7\u00F7\u2212\u00B2\u00B3\u221A]/.test(src)) {
    const m = src.match(/[\uFF00-\uFFEF\u3000-\u303F\u00D7\u00F7\u2212\u00B2\u00B3\u221A]/);
    const pos = m ? m.index ?? 0 : 0;
    throw new ParseError("请使用半角符号（全角符号无法识别）", pos);
  }
  const toks = tokenize(src);
  let idx = 0;
  let depth = 0;
  const depthGuard = (): void => {
    depth++;
    if (depth > MAX_DEPTH) throw new ParseError("表达式嵌套过深（最多 " + MAX_DEPTH + " 层）", 0);
  };
  const depthLeave = (): void => { depth--; };
  const peek = (): Tok => toks[idx];
  const next = (): Tok => toks[idx++];
  const expect = (msg: string): Tok => {
    const t = next();
    if (t.t === "eof") throw new ParseError("表达式不完整：" + msg, t.pos);
    return t;
  };

  const parseExpr = (minPrec: number): Expr => {
    depthGuard();
    // 一元正负号：结合度低于 ^（-x^2 = -(x^2)），操作数以 40 级解析
    const t = peek();
    if (t.t === "op" && (t.v === "-" || t.v === "+")) {
      next();
      const arg = parseExpr(40);
      let left: Expr = { type: "unary", op: t.v, arg };
      const res = finishBinary(left, minPrec);
      depthLeave();
      return res;
    }
    let left: Expr = parsePrimary();
    const res = finishBinary(left, minPrec);
    depthLeave();
    return res;
  };

  const finishBinary = (left: Expr, minPrec: number): Expr => {
    for (;;) {
      const t = peek();
      const tokOp = t.t === "op" ? t.v : null;
      let isImplicit = false;
      // 隐式乘法: 2x、2(x+1)、(x+1)2、2sin(x)
      if (tokOp !== null && tokOp !== "," && PREC[tokOp] !== undefined) {
        // 显式二元运算符
      } else if (minPrec <= 20 && (t.t === "num" || t.t === "lparen" || t.t === "ident")) {
        if (t.t === "ident") {
          // 函数调用跟在值后不构成隐式乘法（如 sin(x) 整体是 call；但 x sin(x) 应乘）
          // 判断：ident 后紧跟 lparen 且 ident 是白名单函数，且左侧已是函数调用时避免歧义
          if (FUNCS.has(t.v) && toks[idx + 1].t === "lparen") {
            // x sin(x)：前一个是函数调用结果，此时应乘；而 sin(x) sin(x) 应乘
            isImplicit = true;
          } else {
            isImplicit = true;
          }
        } else {
          isImplicit = true;
        }
      } else {
        break;
      }
      let prec: number;
      let rightAssoc = false;
      if (isImplicit) {
        prec = 20;
      } else {
        prec = PREC[tokOp ?? ""] ?? 0;
        rightAssoc = tokOp === "^";
      }
      if (prec < minPrec) break;
      if (isImplicit) {
        // 隐式乘不带操作符 token
      } else {
        next();
      }
      const rhs = parseExpr(rightAssoc ? prec : prec + 1);
      left = { type: "binary", op: (isImplicit ? "*" : tokOp) as any, lhs: left, rhs };
    }
    return left;
  };

  const parsePrimary = (): Expr => {
    const t = next();
    switch (t.t) {
      case "num":
        return { type: "num", value: t.v };
      case "ident": {
        const name = t.v;
        // 函数调用
        if (peek().t === "lparen") {
          if (!FUNCS.has(name)) {
            throw new ParseError(name + " 不是可用的函数（可用: sin cos tan ln log2 log10 abs sqrt exp ...）", t.pos);
          }
          next(); // (
          const arg = parseExpr(0);
          const close = next();
          if (close.t !== "rparen") {
            const p = close.t === "eof" ? close.pos : close.pos;
            throw new ParseError("函数 " + name + " 缺少右括号 )", p);
          }
          return { type: "call", name, arg };
        }
        if (name === "pi" || name === "e") return { type: "num", value: name === "pi" ? Math.PI : Math.E };
        if (name === "x") return { type: "var", name };
        if (/^[abcd]$/.test(name)) return { type: "param", name };
        throw new ParseError("未知符号: " + name + "（可用 x、a b c d、pi、e）", t.pos);
      }
      case "lparen": {
        const inner = parseExpr(0);
        const close = next();
        if (close.t !== "rparen") {
          const p = close.t === "eof" ? close.pos : close.pos;
          throw new ParseError("缺少右括号 )", p);
        }
        return inner;
      }
      default:
        throw new ParseError(
          t.t === "eof" ? "表达式不完整" : "此处不能出现: " + String((t as any).v ?? "("),
          t.pos
        );
    }
  };

  const expr = parseExpr(0);
  const tail = peek();
  if (tail.t !== "eof") {
    throw new ParseError("多余的符号: " + (tail.t === "op" ? tail.v : "("), tail.pos);
  }
  return expr;
}

// ---------- 求值 ----------
export interface EvalParams {
  [name: string]: number; // a, b, c, d
}

export function makeEvaluator(expr: Expr, params: EvalParams = {}): (x: number) => number {
  const ev = (e: Expr, x: number): number => {
    switch (e.type) {
      case "num": return e.value;
      case "var": return x;
      case "param": {
        const v = params[e.name];
        return v === undefined || Number.isNaN(v) ? 0 : v;
      }
      case "unary":
        return e.op === "-" ? -ev(e.arg, x) : ev(e.arg, x);
      case "binary": {
        const a = ev(e.lhs, x);
        const b = ev(e.rhs, x);
        switch (e.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return a / b; // 除零 → ±Infinity，画布按断点处理
          case "^": return Math.pow(a, b);
        }
        return NaN;
      }
      case "call": {
        const a = ev(e.arg, x);
        switch (e.name) {
          case "sin": return Math.sin(a);
          case "cos": return Math.cos(a);
          case "tan": return Math.tan(a);
          case "asin": return Math.asin(a);
          case "acos": return Math.acos(a);
          case "atan": return Math.atan(a);
          case "ln": return Math.log(a);
          case "log2": return Math.log2(a);
          case "log10": return Math.log10(a);
          case "abs": return Math.abs(a);
          case "sqrt": return Math.sqrt(a);
          case "exp": return Math.exp(a);
          case "sign": return Math.sign(a);
          case "floor": return Math.floor(a);
          case "ceil": return Math.ceil(a);
        }
        return NaN;
      }
    }
  };
  return (x: number) => ev(expr, x);
}

// 收集表达式中出现的参数名（a-d），用于生成滑块
export function collectParams(expr: Expr): string[] {
  const out: string[] = [];
  const walk = (e: Expr): void => {
    if (e.type === "param") { if (!out.includes(e.name)) out.push(e.name); return; }
    if (e.type === "unary") { walk(e.arg); return; }
    if (e.type === "binary") { walk(e.lhs); walk(e.rhs); return; }
    if (e.type === "call") { walk(e.arg); return; }
  };
  walk(expr);
  return out;
}

// 一站式入口
export interface ParseResult {
  ok: boolean;
  fn?: (x: number) => number;
  error?: string;
  params?: string[];
}

export function parseAndMakeEvaluator(input: string, params: EvalParams = {}): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "请输入函数表达式" };
  try {
    const expr = parse(text);
    return { ok: true, fn: makeEvaluator(expr, params), params: collectParams(expr) };
  } catch (err) {
    if (err instanceof ParseError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "表达式无法识别" };
  }
}
