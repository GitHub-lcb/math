# 部署说明：象限先生的数学实验室

## 环境要求
- Node.js ≥ 18.18（实测 24.11 正常）
- npm ≥ 10

## 本地运行

```bash
npm install
npm run dev        # 开发模式 http://localhost:3000
npm run build      # 生产构建
npm start          # 生产模式 http://localhost:3000
```

冒烟测试：`npx tsx smoke.ts`（解析器/导数/数学工具纯函数 22 项断言）

## 方案 A：Vercel 部署（免费 / HTTPS / 免备案）

1. 推送本仓库到 GitHub/GitLab
2. Vercel 导入仓库：Framework 自动识别 Next.js，Node 版本选择 22+
3. 构建命令 `npm run build`，输出目录默认，无需环境变量
4. 绑定自定义域名（如需）：域名 DNS 添加 CNAME 指向 cname.vercel-dns.com

注意：Vercel 国内访问速度一般；国内用户量大时建议方案 B。

## 方案 B：国内服务器 + 备案

1. 域名完成 ICP 备案后，把备案号填入 `lib/siteConfig.ts` 的 `SITE_ICP`（当前为占位号）
2. 服务器（如阿里云/腾讯云）安装 Node 22 + PM2：

```bash
npm install
npm run build
npx pm2 start "npm run start" --name math-lab
```

3. Nginx 反代（/etc/nginx/conf.d/math-lab.conf）：

```nginx
server {
    listen 80;
    server_name 你的域名;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. 如需 HTTPS：certbot --nginx 一键签发

## PWA 说明（v1）
- 已提供 manifest.webmanifest（可添加至主屏幕），未注册 Service Worker——见 `app/layout.tsx` 注释与设计文档 R10；后续版本可补 SW 实现离线缓存
- 图标为 SVG 版（public/icon.svg）；如需 PNG（iOS 旧版 Apple Touch Icon），可用 https://realfavicongenerator.net 由 icon.svg 生成后替换

## 内容扩展指南（新增实验）
1. `lib/catalog.ts`：把实验的 `available` 改为 `true`（旗舰实验 id 保持 `function-and-derivative`）
2. `lib/derivatives.ts`：如新实验是函数类，添加 Preset（表达式/公式卡/易错点/参数）
3. `components/` 新增对应实验画布组件，在 `app/page.tsx` 中按 activeId 路由
4. 更新 `countExperiments` 相关徽标自动生效

## 目录

```
quadrant-math-lab/
├─ app/            Next.js 页面与全局样式
├─ components/     顶栏/侧边栏/画布/参数面板/数学面板/手写板
├─ lib/            catalog / parser / plotter / derivatives / math / siteConfig
├─ docs/           设计文档(specs)、实现计划(plans)、部署说明(本文件)
├─ public/         manifest、icon.svg
└─ smoke.ts        纯函数冒烟测试
```