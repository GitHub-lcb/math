// 全交互回归测试：CDP 驱动 headless Chrome 真实操作每个控件
// 运行: node scripts/interact-test.mjs   (需服务器已在 localhost:3000)
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const PORT = 9333;
const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const userDir = path.join(os.tmpdir(), "dsh-chrome-" + Date.now());
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--disable-extensions",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + userDir, "--no-first-run", "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

let failures = 0;
let passed = 0;
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
const RESULT_FILE = "E:\\develop-lcb\\workspace-tools\\math\\scripts\\results.txt";
const assert = (name, cond, extra) => {
  if (cond) { passed++; console.log("  ✓ " + name); }
  else {
    failures++;
    console.log("  ✗ " + name + (extra ? "  [" + extra + "]" : ""));
    try { appendFileSync(RESULT_FILE, "FAIL " + name + " | " + (extra || "") + "\n"); } catch { }
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createTarget(url) {
  let lastErr;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("http://127.0.0.1:" + PORT + "/json/new?" + encodeURIComponent(url || "about:blank"), { method: "PUT" });
      if (res.ok) return await res.json();
      lastErr = new Error("HTTP " + res.status);
    } catch (e) { lastErr = e; }
    await sleep(300);
  }
  throw lastErr || new Error("CDP 无响应");
}

let msgId = 0;
const pending = new Map();
let ws;
function send(method, params) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params: params || {} }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { pending.delete(id); reject(new Error(method + " 超时")); }, 15000);
  });
}

async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("eval 异常: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}

const TOOLS = String.raw`
window.__T = {
  click: (sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; },
  text: (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; },
  exists: (sel) => !!document.querySelector(sel),
  count: (sel) => document.querySelectorAll(sel).length,
  theme: () => document.documentElement.dataset.theme,
  setRange: (sel, v) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    s.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },
  setInput: (sel, v) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    s.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  },
  key: (k) => { window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); return true; },
  canvasHash: () => {
    const cv = document.querySelector("canvas.experimentCanvas");
    if (!cv) return null;
    try {
      const s = cv.toDataURL();
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
      return s.length + ":" + h.toString(36);
    } catch { return "ERR"; }
  },
  selectValue: (sel) => {
    const el = document.querySelector(sel);
    return el ? el.value : null;
  },
  url: () => location.search,
  clickCanvas: (fx, fy) => {
    const cv = document.querySelector("canvas.experimentCanvas");
    if (!cv) return false;
    cv.setPointerCapture = () => {};
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width * (fx ?? 0.42);
    const y = r.top + r.height * (fy ?? 0.45);
    cv.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: x, clientY: y }));
    cv.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX: x, clientY: y }));
    return true;
  },
  dragCanvas: () => {
    const cv = document.querySelector("canvas.experimentCanvas");
    if (!cv) return false;
    cv.setPointerCapture = () => {};
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width * 0.5, y = r.top + r.height * 0.5;
    cv.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: x, clientY: y }));
    cv.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: x + 90, clientY: y + 50 }));
    cv.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX: x + 90, clientY: y + 50 }));
    return true;
  },
  wheel: (dy) => {
    const cv = document.querySelector("canvas.experimentCanvas");
    if (!cv) return false;
    cv.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, bubbles: true, cancelable: true }));
    return true;
  },
};
"";
`;

const sleepInPage = (ms) => evalJs("new Promise(r => setTimeout(r, " + ms + "))");

// CDP 真实输入事件（比合成 DOM 事件更接近真实用户）
async function cdpClick(sel) {
  const rect = await evalJs(
    "(() => { const el = document.querySelector(" + JSON.stringify(sel) + "); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()"
  );
  if (!rect) return false;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  return true;
}
async function cdpKey(k) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: "Digit" + k, windowsVirtualKeyCode: k.charCodeAt(0) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: "Digit" + k, windowsVirtualKeyCode: k.charCodeAt(0) });
  return true;
}

async function openApp(url) {
  await send("Page.navigate", { url: url || "http://localhost:3000/" });
  // 等页面真正渲染：readyState + 顶栏 + 画布都存在
  let ok = false;
  for (let i = 0; i < 90 && !ok; i++) {
    await sleep(300);
    try {
      const rs = await evalJs("document.readyState");
      const hdr = await evalJs("!!document.querySelector(" + JSON.stringify("header.topbar") + ")");
      const cv = await evalJs("!!document.querySelector(" + JSON.stringify("canvas") + ")");
      ok = rs === "complete" && hdr && cv;
    } catch { }
  }
  if (!ok) throw new Error("页面未能渲染: " + url);
  await evalJs(TOOLS);
  await sleepInPage(800);
}

// ============ 主流程 ============
try {
  const target = await createTarget("about:blank");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const cb = pending.get(m.id);
      pending.delete(m.id);
      m.error ? cb.reject(new Error(m.error.message)) : cb.resolve(m.result);
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");

  console.log("== A. 初始与顶栏 ==");
  await openApp("http://localhost:3000/?lab=function-and-derivative");
  assert("A1 暗色主题默认", (await evalJs("window.__T.theme()")) === "dark");
  assert("A2 顶栏存在", await evalJs("window.__T.exists(" + JSON.stringify("header.topbar") + ")"));
  const thBefore = await evalJs("window.__T.canvasHash()");
  await evalJs("window.__T.click(" + JSON.stringify(".topbarActions button:first-child") + ")");
  await sleepInPage(300);
  assert("A3 主题切换→亮色", (await evalJs("window.__T.theme()")) === "light");
  await evalJs("window.__T.click(" + JSON.stringify(".topbarActions button:first-child") + ")");
  await sleepInPage(200);
  assert("A4 主题切回暗色", (await evalJs("window.__T.theme()")) === "dark");
  await evalJs("window.__T.click(" + JSON.stringify("button[aria-label=打开手写板]") + ")");
  await sleepInPage(200);
  assert("A5 手写板打开", await evalJs("window.__T.exists(" + JSON.stringify(".annotationOverlay") + ")"));
  await evalJs("document.dispatchEvent(new KeyboardEvent(" + JSON.stringify("keydown") + ", { key: " + JSON.stringify("Escape") + ", bubbles: true }))");
  await sleepInPage(200);
  assert("A6 手写板 Esc 关闭", !(await evalJs("window.__T.exists(" + JSON.stringify(".annotationOverlay") + ")")));
  await evalJs("window.__T.click(" + JSON.stringify("button[aria-label=操作帮助]") + ")");
  await sleepInPage(250);
  assert("A7 帮助面板打开", await evalJs("window.__T.exists(" + JSON.stringify(".helpPanel") + ")"));
  await evalJs("document.dispatchEvent(new KeyboardEvent(" + JSON.stringify("keydown") + ", { key: " + JSON.stringify("Escape") + ", bubbles: true }))");
  await sleepInPage(200);

  console.log("== B. 侧边栏 ==");
  assert("B1 模块章节数>5", (await evalJs("window.__T.count(" + JSON.stringify(".chapterMain") + ")")) > 5);
  const oc1 = await evalJs("window.__T.count(" + JSON.stringify(".chapterBody .expRow") + ")");
  await evalJs("window.__T.click(" + JSON.stringify(".chapterMain") + ")");
  await sleepInPage(200);
  const oc2 = await evalJs("window.__T.count(" + JSON.stringify(".chapterBody .expRow") + ")");
  assert("B2 模块展开/收起响应", oc1 !== oc2, oc1 + "->" + oc2);
  await evalJs("window.__T.setInput(" + JSON.stringify(".sidebarSearchField input") + ", " + JSON.stringify("导数") + ")");
  await sleepInPage(300);
  const sr = await evalJs("window.__T.text(" + JSON.stringify(".chapterList") + ")");
  assert("B3 搜索过滤响应", sr !== null && sr.indexOf("导数") >= 0);
  await evalJs("window.__T.setInput(" + JSON.stringify(".sidebarSearchField input") + ", " + JSON.stringify("") + ")");
  await sleepInPage(250);
  await evalJs("window.__T.click(" + JSON.stringify(".stagePill:last-child") + ")");
  await sleepInPage(250);
  const secantN = await evalJs("window.__T.count(" + JSON.stringify("input[type=range]") + ")");
  assert("B4 初中模式割点滑块出现", secantN >= 4, String(secantN));
  await evalJs("(() => { const el = document.querySelector(" + JSON.stringify(".presetSelect") + "); const s = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, " + JSON.stringify("value") + ").set; s.call(el, " + JSON.stringify("exponential") + "); el.dispatchEvent(new Event(" + JSON.stringify("change") + ", { bubbles: true })); return true; })()");
  await sleepInPage(780);
  const chipTxt = await evalJs("window.__T.text(" + JSON.stringify(".stageChip") + ")");
  assert("B5 初中选高中预设→自动切回高中", chipTxt === "高中实验", chipTxt);
  await evalJs("(() => { const b = document.querySelectorAll(" + JSON.stringify(".expRowFree") + ")[1]; if (b) b.click(); return !!b; })()");
  await sleepInPage(600);
  assert("B6 侧栏切到单位圆", await evalJs("window.__T.exists(" + JSON.stringify(".trigWrap") + ")"));
  await evalJs("(() => { const b = document.querySelectorAll(" + JSON.stringify(".expRowFree") + ")[0]; if (b) b.click(); return !!b; })()");
  await sleepInPage(600);
  assert("B7 切回函数实验", await evalJs("window.__T.exists(" + JSON.stringify(".canvasWrap") + ")") && !(await evalJs("window.__T.exists(" + JSON.stringify(".trigWrap") + ")")));
  await evalJs("window.__T.click(" + JSON.stringify(".sidebarBlockMeta .iconBtn") + ")");
  await sleepInPage(250);
  assert("B8 侧栏收起", await evalJs("window.__T.exists(" + JSON.stringify(".sidebarCollapsed") + ")"));
  await evalJs("window.__T.click(" + JSON.stringify(".sidebarExpandBtn") + ")");
  await sleepInPage(250);
  assert("B9 侧栏展开恢复", !(await evalJs("window.__T.exists(" + JSON.stringify(".sidebarCollapsed") + ")")));
  await evalJs("window.__T.click(" + JSON.stringify(".aboutBtn") + ")");
  await sleepInPage(250);
  assert("B10 关于面板打开", await evalJs("window.__T.exists(" + JSON.stringify(".aboutPanel") + ")"));
  await evalJs("document.dispatchEvent(new KeyboardEvent(" + JSON.stringify("keydown") + ", { key: " + JSON.stringify("Escape") + ", bubbles: true }))");
  await sleepInPage(200);

  console.log("== C. 函数实验交互 ==");
  await openApp("http://localhost:3000/?lab=function-and-derivative");
  await evalJs("window.__T.setInput(" + JSON.stringify(".exprField input") + ", " + JSON.stringify("x^3 - 3*x") + ")");
  await sleepInPage(350);
  assert("C1 合法表达式无错误", !(await evalJs("window.__T.exists(" + JSON.stringify(".parseError") + ")")));
  await evalJs("window.__T.setInput(" + JSON.stringify(".exprField input") + ", " + JSON.stringify("x@@") + ")");
  await sleepInPage(350);
  assert("C2 非法表达式标红提示", await evalJs("window.__T.exists(" + JSON.stringify(".parseError") + ")"), await evalJs("window.__T.text(" + JSON.stringify(".parseError") + ")"));
  await evalJs("window.__T.setInput(" + JSON.stringify(".exprField input") + ", " + JSON.stringify("a*x^2+b*x+c") + ")");
  await sleepInPage(350);
  const cH1 = await evalJs("window.__T.canvasHash()");
  await evalJs("window.__T.setRange(" + JSON.stringify("input[type=range]") + ", " + 3 + ")");
  await sleepInPage(780);
  const cH2 = await evalJs("window.__T.canvasHash()");
  assert("C3 滑块拖动→画布重绘", cH1 !== cH2, "h:" + JSON.stringify(cH1).slice(0, 80) + " VS " + JSON.stringify(cH2).slice(0, 80));
  const sv = await evalJs("window.__T.text(" + JSON.stringify(".sliderValue") + ")");
  assert("C4 滑块数值显示", sv !== null && sv.indexOf("3") >= 0, sv);
  await evalJs("window.__T.click(" + JSON.stringify(".toggleGroup .toggle") + ")");
  await sleepInPage(300);
  assert("C5 导数开关响应", await evalJs("window.__T.exists(" + JSON.stringify(".toggle.on") + ")"));
  const u1 = await evalJs("window.__T.url()");
  await evalJs("window.__T.clickCanvas()");
  await sleepInPage(780);
  const u2 = await evalJs("window.__T.url()");
  assert("C6 点击画布→URL 切点变化", u1 !== u2, "u:" + u1.slice(0, 60));
  const cH3 = await evalJs("window.__T.canvasHash()");
  await evalJs("window.__T.dragCanvas()");
  await sleepInPage(300);
  const cH4 = await evalJs("window.__T.canvasHash()");
  assert("C7 拖拽平移→画布变化", cH3 !== cH4, "h:" + JSON.stringify(cH3).slice(0, 80) + " VS " + JSON.stringify(cH4).slice(0, 80));
  const cH5 = await evalJs("window.__T.canvasHash()");
  await evalJs("window.__T.wheel(-240)");
  await sleepInPage(300);
  const cH6 = await evalJs("window.__T.canvasHash()");
  assert("C8 滚轮缩放→画布变化", cH5 !== cH6, "h:" + JSON.stringify(cH5).slice(0, 80) + " VS " + JSON.stringify(cH6).slice(0, 80));
  await evalJs("window.__T.click(" + JSON.stringify(".demoBtn") + ")");
  await sleepInPage(600);
  assert("C9 自动演示启动", await evalJs("window.__T.exists(" + JSON.stringify(".demoBtn.running") + ")"));
  await evalJs("window.__T.click(" + JSON.stringify(".demoBtn.running") + ")");
  await sleepInPage(300);
  assert("C10 演示可停止", !(await evalJs("window.__T.exists(" + JSON.stringify(".demoBtn.running") + ")")));
  await cdpKey("3");
  await sleepInPage(400);
  const psel = await evalJs("window.__T.selectValue(" + JSON.stringify(".presetSelect") + ")");
  assert("C11 快捷键3→正弦预设(正弦是第3个)", psel === "sine", psel);
  await evalJs("window.__T.key(" + JSON.stringify("1") + ")");
  await sleepInPage(350);
  await evalJs("(() => { const bs = document.querySelectorAll(" + JSON.stringify(".tabBtn") + "); if (bs.length) bs[bs.length - 1].click(); return bs.length; })()");
  await sleepInPage(350);
  assert("C12 挑战tab打开", await evalJs("window.__T.exists(" + JSON.stringify(".challengeList") + ")"));
  await evalJs("(() => { const b = document.querySelector(" + JSON.stringify(".challengeBtn") + "); if (b) b.click(); return !!b; })()");
  await sleepInPage(350);
  const chalTxt = await evalJs("window.__T.text(" + JSON.stringify(".challengeList") + ")");
  assert("C13 挑战验证按钮响应", chalTxt !== null && (chalTxt.indexOf("✓") >= 0 || chalTxt.indexOf("✗") >= 0 || chalTxt.indexOf("…") >= 0), chalTxt);

  console.log("== D. 单位圆实验 ==");
  await openApp("http://localhost:3000/?lab=trig-unit-circle&th=45");
  const t1 = await evalJs("window.__T.url()");
  await evalJs("window.__T.setRange(" + JSON.stringify("input[type=range]") + ", " + 120 + ")");
  await sleepInPage(780);
  const t2 = await evalJs("window.__T.url()");
  assert("D1 θ滑块→URL 更新", t1 !== t2, t1.slice(0, 60));
  const d2btnBefore = await evalJs("(() => { const b = document.querySelector(" + JSON.stringify(".canvasToolbar button:first-child") + "); return b ? b.getAttribute(" + JSON.stringify("aria-label") + ") : " + JSON.stringify("NO") + "; })()");
  const d2angleBefore = await evalJs("(() => { const el = document.querySelector(" + JSON.stringify(".angleBig") + "); return el ? el.textContent : " + JSON.stringify("NO") + "; })()");
  console.log("  [dbg] D2 before: btn=" + d2btnBefore + " angle=" + d2angleBefore);
  await cdpClick(".canvasToolbar button");
  await sleepInPage(1600);
  const d2btnAfter = await evalJs("(() => { const b = document.querySelector(" + JSON.stringify(".canvasToolbar button:first-child") + "); return b ? b.getAttribute(" + JSON.stringify("aria-label") + ") : " + JSON.stringify("NO") + "; })()");
  const d2angleAfter = await evalJs("(() => { const el = document.querySelector(" + JSON.stringify(".angleBig") + "); return el ? el.textContent : " + JSON.stringify("NO") + "; })()");
  console.log("  [dbg] D2 after: btn=" + d2btnAfter + " angle=" + d2angleAfter);
  const t3 = await evalJs("window.__T.url()");
  assert("D2 自动旋转→θ 变化", t3 !== t2, "t2=" + t2 + " t3=" + t3);
  await cdpClick(".canvasToolbar button");
  await sleepInPage(300);
  await cdpClick(".canvasToolbar button:nth-child(2)");
  await sleepInPage(800);
  const t4 = await evalJs("window.__T.url()");
  assert("D3 归零按钮→th≈0", t4.indexOf("th=0") >= 0, "url=" + t4);
  await evalJs("window.__T.clickCanvas(0.2, 0.55)");
  await sleepInPage(780);
  const t5 = await evalJs("window.__T.url()");
  assert("D4 点击单位圆→θ 变化", t5 !== t4, t4.slice(0, 40) + "->" + t5.slice(0, 40));
  await evalJs("(() => { const bs = document.querySelectorAll(" + JSON.stringify(".tabBtn") + "); if (bs.length) bs[bs.length - 1].click(); return bs.length; })()");
  await sleepInPage(350);
  assert("D5 三角挑战可用", await evalJs("window.__T.exists(" + JSON.stringify(".challengeList") + ")"));

  console.log("== E. 圆锥曲线实验 ==");
  await openApp("http://localhost:3000/?lab=conic-lab");
  assert("E1 画布存在", await evalJs("window.__T.exists(" + JSON.stringify(".conicWrap canvas") + ")"));
  const c1 = await evalJs("window.__T.url()");
  await evalJs("(() => { const bs = document.querySelectorAll(" + JSON.stringify(".conicTypePill") + "); if (bs.length > 1) bs[1].click(); return bs.length; })()");
  await sleepInPage(780);
  const c2 = await evalJs("window.__T.url()");
  assert("E2 类型切换→URL 更新", c1 !== c2, c1.slice(0, 40) + "->" + c2.slice(0, 40));
  const cTxt = await evalJs("window.__T.text(" + JSON.stringify(".conicTypeSwitch") + ")");
  assert("E3 类型胶囊渲染", cTxt !== null && cTxt.length > 3);
  const s1 = await evalJs("window.__T.url()");
  await evalJs("window.__T.setRange(" + JSON.stringify("input[type=range]") + ", " + 2 + ")");
  await sleepInPage(780);
  const s2 = await evalJs("window.__T.url()");
  assert("E4 参数滑块→URL 更新", s1 !== s2);
  await evalJs("(() => { const bs = document.querySelectorAll(" + JSON.stringify(".tabBtn") + "); if (bs.length) bs[bs.length - 1].click(); return bs.length; })()");
  await sleepInPage(350);
  assert("E5 圆曲挑战可用", await evalJs("window.__T.exists(" + JSON.stringify(".challengeList") + ")"));

  console.log("");
  console.log("SUMMARY: " + passed + " passed, " + failures + " failed");
  chrome.kill();
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error("FATAL: " + err.message);
  chrome.kill();
  process.exit(2);
}
