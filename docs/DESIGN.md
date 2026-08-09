# ghproxy-plus 前端重构技术方案

## 文档状态

- 状态：当前工作区权威方案（Source of Truth）；本轮重构已实施并通过验收
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
- 开发环境、构建、类型检查和测试可重复执行。

### 2.3 非目标

- 不在本轮重写 `/api/ghproxy/` 的代理传输实现。
- 不引入账号、收藏、下载历史同步或服务端持久化。
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

1. 精简 Header：品牌、API 文档、GitHub 链接和可选服务状态。
2. 任务标题：说明“粘贴仓库地址，获取适合当前设备的 Release 资产”。
3. 仓库搜索表单：支持仓库 URL、`owner/repo` 和 Release URL。
4. 仓库摘要：名称、描述、当前版本、发布日期和仓库链接。
5. 推荐资产：核心结果与首要操作。
6. 高级选择：按需展开 Release 和资产列表。
7. 精简 Footer：项目与必要法律信息，不展示技术栈广告。

API 文档迁移为独立 `/docs` 页面，不再在主页初始化时下载 Markdown，也不使用底部
Drawer 承载桌面端长文档。

### 4.2 推荐资产

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

### 4.3 高级选择

- Release 选择不限制为前 5 个；列表可以搜索或渐进加载。
- Release 名称为空时回退到 `tag_name`。
- 资产列表展示平台、架构、格式、大小和下载量，而不是只有文件名。
- 当前推荐项在列表中有明确标记。
- 触屏目标至少 44 x 44 CSS pixels。
- 小屏幕上的主次操作纵向排列，不能依赖横向挤压。

### 4.4 状态和错误反馈

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

前端只依赖项目自己的响应模型。资产推荐算法保持为纯函数，输出资产、匹配理由、
置信度和命中的关键词。零命中必须返回 `none`，不得回退为数组最后一项。

## 7. 可访问性、响应式与性能

- 所有字段有程序化关联的 label、description 和 error message。
- Base UI 组件必须保留其键盘、焦点和 ARIA 能力。
- 焦点样式清晰可见；不得只依赖颜色表示推荐、错误或选择状态。
- 加载状态使用 `aria-live` 或等效语义；图标装饰正确设置为隐藏。
- 支持 320px 以上视口，重点验证 390px、768px、1280px 和 1440px。
- API 文档按路由懒加载。
- 删除未使用组件与依赖，并在可构建基线恢复后建立初始包体预算。
- 目标 Web Vitals：LCP < 2.5s、CLS < 0.1、INP < 200ms（第 75 百分位）。

## 8. 测试与质量门禁

### 8.1 必需测试

- 单元测试：URL 解析、资产过滤、匹配置信度、代理 URL 生成。
- 模型测试：状态转换、请求竞态、URL 恢复、错误归一化。
- 组件测试：0、1、多个 Release，空资产，Clipboard 拒绝。
- E2E：桌面和移动端查询、推荐、手动切换、下载、复制和刷新恢复。
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

## 10. 验收定义

重构只有在以下条件全部满足时才算完成：

- 本文件中的强制约束全部落实，`TODO.md` 不再存在本轮未完成项。
- 所有代码文件与目录符合 kebab-case。
- shadcn/ui 使用 Luma style 和 Base UI 原语，品牌色值未变化。
- 共享数据由 `models/` 下的 Zustand 模型管理，不存在重复派生状态。
- CSS 仅使用 Tailwind CSS 和允许的全局 token/base 规则。
- Biome 以单引号、space、2 spaces 检查全部目标代码。
- 核心流程覆盖 0、1、多个 Release 及所有规定错误状态。
- CI 的类型检查、lint、测试、构建和必要 E2E 全部通过。
- README、`DESIGN.md`、`TODO.md` 与实际实现一致。

## 11. 当前实施基线

本轮方案于 2026-08-09 完成落地。后续需求仍必须先更新本文件，再从根目录
`TODO.md` 派生尚未实施事项。

当前基线：

- Node.js 支持版本为 22 及以上，包管理器固定为 pnpm 11.9.0；仓库仅保留
  `pnpm-lock.yaml`。
- shadcn/ui 使用 `base-luma` 风格与 Base UI 原语；业务实际使用的通用原语保留在
  `src/components/ui/`，Radix 目标组件和未使用组件已移除。
- `src/models/repository-download-model.ts` 管理异步状态、请求取消、竞态保护和选择；
  URL 通过单一 hook 恢复并 replace 同步 `repo`、`release` 和 `asset`。
- `/api/repos/:owner/:repo/releases` 统一访问 GitHub、执行内存缓存、默认分支回退、
  数据归一化和稳定错误映射；前端不再直接请求 GitHub API。
- `/docs` 使用路由懒加载，Worker 静态资源启用 SPA fallback，主页不加载 API
  Markdown。
- `src/globals-css.test.ts` 锁定迁移前全部 light/dark OKLCH 值。为满足 WCAG AA，
  控件只调整现有语义前景 token 的使用方式，没有修改任何原始 OKLCH 数值。
- Biome 以单引号、2 spaces 检查全部业务与 shadcn/ui 源码；CI 只读运行
  typecheck、lint、unit/component、build、bundle、Playwright 和 axe 门禁。
- 初始未压缩产物预算为：主页 JavaScript 920,000 bytes、懒加载文档 JavaScript
  260,000 bytes、应用 CSS 100,000 bytes。当前构建分别约为 858.7 KiB、
  225.5 KiB 和 83.3 KiB。
- 自动化覆盖 390px、768px、1280px、1440px 断点，桌面和移动核心流程、键盘
  路径、axe，以及 LCP < 2.5s、CLS < 0.1、INP < 200ms 的本地浏览器冒烟预算。
