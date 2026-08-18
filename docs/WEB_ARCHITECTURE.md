# Fund Cost Lens Web 架构

本文描述当前可直接部署的网页仓库边界、运行时数据契约和维护规则。

## 1. 系统边界

Fund Cost Lens（中文名：基金费率对比）是纯静态单页应用：

- 展示场外被动宽基指数基金份额，不包含指数增强和纯场内 ETF；
- 主要展示申购优惠价、基金成立日期和对应份额页面的净资产规模，也可切换标准费率；
- 支持搜索、筛选、排序、分页、移动端卡片、基金详情和可分享 URL；
- 页面固定展示人民币基金，不提供币种选择；运行时排除 4 个美元份额，当前页面总数为 749；
- 可按申购金额和持有天数计算场景总费率；
- 不包含登录、交易、后台管理、服务端 API 或数据库。

浏览器只读取随仓库发布的静态文件，不在运行时采集或处理基金数据。

## 2. 仓库与部署边界

GitHub 仓库采用“前端源码 + 当前运行数据快照”模式：

```text
package.json                   根命令入口，仅转发到 web workspace
docs/WEB_ARCHITECTURE.md       当前架构说明
web/
  src/app/                    路由控制、URL 状态、筛选排序和视图模型
  src/components/             列表、筛选、场景控件和详情组件
  src/data/                   Zod schema、资源加载和缓存
  src/domain/fees/            分档匹配、格式化和场景计算纯函数
  src/pages/                  列表页与独立详情页
  tests/                      领域、应用、UI 和数据快照测试
  e2e/                        浏览器端到端测试
  public/data/fees/           已提交、可直接部署的运行数据
  dist/                       Vite 构建输出，不提交 Git
```

根目录的 `data/` 和 `scripts/` 属于本地数据流水线，包含原始快照、规范数据、导入器和生成器。它们由根锚定的 `/data/`、`/scripts/` 规则忽略，不属于 GitHub 仓库，也不参与克隆后的开发、检查或构建。

## 3. 运行时数据快照

`web/public/data/fees/` 是网页的数据接口，同时也是必须提交的部署资源：

```text
web/public/data/fees/
├─ manifest.json
└─ releases/<release-id>/
   ├─ fund-index.<hash>.json
   ├─ scenario-rules.<hash>.json
   ├─ sources.<hash>.json
   └─ details/<0-f>.<hash>.json
```

- `manifest.json`：当前版本入口，声明 release、数据日期、计数及各资源的 URL、SHA-256 和字节数。
- `fund-index`：首屏列表、搜索、筛选、排序、概况和费率展示数据。
- `scenario-rules`：按金额和持有期计算场景费率所需的规则。
- `sources`：标准费率、基金概况和平台优惠的来源字典及 URL。
- `details/0-f`：按份额代码稳定分成 16 片，按需提供完整费率、问题和来源 ID。

仓库只保留当前 manifest 可达、且浏览器会读取的资源。旧 release、版本 manifest 和仅供数据构建审计的报告不随部署快照提交。

部署快照保留采集流水线生成的完整 753 个份额，其中包含 4 个美元份额；`manifest.counts.current_shares` 等原始计数仍描述这套完整快照。页面在读取并校验完整数据后，只把 749 个人民币份额交给列表、筛选、计数和详情入口。前端展示总数与 manifest 原始总数因此可以不同。

### 3.1 数据关系

```text
manifest ──> fund-index
         ├─> scenario-rules
         ├─> sources
         └─> detail shards

index item.detail_shard ──> 对应详情分片
detail source_id         ──> sources 字典
```

`share_code` 在所有层都是六位字符串，不能转成数字。

### 3.2 版本与缓存

- `dataset_version` 是数据集内容标识。
- `release_id` 使用数据集哈希前 12 位，格式为 `v1-<hash>`。
- release 内资源文件名带内容哈希，可使用长期 immutable 缓存。
- `manifest.json` 使用 `no-cache`，以便部署新快照后发现当前版本。
- manifest 中的路径必须全部存在；前端数据测试还会校验字节数和 SHA-256。

## 4. 前端运行时架构

### 4.1 技术栈

- Node.js 24 和 npm workspace；
- Vite、React 19、TypeScript 和 React Router；
- Zod 负责浏览器端资源边界校验；
- Decimal.js 负责费率和金额的十进制计算；
- CSS Modules 和全局基础样式；
- Vitest、Testing Library 和 Playwright 负责测试。

项目没有服务端渲染、服务端状态或独立全局状态库。

### 4.2 路由和页面

- `/`：基金列表页；
- `/fund/:shareCode`：基金详情；
- 基金详情入口同样只接受页面可展示的人民币份额，直接访问被排除的美元份额代码会显示未找到；
- 从列表打开详情时，以 background location 显示抽屉；
- 直接访问详情 URL 时，显示独立详情页；
- 未识别的应用路径回到列表页，生产托管必须配置 SPA 回写。

关闭详情抽屉后会恢复列表位置和触发按钮焦点。移动端还会在浏览历史中保存已加载条数和滚动位置。

### 4.3 状态管理

- URL：搜索、筛选、排序、分页、标准/优惠模式、金额和持有天数；
- React 本地状态：输入草稿、加载状态、移动端批次和无障碍播报；
- History state：列表滚动位置、移动端已加载数量和详情返回焦点；
- 模块缓存：manifest 使用单例 Promise；列表、规则和来源按 release 缓存，详情按 release 与 shard 缓存。

URL 解析和序列化集中在 `web/src/app/url-state.ts`，筛选与排序在 `list-filter.ts`，数据到组件模型的转换在 `view-model.ts`。

### 4.4 分层加载

1. 首次进入读取 `manifest.json` 和当前 `fund-index`。
2. 用户设置金额或持有天数后，按需读取 `scenario-rules`。
3. 用户打开详情后，并行读取对应详情分片和 `sources`。
4. 所有资源经 Zod 校验后才进入界面。
5. 加载失败会清除对应缓存或提供重试入口，避免长期复用失败 Promise。

搜索、筛选、排序和分页全部在浏览器内完成。桌面端使用表格和分页；移动端使用基金卡片并分批追加。

筛选选项按页面可展示的 749 个人民币基金动态生成。没有数据、覆盖全部基金或与已有阈值产生相同结果的选项不会显示；如果“更多筛选”没有有效条件，整个区域会隐藏。

## 5. 费率语义与场景计算

### 5.1 数据状态

| 状态 | 含义 |
| --- | --- |
| `known` | 已可靠结构化，可展示或计算 |
| `not_applicable` | 来源明确表示不适用 |
| `source_missing` | 来源未显示必需字段 |
| `unparsed` | 来源存在内容，但当前无法可靠结构化 |
| `not_listed` | 可选的后端费用组没有在来源中列出 |

显式零费率属于 `known`，不等于缺失或不适用。

### 5.2 标准费率与优惠价

- 默认使用优惠申购费率，用户可切换为标准费率。
- 页面以“优惠价”为主要称谓；“东方财富优惠价”只作为价格来源的小字说明。
- 优惠快照未明确展示的档位沿用同档标准费率，不根据折扣文案推算。
- 优惠模式只替换申购时收取的申购费；管理费、托管费、销售服务费和赎回费保持标准口径。
- 没有优惠记录的份额在优惠模式下整体沿用标准申购费率。

### 5.3 计算口径

```text
年度持续费率 = 管理费率 + 托管费率 + 对应持有期的销售服务费率
持有期持续费率 = 年度持续费率 × 持有天数 ÷ 365
场景总费率 = 持有期持续费率 + 申购费率 + 赎回费率
```

- 只有申购金额和持有天数都有效时才计算。
- 金额和费率使用十进制字符串与 Decimal.js，避免二进制浮点误差。
- 固定申购费用按“固定金额 ÷ 本次申购金额”折算。
- 页面场景金额固定使用人民币；完整快照中保留的美元规则不会进入页面列表、详情或场景计算。
- 后端申购和后端赎回规则只在详情展示，不进入当前场景总费率。
- 结果是费用比例口径，不包含净值变化、复利、精确计提日历或收益预测。

## 6. 检查与构建

根命令不运行本地数据流水线：

```text
npm run dev       # 使用已提交快照启动 Vite
npm run check     # TypeScript 检查、前端测试和快照契约校验
npm run build     # 直接构建静态站点到 web/dist
npm run test:e2e  # Playwright 桌面端与移动端测试
```

`web/tests/data/generated-data.test.ts` 会针对未经页面过滤的完整部署快照验证：

- manifest、列表和场景规则的原始数量一致；页面排除美元份额不会改变这项完整性校验；
- 来源与 16 个详情分片可由前端 schema 解析；
- manifest 中每个运行时资源的文件大小和 SHA-256 正确。

`npm run check` 不包含 Playwright、生产构建、lint、格式化或覆盖率检查。

## 7. 部署

生产部署是静态托管：

- 构建命令：`npm run build`
- 发布目录：`web/dist`

仓库提供：

- `web/public/_redirects`：Netlify/Cloudflare Pages 风格的 SPA 回写；
- `web/public/_headers`：当前 manifest、release 和应用资源的缓存策略；
- `vercel.json`：Vercel 路由回写，以及 manifest 和 release 缓存头。

托管平台必须保证直接访问 `/fund/<shareCode>` 时回写到 `index.html`，同时不能把 `/assets/` 和 `/data/` 请求改写为应用页面。

当前 Vite 和 BrowserRouter 按域名根路径配置。部署到 GitHub Pages 的 `/repo-name/` 子路径前，需要同步配置 Vite `base`、Router basename 和静态资源路径。

## 8. 维护规则与限制

- 更新部署数据时，应整体替换 `manifest.json` 和它引用的 release 资源，不能只替换其中一部分。
- 不手工修改 release JSON；数据修订应在本地流水线完成，再发布新的完整快照。
- 修改资源 schema 时，必须同步更新 `web/src/data/schemas.ts` 和相关测试。
- 修改分档或场景口径时，应复用 `web/src/domain/fees/` 中的纯函数。
- 网页展示的是采集快照，不是实时销售平台或基金管理人接口。
- 当前页面只展示快照中的当前费率，不提供历史版本对比。
- 基金规模是对应份额页面口径，不代表同一主基金全部份额合计。
- 仓库当前没有 GitHub Actions 或其他 CI 配置，上传 GitHub 不会自动测试或部署。

部署快照的原始数据数量、release ID 和更新时间以 `web/public/data/fees/manifest.json` 为准；页面当前展示其中 749 个人民币份额，不直接采用 manifest 的 753 作为页面基金总数。
