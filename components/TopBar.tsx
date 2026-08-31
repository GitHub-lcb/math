"use client";
import { IconMoon, IconPen, IconQuadrant, IconSun, IconMenu, IconX } from "./icons";
import { SITE_NAME } from "@/lib/siteConfig";

interface TopBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenAnnotation: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  helpOpen: boolean;
  onToggleHelp: () => void;
}

export default function TopBar({ theme, onToggleTheme, onOpenAnnotation, sidebarOpen, onToggleSidebar, helpOpen, onToggleHelp }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brandGroup">
        <button className="iconBtn menuBtn" onClick={onToggleSidebar} aria-label={sidebarOpen ? "收起课程目录" : "展开课程目录"} title="课程目录">
          {sidebarOpen ? <IconX size={18} /> : <IconMenu size={18} />}
        </button>
        <div className="brandMark" aria-hidden="true">
          <IconQuadrant size={20} />
        </div>
        <div className="brandCopy">
          <h1 className="brandName">{SITE_NAME}</h1>
          <p className="brandTag">初高中数学可视化交互实验</p>
        </div>
      </div>
      <div className="topbarActions">
        <button className="iconBtn" onClick={onToggleTheme} aria-label="切换主题" title={theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"}>
          {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
        <button className="iconBtn" onClick={onOpenAnnotation} aria-label="打开手写板" title="手写板：整屏圈画讲解（不动页面内容）">
          <IconPen size={17} />
        </button>
        <button
          className={"iconBtn helpBtn" + (helpOpen ? " active" : "")}
          onClick={onToggleHelp}
          aria-label="操作帮助"
          title="操作帮助 / 快捷键（?）"
        >
          ?
        </button>
      </div>
    </header>
  );
}