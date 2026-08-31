"use client";
// 快捷键与操作帮助弹层
import { useEffect } from "react";
import { IconX } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  lab: "function" | "trig" | "conic";
}

export default function HelpPanel({ open, onClose, lab }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows: { k: string; d: string }[] = lab === "function"
    ? [
        { k: "1 – 7", d: "切换预设函数（二次/三次/正弦…）" },
        { k: "R", d: "重置当前实验" },
        { k: "D", d: "参数自动演示（再按停止）" },
        { k: "T", d: "切点巡航演示（再按停止）" },
        { k: "?", d: "打开/关闭本帮助" },
        { k: "拖拽", d: "平移坐标系" },
        { k: "滚轮", d: "缩放视图" },
        { k: "点击", d: "设置切点（画布上）" },
        { k: "点击数值", d: "精确输入参数" },
      ]
    : lab === "trig"
      ? [
          { k: "▶", d: "自动旋转（角度持续增加）" },
          { k: "↺", d: "角度归零" },
          { k: "θ 滑块", d: "0°–360° 逐步设置角度" },
          { k: "点击圆上", d: "直接设定角度" },
          { k: "?", d: "打开/关闭本帮助" },
        ]
      : [
          { k: "类型胶囊", d: "椭圆 / 双曲线 / 抛物线 切换" },
          { k: "a / b / p", d: "形状参数（半长轴/半短轴/焦准距）" },
          { k: "动点 P", d: "沿曲线行走，实时验证定义" },
          { k: "?", d: "打开/关闭本帮助" },
        ];

  return (
    <div className="helpOverlay" onClick={onClose}>
      <div className="helpPanel" role="dialog" aria-label="操作帮助" onClick={(e) => e.stopPropagation()}>
        <div className="helpHead">
          <h2>操作与快捷键</h2>
          <button className="iconBtn" onClick={onClose} aria-label="关闭帮助">
            <IconX size={15} />
          </button>
        </div>
        <div className="helpBody">
          {rows.map((r, i) => (
            <div className="helpRow" key={i}>
              <kbd className="helpKey">{r.k}</kbd>
              <span className="helpDesc">{r.d}</span>
            </div>
          ))}
        </div>
        <p className="helpNote">提示：所有实验状态自动同步到地址栏，刷新或分享链接即恢复现场。</p>
      </div>
    </div>
  );
}