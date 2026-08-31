"use client";
// 课程目录侧边栏：学段切换 / 搜索 / 免费体验 / 模块树
import { useMemo, useState } from "react";
import { CATALOG, countModules, countExperiments, FLAGSHIP_ID, STAGE_NAMES, type Module, type Stage } from "@/lib/catalog";
import { IconChevronDown, IconChevronRight, IconLock, IconQuadrant, IconSearch, IconSparkles, MODULE_ICONS } from "./icons";

interface CatalogSidebarProps {
  stage: Stage;
  onStageChange: (s: Stage) => void;
  activeId: string;
  onSelect: (id: string) => void;
  onExpand: () => void; // 桌面端收起时的展开回调
  onOpenAbout: () => void;
}

export default function CatalogSidebar({ stage, onStageChange, activeId, onSelect, onExpand, onOpenAbout }: CatalogSidebarProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const modules = CATALOG[stage];
  // 默认展开包含旗舰实验的模块
  const flagshipModuleTitles = useMemo(
    () =>
      modules
        .filter((m) => m.experiments.some((e) => e.id === FLAGSHIP_ID))
        .map((m) => m.title),
    [modules]
  );
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(flagshipModuleTitles.map((t) => [t, true]))
  );
  const q = query.trim().toLowerCase();

  // 过滤模块与实验
  const filtered = useMemo(() => {
    if (!q) return modules.map((m) => ({ module: m, experiments: m.experiments }));
    return modules
      .map((m) => ({
        module: m,
        experiments: m.experiments.filter((e) =>
          e.name.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
        ),
      }))
      .filter((x) => x.experiments.length > 0);
  }, [modules, q]);

  const matched = filtered.reduce((s, x) => s + x.experiments.length, 0);
  // 免费体验组：当前学段内所有可用实验（按模块分组）
  const freeExperiments = modules
    .map((mod) => ({ mod, exps: mod.experiments.filter((e) => e.available) }))
    .filter((x) => x.exps.length > 0)
    .flatMap((x) => x.exps.map((exp) => ({ mod: x.mod, exp })));

  if (collapsed) {
    return (
      <aside className="sidebar sidebarCollapsed">
        <button className="sidebarExpandBtn" onClick={() => setCollapsed(false)} aria-label="展开课程目录" title="展开课程目录">
          <IconQuadrant size={18} />
          <span className="sidebarExpandLabel">目录</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="课程目录侧边栏">
      <section className="catalogCard">
        <div className="catalogCardIconFrame"><IconQuadrant size={22} /></div>
        <div className="catalogCardCopy">
          <h2>数学目录</h2>
          <p>模块化{STAGE_NAMES[stage]}数学实验</p>
        </div>
        <div className="catalogCardStat" aria-label={countModules(stage) + " 个学习模块"}>
          <strong>{countModules(stage)}</strong>
          <span>学习模块</span>
        </div>
      </section>

      <div className="stageSwitch" role="group" aria-label="学段切换">
        <span className="stageSwitchThumb" style={{ transform: "translateX(" + (stage === "senior" ? "0px" : "54px") + ")" }} aria-hidden="true" />
        {(["senior", "junior"] as Stage[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={stage === s}
            aria-label={"切换到" + STAGE_NAMES[s] + "目录"}
            className={"stagePill" + (stage === s ? " active" : "")}
            onClick={() => {
              const nextModules = CATALOG[s];
              const open: Record<string, boolean> = {};
              for (const m of nextModules) {
                if (m.experiments.some((e) => e.id === FLAGSHIP_ID)) open[m.title] = true;
              }
              onStageChange(s);
              setOpenModules(open);
            }}
          >
            {STAGE_NAMES[s]}
          </button>
        ))}
      </div>

      <section className="sidebarBlock">
        <div className="sidebarBlockHead">
          <h3>学习模块</h3>
          <div className="sidebarBlockMeta">
            <span>{countExperiments(stage)} 个互动实验</span>
            <button className="iconBtn" onClick={() => setCollapsed(true)} aria-label="收起课程目录" title="收起课程目录">
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="sidebarSearch" role="search">
          <div className="sidebarSearchField">
            <IconSearch size={15} />
            <input
              aria-label="搜索实验目录"
              placeholder="搜实验名 / 知识点 / 易错点"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {!q && freeExperiments.length > 0 && (
          <div className="freeGroup" data-free="true">
            <div className="freeGroupHead">
              <IconSparkles size={14} className="freeSparkle" />
              <strong>免费体验</strong>
            </div>
            <div className="freeGroupBody">
              {freeExperiments.map(({ mod, exp }) => (
                <div key={exp.id} className="freeExpBlock">
                  <div className="moduleRow">
                    <div className="moduleHead">
                      <span className="moduleTitle"><IconTrendingDot />{mod.title}</span>
                      <span className="moduleBadge">{mod.experiments.length}</span>
                    </div>
                  </div>
                  <button className={"expRow" + (activeId === exp.id ? " active" : "") + " expRowFree"} onClick={() => onSelect(exp.id)}>
                    <span className="expName">★ {exp.name}</span>
                    <span className="expFreeTag">免费</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebarAbout">
          <button onClick={onOpenAbout} className="aboutBtn" aria-label="关于本实验室">
            <span className="aboutMark">◈</span> 关于「象限先生的数学实验室」
            <span className="aboutVersion">v0.3</span>
          </button>
        </div>
        <div className="chapterList" data-sidebar-scroll-area="true">
          {filtered.length === 0 && (
            <p className="noResult">未找到匹配实验，换个关键词试试～</p>
          )}
          {filtered.map(({ module, experiments }) => {
            const mod = module as Module;
            const open = openModules[mod.title] ?? query.length > 0;
            const isFlagsModule = mod.experiments.some((e) => e.id === FLAGSHIP_ID);
            return (
              <article
                className={"chapterShell" + (isFlagsModule ? " chapterFree" : "")}
                key={mod.title}
                style={mod.hue ? ({ "--mod-hue": mod.hue } as React.CSSProperties) : undefined}
              >
                <button className="chapterMain" aria-expanded={open} onClick={() => setOpenModules((s) => ({ ...s, [mod.title]: !(s[mod.title] ?? false) }))}>
                  <span className="chapterIcon">{MODULE_ICONS[mod.icon] ? (() => { const I = MODULE_ICONS[mod.icon]; return <I size={16} />; })() : <IconQuadrant size={16} />}</span>
                  <strong className="chapterTitle">{mod.title}{isFlagsModule ? " ★" : ""}</strong>
                  <span className="chapterCount">{experiments.length}</span>
                  {open ? <IconChevronDown size={14} className="chapterArrow" /> : <IconChevronRight size={14} className="chapterArrow" />}
                </button>
                {open && (
                  <div className="chapterBody">
                    {experiments.map((e) =>
                      e.available ? (
                        <button key={e.id} className={"expRow" + (activeId === e.id ? " active" : "")} onClick={() => onSelect(e.id)}>
                          <span className="expName">{e.name}</span>
                          <span className="expDot" />
                        </button>
                      ) : (
                        <div key={e.id} className="expRow locked" title={e.lockedNote ?? "即将上线"}>
                          <span className="expName">{e.name}</span>
                          <span className="expLockedTag"><IconLock size={11} />{e.lockedNote ?? "即将上线"}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function IconTrendingDot() {
  return <span className="trendingDot" aria-hidden="true" />;
}