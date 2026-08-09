# ghproxy-plus 前端重构技术方案

## 文档状态

- 状态：当前工作区权威方案（Source of Truth）；Craun718 上游选择性同步实施中
- 最近更新：2026-08-09
- 适用范围：前端产品交互、前端架构、前后端数据边界、工程规范与验收标准
- 配套清单：根目录 `TODO.md`

除用户当前对话中的明确指令外，本文件优先于已有实现、历史约定、代码注释和
`TODO.md`。开始任何开发需求前，必须先检查本文件是否仍准确；如需求或决策发生
变化，先更新本文件，再按本文件的优先级同步 `TODO.md`，最后才能实施代码。

在用户明确要求开始实现或修改代码之前，只允许维护方案和任务文档，不得修改
业务代码、样式、依赖、构建配置、质量配置或锁文件。现有实现与本方案的差异都是
待迁移事项，而不是立即修改代码的授权。

## 1. 背景与结论

ghproxy-plus 是一个面向 GitHub Release 资产和 GitHub 文件的下载代理。后端的
Hono、Cloudflare Workers 部署形态以及 `/api/ghproxy/` 代理能力继续保留。本次
重构聚焦前端交互、状态管理和数据访问边界，不重写已稳定的代理传输核心。

当前前端不是单纯的视觉问题，而是存在核心流程断点：

- 结果区依赖 `tagList.length > 1`，只有一个 Release 或回退默认分支时无法下载。
- 资产匹配在零关键词命中时仍可能返回列表中的最后一个资产。
- Zod 校验没有连接到实际表单提交流程。
- URL 只回填仓库输入，不会恢复查询结果、版本和资产选择。
- 浏览器直接访问 GitHub API，绕过服务端缓存和统一错误处理。
- 组件、依赖和业务规模失衡，当前包含大量未使用的 shadcn/ui 组件和依赖。
- 当前依赖目录与清单不一致，类型检查和本地预览不能稳定通过。
- 缺少核心逻辑单元测试、组件测试和端到端测试。

因此，采用“保留代理后端、重建前端应用层与数据边界”的方案。

### 1.1 上游迁移与同步边界

原仓库与 `https://github.com/Craun718/ghproxy-plus` 从提交 `a68ed3e` 后形成了两条
开发线。当前工作区的前端重构、架构、组件、样式、数据模型和测试是唯一实施基线；
不得把 `Craun718/main` 的旧前端源码、依赖清单或组件树整体合并回来。

选择性同步以 `Craun718/main` 的 `1741aa3` 为审查基线，只迁移仍有价值的产品行为：

- 仓库归属与面向用户的源码链接改为 `Craun718/ghproxy-plus`。
- 吸收 `00ee5b9` 与 `c88a72e` 的下载响应意图：强制附件下载，并在 GitHub CDN
  重定向后保留原始 URL 的文件名；具体实现必须重新做安全编码和自动化测试，不能
  直接复制未经清理的 header 拼接代码。
- 吸收 `1741aa3` 的可搜索 Release/Asset 选择能力，但使用当前 Luma + Base UI
  架构重新实现。单 Release、完整 Release 列表和不可靠匹配问题已经由当前模型解决，
  不重复移植旧状态逻辑。

以下上游变化不属于本轮同步：Radix/new-york 组件树、Tabler 图标迁移、旧的单文件
页面与浏览器直连 GitHub API、sessionStorage 缓存、双锁文件、camelCase 文件、自动
修复并推送的 CI、排除 shadcn/ui 的 Biome 配置、pre-commit 和纯格式化提交。
`wrangler.jsonc` 的 Worker 名称同步为上游的 `ghproxy-plus-backend`。该名称是新的
唯一部署目标；不得继续以旧名称 `gpp-hono` 发布。名称迁移本身不授权真实部署，也
不自动复制 Cloudflare 环境中的自定义域、变量、路由或其他资源绑定。

## 2. 产品目标

### 2.1 核心目标

用户粘贴 GitHub 仓库地址后，应在一次查询内看到适合当前设备的推荐下载资产，
并能直接下载或复制代理链接。版本和资产的手动选择属于高级操作，不应阻塞默认
路径。

核心流程：

```text
输入仓库地址
  -> 校验并解析仓库
  -> 加载仓库与 Release
  -> 展示推荐资产及推荐依据
  -> 下载或复制代理链接
  -> 按需展开版本和资产选择
```

### 2.2 成功标准

- 0、1、多个 Release 的仓库都能得到明确且可操作的结果。
- 无匹配资产时不得静默选择任意文件。
- 推荐结果显示平台、架构、格式、大小、版本及推荐原因。
- 仓库、版本、资产选择可以通过 URL 分享并在刷新后恢复。
- 手机、桌面、键盘和屏幕阅读器用户都能完成核心流程。
- 前端不直接依赖 GitHub API 的原始响应结构。
- GitHub 匿名 API 额度不足时，用户可以临时提供 Token 后重试，不影响默认 URL
  查询主流程。
- 开发环境、构建、类型检查和测试可重复执行。

### 2.3 非目标

- 不在本轮重写 `/api/ghproxy/` 的代理传输实现。
- 不引入账号、收藏、下载历史同步或服务端持久化。
- GitHub Token 只用于提高 GitHub API 查询额度；本轮不承诺私有仓库浏览能力，
  不保存、同步或代管用户凭据。
- 不为了展示组件库能力而增加与下载任务无关的交互。
- 不改变当前品牌色调和语义色值。

## 3. 强制技术决策

### 3.1 技术栈

- 运行时：React 19。
- 构建工具：Farm。
- 服务端/API：Hono，部署到 Cloudflare Workers。
- 样式：Tailwind CSS。
- UI 体系：shadcn/ui。
- shadcn/ui 风格：Luma style。
- shadcn/ui 组件原语：Base UI（`@base-ui/react`），不再以 Radix UI 作为目标原语。
- 图标：Lucide；仅按实际使用导入。
- 共享数据管理：Zustand。
- 数据校验：Zod。
- 代码审查与格式化：Biome.js。

引入、替换或移除核心技术前，必须先更新本文件。迁移 shadcn/ui 时应使用支持
Luma 和 Base UI 的正式 CLI/schema 生成结果，不手写猜测不受当前 schema 支持的
配置字段。

### 3.2 视觉约束

- 保留 `src/globals.css` 当前 light/dark 语义色 token 的 OKLCH 色值。
- 主色继续使用当前青绿色，不引入新的品牌主色或渐变色系。
- Luma 负责组件形态、密度、边框、排版和层级，不覆盖现有品牌色 token。
- 减少与任务无关的发光球、持续脉冲和大面积装饰；动效只表达状态变化。
- 所有非必要动效必须遵守 `prefers-reduced-motion`。
- 正文与控件对比度至少满足 WCAG 2.2 AA。
- 字体必须真实加载或使用明确的系统字体栈，不声明不存在的字体。

### 3.3 CSS 约束

- 所有页面和组件样式使用 Tailwind CSS utility class。
- `src/globals.css` 仅承载 Tailwind 导入、设计 token、基础 reset 和必须的全局规则。
- 禁止新增 CSS Modules、Sass、Less、styled-components、Emotion 或另一套 CSS-in-JS。
- Base UI 的状态样式通过其 data attribute 与 Tailwind variant 表达。
- 只有运行时计算值可以通过 CSS variable 传递；不得用内联样式复制静态 Tailwind
  样式。

### 3.4 文件与代码规范

- 所有代码文件名必须使用 kebab-case，例如 `repository-search-form.tsx`、
  `asset-matcher.test.ts`。
- 目录名也使用 kebab-case；React 组件和 TypeScript 类型在代码中仍使用
  PascalCase。
- JavaScript、TypeScript、JSX 和 TSX 使用单引号。
- 缩进使用 space，不使用 tab；缩进宽度为 2 spaces。
- 使用 Biome.js 格式化、lint 和组织导入。
- Biome 必须覆盖业务代码和纳入仓库的 shadcn/ui 组件；不得用全目录排除隐藏问题。
- CI 运行只读检查，不允许在 push 流程中自动修复并提交到用户分支。
- 只保留一种包管理器和一个锁文件；目标包管理器为 pnpm。

## 4. 目标信息架构与交互

### 4.1 页面结构

主页按以下顺序组织：

1. 精简 Header：品牌、`API Docs`、指向 `Craun718/ghproxy-plus` 的 GitHub 链接和
   可选服务状态。
2. 任务标题：说明“粘贴仓库地址，获取适合当前设备的 Release 资产”。
3. 仓库搜索表单：支持仓库 URL、`owner/repo` 和 Release URL。
4. 仓库摘要：名称、描述、当前版本、发布日期和仓库链接。
5. 推荐资产：核心结果与首要操作。
6. 高级选择：按需展开 Release 和资产列表。
7. 精简 Footer：项目与必要法律信息，不展示技术栈广告。

API 文档迁移为独立 `/docs` 页面，不再在主页初始化时下载 Markdown，也不使用底部
Drawer 承载桌面端长文档。

浏览器文档标题固定为 `GitHub Proxy Plus`。主页空状态使用
`noctisynth/semifold` 作为可点击示例仓库。

### 4.2 仓库查询与可选 Token

- 仓库 URL 输入和“Find assets”操作始终是首要交互。
- GitHub Token 放在搜索表单内的折叠“可选认证”区域；匿名查询或正常结果不应被
  Token 控件打断。
- GitHub 返回限流错误时，自动展开 Token 区域，并在错误信息中提供重试指引。
- Token 输入使用密码控件，建议用户使用只有公开仓库只读权限的 fine-grained
  Token，并明确说明 Token 会经当前部署转发给 GitHub。
- Token 仅保存在当前页面的 React 局部状态中。不得写入 URL、Zustand、
  localStorage、sessionStorage、Cookie、日志或分析事件；刷新或离开页面后即丢弃。
- 无 Token 时的现有查询、URL 恢复和分享行为保持不变；从分享 URL 自动恢复查询时
  不携带 Token。
- 表单组合遵循 shadcn/ui 官方 Base UI
  [Field](https://ui.shadcn.com/docs/components/base/field)、
  [Input Group](https://ui.shadcn.com/docs/components/base/input-group) 和
  [Collapsible](https://ui.shadcn.com/docs/components/base/collapsible) 用例；使用正式 CLI
  生成的 `Field` 与 `InputGroup` 组件，不在业务组件中重新实现其状态和结构样式。
- 仓库地址和 Token 都以 `Field` 组织 label、description、control 与 error。Token
  密码框使用 `InputGroup` 承载前置图标和显示/隐藏按钮，保持正确的 DOM 与焦点顺序。
- Token 折叠触发器使用轻量 `Button` 和 `Badge` 表达“可选”，不得使用完整描边容器、
  分隔线和多层大圆角制造 Card 套 Card。展开内容使用单层低对比度 surface，并与主
  字段保持清晰的间距和层级。

### 4.3 推荐资产

推荐资产区域必须显示：

- 文件名、文件大小和文件格式。
- Release tag 和发布时间。
- 推断的平台与架构。
- 推荐理由和置信度：`exact`、`likely` 或 `none`。
- 主操作“下载”。
- 次操作“复制代理链接”。
- “选择其他版本或文件”入口。

`none` 表示没有可靠匹配，此时不预选下载项，用户必须手动确认。Source Code 与
可执行资产分组展示，校验和及签名文件不参与默认推荐。

### 4.4 高级选择

- Release 选择不限制为前 5 个；列表可以搜索或渐进加载。
- Release 名称为空时回退到 `tag_name`。
- 资产列表展示平台、架构、格式、大小和下载量，而不是只有文件名。
- 当前推荐项在列表中有明确标记。
- Release 与资产搜索使用 shadcn/ui 官方 Base UI
  [Combobox](https://ui.shadcn.com/docs/components/base/combobox)，通过正式 CLI 生成
  `src/components/ui/combobox.tsx`。不得移植上游 Radix `Command + Popover` 组合。
- Release Combobox 对名称和 tag 检索，选择值继续使用稳定 Release ID；Asset
  Combobox 使用官方 groups、collection 与 custom item 组合，保留 binary、source、
  checksum/signature 分组以及平台、架构、格式、大小和下载量。
- 搜索关键字、弹层开关和高亮项属于组件局部 UI 状态，不进入 Zustand、URL 或
  持久化存储；过滤结果必须由当前 releases/assets 派生，不新增重复列表状态。
- 空搜索结果只显示明确的 empty message，不得改变现有 Release、Asset 或推荐结果。
- 触屏目标至少 44 x 44 CSS pixels。
- 小屏幕上的主次操作纵向排列，不能依赖横向挤压。

### 4.5 状态和错误反馈

页面状态定义为：

```text
idle -> validating -> loading -> ready
                         |-> empty
                         |-> error
```

- `idle`：显示输入提示和示例。
- `validating`：执行本地格式校验，不发送请求。
- `loading`：保留输入和页面结构，展示可访问的加载反馈。
- `ready`：展示仓库、推荐资产和高级选择。
- `empty`：区分无 Release、Release 无资产和仅有源码。
- `error`：区分格式错误、仓库不存在、GitHub 限流、网络错误和服务错误。

无效或被撤销的 Token 必须与匿名限流区分，提供可恢复的认证错误，不得回显 Token。

错误文案不得都使用“Failed to fetch releases”。Clipboard 被拒绝或下载启动失败时，
必须在对应操作附近提供可恢复反馈；Toast 只能作为补充，不能承载唯一结果。

## 5. 前端架构

### 5.1 目录约束

shadcn/ui 是组件源码分发与 CLI 约定，不规定 `app/`、`features/`、`services/` 等
应用分层。目录设计必须以 `components.json` 的标准别名为基础，即
`components`、`ui`、`lib`、`hooks` 和 `utils`，并保留 Farm SPA 现有的入口与页面
组织。`models/` 是本项目为落实 Zustand 数据模型而增加的唯一领域目录。

目标文件树：

```text
src/
  components/
    ui/                         # shadcn/ui + Base UI 原语
    repository-download/
      repository-search-form.tsx
      repository-summary.tsx
      recommended-asset.tsx
      release-picker.tsx
      asset-list.tsx
    app-header.tsx
    app-footer.tsx
  hooks/
    use-repository-url-state.ts
  lib/
    utils.ts
    asset-matcher.ts
    repository-api.ts
  models/
    repository-download-model.ts
    repository-download-types.ts
    repository-download-schema.ts
  pages/
    home-page.tsx
    docs-page.tsx
  globals.css
  index.tsx
  main.tsx
```

边界规则：

- `components/ui/` 只包含通用 shadcn/ui 原语，不包含业务请求或 Zustand 访问。
- `components/` 下的业务子目录包含面向用户任务的组合组件。
- `hooks/` 包含可复用的 React 行为和 URL 同步逻辑。
- `models/` 包含领域类型、Zod schema、Zustand store、actions 和 selectors。
- `lib/` 包含 shadcn 工具函数、API client、响应转换和无副作用的匹配算法；API
  模块不得持有 React 或 Zustand 状态。
- `pages/` 只负责路由级页面组合，保留 Farm SPA 的框架边界。
- 不为了抽象形式新增 `app/`、`features/`、`services/` 或其他 shadcn/ui 未要求且
  当前规模不需要的顶层目录。
- 页面不得同时承担请求、缓存、数据转换、推荐算法和完整渲染。

### 5.2 Zustand 数据模型

只要状态需要跨组件共享、驱动异步数据或需要持久化，就使用 Zustand，并将模型放在
`src/models/`。临时的控件开关、hover、单个输入草稿等局部 UI 状态可以使用 React
本地状态。

`repository-download-model.ts` 至少包含：

- `status`、`repository`、`releases`、`selectedReleaseId`、
  `selectedAssetId`、`recommendation`、`error`。
- `resolveRepository`、`selectRelease`、`selectAsset`、`reset` actions。
- 派生当前 Release、资产列表和代理 URL 的 selectors。
- 请求序列或 `AbortController` 管理，防止后发请求被旧响应覆盖。

不得同时保存可以从现有状态推导的 `tagList`、`assetList` 等重复数组。URL 状态与
Zustand 模型必须有单向、可测试的同步入口，禁止多个 effect 相互覆盖选择。

GitHub Token 是敏感的临时表单值，不属于共享领域状态。模型 action 可以接收它作为
单次查询参数，但不得把它存入 Zustand state。

### 5.3 URL 状态

目标 URL：

```text
/?repo=owner/repo&release=v1.2.0&asset=asset-id
```

- 首次加载时自动解析并查询 `repo`。
- 数据加载后恢复 `release` 与 `asset`；无效值回退到可解释状态。
- 用户切换 Release 或资产时使用 replace 更新 URL，避免污染历史记录。
- URL 中使用稳定标识，不依赖完整 GitHub 下载 URL。

## 6. 数据与后端边界

新增归一化的仓库查询端点，建议为：

```text
GET /api/repos/:owner/:repo/releases
```

端点负责：

- 请求 GitHub API。
- 服务端缓存和限流反馈。
- 将空名称、源码资产、校验文件和可下载资产归一化。
- 返回稳定的错误 code，而不是把 GitHub 原始错误对象直接交给页面。
- 保留代理下载 URL 的生成规则，但不提前启动下载。

仓库查询端点额外接受可选的 `X-GitHub-Token` 请求头：

- Worker 校验其基本长度后只通过 `Authorization: Bearer …` 转发给 GitHub API。
- Token 不得出现在上游 URL、错误响应或日志中。
- 携带 Token 的请求必须绕过并且不得写入按仓库共享的内存缓存，响应使用
  `Cache-Control: private, no-store`。
- 匿名请求继续使用现有短时共享缓存。
- GitHub `401` 映射为稳定的 `invalid-token` 错误；限流仍映射为 `rate-limit`。

前端只依赖项目自己的响应模型。资产推荐算法保持为纯函数，输出资产、匹配理由、
置信度和命中的关键词。零命中必须返回 `none`，不得回退为数组最后一项。

`/api/ghproxy/` 的下载响应额外遵循：

- 对成功的 GET/HEAD 文件响应设置 `Content-Disposition: attachment`，使浏览器和命令
  行客户端都获得稳定的下载语义。
- 在首次解析 GitHub URL 时保存原始路径文件名，并在所有受支持的 CDN 重定向中继续
  传递；不得使用最终 CDN URL 的内部对象名覆盖它。
- 文件名必须去除路径分隔符、控制字符、引号和 header 注入字符。响应同时提供安全
  的 ASCII `filename` fallback 与 RFC 5987 UTF-8 `filename*`；解码失败时回退到
  上游安全文件名或通用名称。
- 保留上游状态码、`Content-Type`、`Content-Length`、range 与缓存相关 header；除
  `Content-Disposition` 和现有安全/CORS 处理外，不得改写文件内容或下载协议。

## 7. 可访问性、响应式与性能

- 所有字段有程序化关联的 label、description 和 error message。
- Base UI 组件必须保留其键盘、焦点和 ARIA 能力。
- 焦点样式清晰可见；不得只依赖颜色表示推荐、错误或选择状态。
- 加载状态使用 `aria-live` 或等效语义；图标装饰正确设置为隐藏。
- 支持 320px 以上视口，重点验证 320px、390px、768px、1280px 和 1440px。
- 搜索主操作和 Token 高级区域在窄屏下纵向排列、占满可用宽度，不得产生水平
  滚动；触屏目标继续保持至少 44 x 44 CSS pixels。
- API 文档按路由懒加载。
- 删除未使用组件与依赖，并在可构建基线恢复后建立初始包体预算。
- 目标 Web Vitals：LCP < 2.5s、CLS < 0.1、INP < 200ms（第 75 百分位）。

## 8. 测试与质量门禁

### 8.1 必需测试

- 单元测试：URL 解析、资产过滤、匹配置信度、代理 URL 生成。
- 模型测试：状态转换、请求竞态、URL 恢复、错误归一化。
- API/模型测试：Token 请求头转发、认证错误、带 Token 请求绕过缓存，且模型不保存
  Token。
- 代理 API 测试：直接文件、多跳 CDN 重定向、百分号/Unicode 文件名、恶意 header
  字符、GET/HEAD 与 range 响应的 `Content-Disposition` 和原 header 保留行为。
- 组件测试：0、1、多个 Release，空资产，Clipboard 拒绝，Token 折叠与限流展开。
- 组件测试：Release/Asset Combobox 搜索、空结果、分组、自定义元数据、选择后 URL
  同步，以及搜索状态不进入 Zustand。
- E2E：桌面和移动端查询、推荐、手动切换、下载、复制和刷新恢复。
- E2E：Token 查询请求头、`noctisynth/semifold` 示例、320px Token 展开态无溢出。
- E2E：大量 Release/Asset 下的筛选、键盘选择、清空/无结果、下载文件名，以及
  320px Combobox 弹层无水平溢出。
- 可访问性：键盘路径和自动化 axe 检查。

### 8.2 CI 门禁

每次变更至少运行：

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

核心交互变更还必须运行 E2E。Biome 检查不得自动写入，自动修复只能由开发者在明确
范围内本地执行后提交。

## 9. 迁移顺序

### P0：恢复可信基线

- 统一 pnpm 与锁文件，修复依赖和类型版本。
- 将 Biome 切换为单引号、2 spaces，并覆盖 shadcn/ui 文件。
- 建立 typecheck、test 和只读 CI 门禁。
- 为已知核心回归添加失败测试，再修复单 Release、无匹配和表单校验问题。

### P1：建立目标基础设施

- 将 shadcn/ui 迁移为 Luma style + Base UI，并精简到实际使用的组件。
- 在保持现有色值的前提下整理 Tailwind token 和全局样式。
- 按 kebab-case 和目标目录迁移文件。
- 建立归一化仓库 API、Zustand 模型、纯推荐算法和 URL 状态。

### P2：重建核心体验

- 实现搜索、仓库摘要、推荐资产和主次操作。
- 实现高级 Release/资产选择、空状态和分类型错误反馈。
- 完成移动端、键盘操作、reduced-motion 和屏幕阅读器支持。

### P3：文档、性能与发布

- 建立独立文档页并消除主页 Markdown 预加载。
- 删除旧组件、旧依赖和过期实现。
- 完成 E2E、可访问性、性能预算和发布回归验证。
- 同步 README、部署说明和最终架构文档。

### P4：查询可靠性与产品文案后续（已完成）

- P0：实现临时 GitHub Token 的安全传递、无缓存查询、错误反馈和自动展开交互。
- P1：将首页示例切换为 `noctisynth/semifold`，统一 `API Docs` 文案和
  `GitHub Proxy Plus` 浏览器标题。
- P2：补齐 320px 与 Token 展开态的组件、E2E、键盘和 axe 回归。
- P3：通过全部质量门禁并同步本文档和 `TODO.md` 的实施状态。

### P5：搜索表单视觉精炼（已完成）

- P0：通过正式 shadcn/ui CLI 增加 Base UI `Field` 与 `InputGroup` 源码组件。
- P1：以官方组合重构仓库输入、错误反馈和 Token 折叠区域，移除 Card 内部的重边框
  嵌套布局，不改变数据流与安全策略。
- P2：验证 Token 密码显示/隐藏、限流自动展开、键盘焦点顺序、axe，以及 320px
  至 1440px 布局。
- P3：通过全部质量门禁并同步本文档和 `TODO.md` 的实施状态。

### P6：Input Group 图标定位回归修复（已完成）

- P0：保留 shadcn/ui 官方要求的 DOM 顺序，即 `InputGroupAddon` 位于
  `InputGroupInput` 之后；前置 GitHub/Key 图标使用 `align="inline-start"`，Token
  显示/隐藏按钮使用 `align="inline-end"`，不得通过交换 DOM 顺序规避样式问题。
- P1：清理 Farm 的可再生构建缓存并重新生成 Tailwind CSS，确保产物包含
  `order-first` 与 `order-last` utility；缓存和构建产物不得提交到仓库。
- P2：增加桌面与移动端 E2E 位置回归，断言前置 addon 位于输入控件左侧、后置
  addon 位于 Token 输入控件右侧，同时保留既有键盘焦点顺序和 320px 无溢出验收。
- P3：完整 Tailwind CSS 冷构建产物以 110,000 bytes 作为未压缩体积预算；该预算
  已由用户确认，用于保留正式 shadcn/ui `Field` 与 `InputGroup` 源码及其完整样式。
- P4：复核 1440px 与 320px Token 展开态截图，通过全部质量门禁后同步本文档和
  `TODO.md` 的完成状态。

### P7：Craun718 上游选择性同步（待实施）

- P0：将应用 Header、Footer、README 与部署入口中的 canonical repository 统一为
  `https://github.com/Craun718/ghproxy-plus`，并将 Wrangler Worker 名称统一为
  `ghproxy-plus-backend`；保留当前前端源码和全部强制技术决策。
- P1：先为原始文件名、附件下载、重定向、编码和 header 注入建立失败测试，再在
  `src/api/ghproxy.ts` 安全实现 `Content-Disposition`，不直接 cherry-pick 上游实现。
- P2：通过正式 shadcn/ui CLI 增加 Base UI Combobox，以当前 Zustand 模型和 URL
  状态为数据源重做 Release/Asset 搜索；删除因此不再使用的 Select 原语和样式。
- P3：补齐组件、E2E、axe、320px、bundle 与下载协议回归，运行全部质量门禁和
  Wrangler dry-run；若完整 Combobox 样式超过现有 110,000-byte CSS 预算，必须停下
  请求批准，不得隐式提高预算。
- P4：同步 README、本文档和 `TODO.md`，并在不覆盖新仓库 `main` 的前提下另行确认
  Git remote/分支迁移方式。真实 Cloudflare 部署与现有环境资源迁移仍需单独授权。

## 10. 验收定义

重构只有在以下条件全部满足时才算完成：

- 本文件中的强制约束全部落实，`TODO.md` 不再存在本轮未完成项。
- 所有代码文件与目录符合 kebab-case。
- shadcn/ui 使用 Luma style 和 Base UI 原语，品牌色值未变化。
- 共享数据由 `models/` 下的 Zustand 模型管理，不存在重复派生状态。
- CSS 仅使用 Tailwind CSS 和允许的全局 token/base 规则。
- Biome 以单引号、space、2 spaces 检查全部目标代码。
- 核心流程覆盖 0、1、多个 Release 及所有规定错误状态。
- 匿名查询仍是默认路径；Token 只能临时传递，认证失败可恢复且不会进入持久化或
  共享缓存。
- 首页示例为 `noctisynth/semifold`，导航显示 `API Docs`，浏览器标题为
  `GitHub Proxy Plus`。
- 320px 以上视口在 Token 收起和展开状态均无水平溢出。
- 搜索表单使用 shadcn/ui 官方 `Field`、`InputGroup`、`Collapsible`、`Button` 和
  `Badge` 组合；Token 区域视觉上从属于仓库主输入，不形成 Card 套 Card。
- GitHub 与 Key 前置 addon 在桌面和移动端都必须位于对应输入文字左侧；Token
  显示/隐藏按钮必须位于输入文字右侧。实现保持 addon 在 input 后的官方 DOM 顺序，
  并由 `align` 与 Tailwind flex order utility 控制视觉位置。
- 应用与文档不再包含 `NtskwK/ghproxy-plus` canonical 链接；所有面向用户的源码和
  部署入口指向 `Craun718/ghproxy-plus`。
- `wrangler.jsonc` 的 Worker 名称为 `ghproxy-plus-backend`，Wrangler dry-run 能以该
  名称完成配置解析；Wrangler 配置不得继续使用旧名称 `gpp-hono`。
- GitHub 代理下载在直接响应和 CDN 重定向后都使用安全的原始文件名，并强制附件
  下载；Unicode 与恶意文件名不会造成乱码、路径逃逸或 header 注入。
- Release/Asset 可以通过 Base UI Combobox 搜索，保留现有分组、元数据、推荐、URL
  恢复和 Zustand 单向状态流；单 Release 仍可下载，空搜索不会改变选择。
- CI 的类型检查、lint、测试、构建和必要 E2E 全部通过。
- README、`DESIGN.md`、`TODO.md` 与实际实现一致。

## 11. 当前实施基线

本轮方案于 2026-08-09 完成落地。后续需求仍必须先更新本文件，再从根目录
`TODO.md` 派生尚未实施事项。

当前基线：

- Node.js 支持版本为 22 及以上，包管理器固定为 pnpm 11.9.0；仓库仅保留
  `pnpm-lock.yaml`。
- Cloudflare Worker 名称为 `ghproxy-plus-backend`，构建和 Wrangler dry-run 已通过；
  真实部署、自定义域、变量、路由和其他 Cloudflare 环境资源迁移尚未执行。
- shadcn/ui 使用 `base-luma` 风格与 Base UI 原语；业务实际使用的通用原语保留在
  `src/components/ui/`，Radix 目标组件和未使用组件已移除。搜索表单使用官方 CLI
  生成并经 Biome 审查的 `Field`、`InputGroup`、`Collapsible`、`Button` 和 `Badge`
  组合。GitHub 与 Key addon 显式使用 `inline-start`，Token 显示/隐藏 addon 使用
  `inline-end`；三者保持在 input 后的官方 DOM 顺序，并由 E2E 校验实际视觉位置。
- `src/models/repository-download-model.ts` 管理异步状态、请求取消、竞态保护和选择；
  URL 通过单一 hook 恢复并 replace 同步 `repo`、`release` 和 `asset`。
- `/api/repos/:owner/:repo/releases` 统一访问 GitHub、执行内存缓存、默认分支回退、
  数据归一化和稳定错误映射；前端不再直接请求 GitHub API。
- 仓库查询表单提供折叠的临时 GitHub Token 输入；Token 只存在于页面局部状态并
  通过同源请求头传递，带 Token 的请求绕过共享缓存、使用 `private, no-store`，
  无效 Token 映射为 `invalid-token`，限流时自动展开认证区域。Token disclosure 为
  轻量辅助操作，展开后使用单层 muted surface 和带显示/隐藏操作的密码 Input Group。
- `/docs` 使用路由懒加载，Worker 静态资源启用 SPA fallback，主页不加载 API
  Markdown。
- 首页示例为 `noctisynth/semifold`，顶部导航显示 `API Docs`，浏览器标题为
  `GitHub Proxy Plus`。
- `src/globals-css.test.ts` 锁定迁移前全部 light/dark OKLCH 值。为满足 WCAG AA，
  控件只调整现有语义前景 token 的使用方式，没有修改任何原始 OKLCH 数值。
- Biome 以单引号、2 spaces 检查全部业务与 shadcn/ui 源码；CI 只读运行
  typecheck、lint、unit/component、build、bundle、Playwright 和 axe 门禁。
- 初始未压缩产物预算为：主页 JavaScript 920,000 bytes、懒加载文档 JavaScript
  260,000 bytes、应用 CSS 110,000 bytes。当前冷构建分别约为 875.4 KiB、
  225.5 KiB 和 102.1 KiB；CSS gzip 后约 13.7 KiB、Brotli 后约 11.0 KiB。
- 自动化覆盖 320px、390px、768px、1280px、1440px 断点，Token 展开态、桌面和
  移动核心流程、键盘路径、axe，以及 LCP < 2.5s、CLS < 0.1、INP < 200ms 的
  本地浏览器冒烟预算。当前 Vitest 42/42、Playwright 16/16 通过。
