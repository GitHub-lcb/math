// 课程目录数据：高中 + 初中 双学段
export type Stage = "senior" | "junior";

export interface Experiment {
  id: string;
  name: string;
  keywords: string[]; // 搜索：知识点 / 易错点
  available: boolean;
  lockedNote?: string;
}

export interface Module {
  title: string;
  icon: string; // 图标 key（见 icons.tsx / CSS）
  experiments: Experiment[];
}

export const FLAGSHIP_ID = "function-and-derivative";

const locked = (note = "即将上线"): string => note;

const flags = (id: string, name: string, keywords: string[]): Experiment => ({
  id,
  name,
  keywords,
  available: true,
});

// ---------- 高中（人教版 必修 + 选择性必修 主线） ----------
export const SENIOR: Module[] = [
  {
    title: "集合与常用逻辑用语",
    icon: "set",
    experiments: [
      { id: "sen-set-basic", name: "集合的交并补", keywords: ["集合", "交集", "并集", "补集", "韦恩图", "子集"], available: false, lockedNote: locked() },
      { id: "sen-set-logic", name: "充分条件与必要条件", keywords: ["命题", "充分条件", "必要条件", "充要条件", "逻辑"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "函数与导数",
    icon: "function",
    experiments: [
      flags(FLAGSHIP_ID, "函数图像与导数探究", ["函数", "导数", "切线", "斜率", "极值", "图像", "单调性", "平均变化率", "瞬时变化率"]),
      { id: "sen-func-basic", name: "函数图象与性质", keywords: ["定义域", "值域", "奇偶性", "单调性", "对称性"], available: false, lockedNote: locked() },
      { id: "sen-func-comp", name: "复合函数与图象变换", keywords: ["复合函数", "平移", "伸缩", "翻折", "图象变换"], available: false, lockedNote: locked() },
      { id: "sen-func-extreme", name: "导数与极值最值", keywords: ["极值", "最值", "驻点", "单调区间", "导数应用"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "三角函数",
    icon: "trig",
    experiments: [
      { id: "sen-trig-circle", name: "单位圆与三角函数线", keywords: ["单位圆", "正弦", "余弦", "正切", "三角函数线", "弧度"], available: false, lockedNote: locked() },
      { id: "sen-trig-wave", name: "正弦型函数 y=Asin(ωx+φ)", keywords: ["振幅", "周期", "相位", "初相", "图像变换"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "数列",
    icon: "sequence",
    experiments: [
      { id: "sen-seq-ap", name: "等差数列可视化", keywords: ["等差数列", "公差", "通项公式", "求和"], available: false, lockedNote: locked() },
      { id: "sen-seq-gp", name: "等比数列可视化", keywords: ["等比数列", "公比", "通项公式", "求和", "极限"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "不等式",
    icon: "inequality",
    experiments: [
      { id: "sen-ineq-quad", name: "一元二次不等式", keywords: ["二次不等式", "解集", "判别式", "数轴标根"], available: false, lockedNote: locked() },
      { id: "sen-ineq-basic", name: "基本不等式 a+b≥2√ab", keywords: ["基本不等式", "均值不等式", "最值", "一正二定三相等"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "解析几何",
    icon: "analytic",
    experiments: [
      { id: "sen-anl-conic", name: "圆锥曲线画板", keywords: ["椭圆", "双曲线", "抛物线", "焦点", "准线", "离心率"], available: false, lockedNote: locked() },
      { id: "sen-anl-line", name: "直线与圆的位置关系", keywords: ["直线", "圆", "相交", "相切", "相离", "弦长"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "立体几何",
    icon: "solid",
    experiments: [
      { id: "sen-solid-view", name: "空间几何体与三视图", keywords: ["三视图", "棱柱", "棱锥", "表面积", "体积"], available: false, lockedNote: locked() },
      { id: "sen-solid-angle", name: "二面角与线面角", keywords: ["二面角", "线面角", "空间向量", "垂直"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "概率统计",
    icon: "prob",
    experiments: [
      { id: "sen-prob-count", name: "计数原理与排列组合", keywords: ["加法原理", "乘法原理", "排列", "组合", "二项式"], available: false, lockedNote: locked() },
      { id: "sen-prob-dist", name: "二项分布与正态分布", keywords: ["二项分布", "正态分布", "期望", "方差", "概率密度"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "平面向量与复数",
    icon: "vector",
    experiments: [
      { id: "sen-vec-ops", name: "向量加法与共线", keywords: ["向量", "加法", "减法", "共线", "平行四边形法则"], available: false, lockedNote: locked() },
      { id: "sen-cplx-plane", name: "复平面与棣莫弗公式", keywords: ["复数", "复平面", "模", "辐角", "棣莫弗"], available: false, lockedNote: locked() },
    ],
  },
];

// ---------- 初中（人教版 主线） ----------
export const JUNIOR: Module[] = [
  {
    title: "数与式",
    icon: "algebra",
    experiments: [
      { id: "jun-num-rational", name: "有理数与数轴", keywords: ["有理数", "数轴", "相反数", "绝对值", "大小比较"], available: false, lockedNote: locked() },
      { id: "jun-num-radical", name: "实数与二次根式", keywords: ["实数", "平方根", "二次根式", "无理数"], available: false, lockedNote: locked() },
      { id: "jun-num-exp", name: "整式乘法与因式分解", keywords: ["整式", "乘法公式", "因式分解", "完全平方"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "方程与不等式",
    icon: "equation",
    experiments: [
      { id: "jun-eq-linear", name: "一元一次方程与不等式", keywords: ["一元一次方程", "不等式", "解集", "移项", "系数化1"], available: false, lockedNote: locked() },
      { id: "jun-eq-quad", name: "一元二次方程与判别式", keywords: ["一元二次方程", "判别式", "求根公式", "根与系数"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "函数初步",
    icon: "function",
    experiments: [
      flags(FLAGSHIP_ID, "函数图像与变化规律", ["函数", "图像", "变量", "变化率", "一次函数", "二次函数", "反比例函数", "增减快慢"]),
      { id: "jun-func-proportion", name: "正比例与反比例函数", keywords: ["正比例函数", "反比例函数", "k 值", "图象", "增减性"], available: false, lockedNote: locked() },
      { id: "jun-func-linear", name: "一次函数与图象", keywords: ["一次函数", "y=kx+b", "斜率", "截距", "图象"], available: false, lockedNote: locked() },
      { id: "jun-func-quad", name: "二次函数图象", keywords: ["二次函数", "抛物线", "顶点", "对称轴", "开口方向"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "三角形与四边形",
    icon: "geometry",
    experiments: [
      { id: "jun-geo-triangle", name: "全等与相似三角形", keywords: ["全等", "相似", "对应边", "对应角", "判定"], available: false, lockedNote: locked() },
      { id: "jun-geo-quad", name: "平行四边形与特殊四边形", keywords: ["平行四边形", "矩形", "菱形", "正方形", "对角线"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "圆",
    icon: "circle",
    experiments: [
      { id: "jun-circle-basic", name: "圆的基本性质", keywords: ["圆", "弦", "弧", "圆心角", "圆周角", "垂径定理"], available: false, lockedNote: locked() },
      { id: "jun-circle-tangent", name: "直线与圆的位置关系", keywords: ["切线", "相切", "割线", "切点", "连心线"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "图形的变换",
    icon: "transform",
    experiments: [
      { id: "jun-trans-sym", name: "轴对称与中心对称", keywords: ["轴对称", "中心对称", "对称轴", "对称中心"], available: false, lockedNote: locked() },
      { id: "jun-trans-rotate", name: "平移与旋转", keywords: ["平移", "旋转", "旋转角", "对应点"], available: false, lockedNote: locked() },
    ],
  },
  {
    title: "统计与概率",
    icon: "stat",
    experiments: [
      { id: "jun-stat-basic", name: "数据收集与统计图", keywords: ["平均数", "中位数", "众数", "方差", "统计图"], available: false, lockedNote: locked() },
      { id: "jun-prob-basic", name: "概率初步", keywords: ["概率", "频率", "随机事件", "列举法"], available: false, lockedNote: locked() },
    ],
  },
];

export const CATALOG: Record<Stage, Module[]> = {
  senior: SENIOR,
  junior: JUNIOR,
};

export const STAGE_NAMES: Record<Stage, string> = {
  senior: "高中",
  junior: "初中",
};

export function countModules(stage: Stage): number {
  return CATALOG[stage].length;
}

export function countExperiments(stage: Stage): number {
  return CATALOG[stage].reduce((s, m) => s + m.experiments.length, 0);
}

export function findExperiment(stage: Stage, id: string): Experiment | null {
  for (const m of CATALOG[stage]) {
    const e = m.experiments.find((x) => x.id === id);
    if (e) return e;
  }
  return null;
}
