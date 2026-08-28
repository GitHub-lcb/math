"use client";
// 首次进入引导气泡（sessionStorage 控制，仅提示一次）
import { useEffect, useState } from "react";
import { IconX } from "./icons";

const TIPS = [
  "拖动 a/b/c 滑块，图像实时变化",
  "点击画布任意位置 = 设置切点",
  "试试「自动演示」：看参数与斜率的变化",
];
const KEY = "math-guide-seen-v1";

export default function GuideToast() {
  const [shown, setShown] = useState<boolean[]>(() => TIPS.map(() => false));
  const [off, setOff] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch { /* ignore */ }
    if (seen) { setOff(true); return; }
    const timers = TIPS.map((_, i) =>
      window.setTimeout(() => {
        setShown((s) => {
          const n = s.slice();
          n[i] = true;
          return n;
        });
      }, 900 + i * 1100)
    );
    const stop = window.setTimeout(() => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setOff(true);
    }, 900 + TIPS.length * 1100 + 9000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(stop);
    };
  }, []);

  if (off) return null;
  const visible = shown.some(Boolean);
  if (!visible) return null;

  return (
    <div className="guideWrap">
      {shown.map((v, i) =>
        v ? (
          <div className="guideToast" key={i} style={{ animationDelay: (i * 0.12) + "s" }}>
            <span className="guideStep">{i + 1}</span>
            <span className="guideText">{TIPS[i]}</span>
            <button
              className="guideClose"
              aria-label="关闭引导"
              onClick={() => {
                try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
                setOff(true);
              }}
            >
              <IconX size={12} />
            </button>
          </div>
        ) : null
      )}
    </div>
  );
}