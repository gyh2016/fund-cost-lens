# Fund Cost Lens

中文名：基金费率对比。

Fund Cost Lens 是一个场外宽基基金费率查询网站，支持标准申购费率与东方财富天天基金优惠价切换，并展示基金成立日期、份额页面净资产规模和按金额、持有期计算的场景费率。

本仓库采用“可直接部署的数据快照”模式：提交前端源码，以及网页运行所需的已生成 JSON。克隆后不需要重新采集或处理数据。

## 仓库内容

- `web/src/`：React + TypeScript 前端源码。
- `web/public/data/fees/`：网页直接读取的当前数据快照，随仓库提交。
- `web/tests/`、`web/e2e/`：前端、数据契约和端到端测试。
- `docs/WEB_ARCHITECTURE.md`：当前网页架构、数据契约和部署说明。
- `vercel.json`、`web/public/_redirects`、`web/public/_headers`：静态托管配置。

根目录的 `data/` 和 `scripts/` 是本地数据采集、整理与生成流水线，已整体加入 `.gitignore`，不会上传 GitHub，也不是部署所需内容。

## 本地运行

需要 Node.js 24：

```text
npm install
npm run dev
```

开发服务器直接使用仓库内的 `web/public/data/fees/`，不会运行数据采集或生成脚本。

## 校验与构建

```text
npm run check
npm run build
npm run test:e2e
```

- `npm run check`：执行 TypeScript 检查和前端测试，并验证提交的数据快照。
- `npm run build`：输出可部署静态站点到 `web/dist/`。
- `npm run test:e2e`：执行 Playwright 桌面端与移动端测试。

生产部署的构建命令是 `npm run build`，发布目录是 `web/dist`。项目已包含 SPA 路由回写和静态资源缓存示例；当前 Vite 与路由按域名根路径配置，直接部署到 GitHub Pages 的仓库子路径前需额外配置 base path。

详细实现见 [网页架构文档](docs/WEB_ARCHITECTURE.md)。

## 数据说明

网页展示的是采集时点的数据快照，不是销售平台或基金管理人的实时接口。优惠表只采用来源页面明确展示的优惠档位；基金规模采用对应份额页面口径，不代表同一主基金全部份额合计。

数据仅用于费率查询与研究，不构成投资建议；实际费用以基金法律文件和销售平台最新页面为准。

## 公开发布前

仓库尚未声明开源许可证。公开发布前请为代码选择合适的 `LICENSE`，并单独确认来源数据的公开再分发条件。
