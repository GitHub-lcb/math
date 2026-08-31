"use client";
// 关于弹层：站点信息、快捷键入口、版本
import { useEffect } from "react";
import { SITE_NAME, SITE_DESC } from "@/lib/siteConfig";
import { IconX } from "./icons";

export default function AboutPanel({ open, onClose, onOpenHelp }: {
  open: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="helpOverlay" onClick={onClose}>
      <div className="helpPanel aboutPanel" role="dialog" aria-label="关于" onClick={(e) => e.stopPropagation()}>
        <div className="helpHead">
          <h2>{SITE_NAME}</h2>
          <button className="iconBtn" onClick={onClose} aria-label="关闭"><IconX size={15} /></button>
        </div>
        <div className="helpBody aboutBody">
          <p>{SITE_DESC}</p>
          <ul className="aboutList">
            <li>🧪 实验一：函数图像与导数探究 —— 表达式引擎 · 切线 · 导数 · 拐点</li>
            <li>📐 实验二：单位圆与三角函数线 —— 三角联动 · 自动旋转</li>
            <li>🖼 实验三：圆锥曲线画板 —— 椭圆 / 双曲线 / 抛物线定义验证</li>
            <li>🎯 每个实验带挑战任务，自动判分、进度本地保存</li>
            <li>🔗 实验状态同步地址栏：刷新与分享链接即恢复现场</li>
            <li>✏️ 顶栏手写板支持整屏圈画讲解</li>
          </ul>
          <div className="aboutActions">
            <button className="demoBtn" onClick={() => { onOpenHelp(); onClose(); }}>查看操作与快捷键</button>
          </div>
          <p className="aboutMeta">v0.3 · Next.js 15 · 本地运行版 · 供学习参考</p>
        </div>
      </div>
    </div>
  );
}