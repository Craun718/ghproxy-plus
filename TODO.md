# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：Craun718 上游选择性同步已规划，等待实施（2026-08-09）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

- [ ] P0：将 Header、Footer、README 和部署入口中的 canonical repository 统一为
  `https://github.com/Craun718/ghproxy-plus`，并增加无旧 owner 链接的回归检查。
- [ ] P0：将 `wrangler.jsonc` 的 Worker 名称从 `gpp-hono` 改为
  `ghproxy-plus-backend`，通过构建与 Wrangler dry-run；不执行真实部署或环境资源迁移。
- [ ] P1：为 `/api/ghproxy/` 增加直接文件、多跳重定向、GET/HEAD、range、Unicode、
  百分号编码和恶意文件名测试。
- [ ] P1：安全实现强制附件下载和原始 GitHub 文件名保留，提供 ASCII `filename` 与
  RFC 5987 `filename*`，并保持其他下载响应 header/状态码不变。
- [ ] P2：使用正式 shadcn/ui CLI 增加 Luma + Base UI Combobox；以当前 Zustand
  模型和 URL 状态为数据源实现可搜索 Release 选择。
- [ ] P2：使用 Combobox groups、collection 和 custom item 实现可搜索 Asset 选择，
  保留资产分组、元数据、推荐标记与稳定 ID；过滤状态保持组件局部。
- [ ] P2：移除不再使用的 Select 原语和相关样式，不引入 Radix、Command/Popover、
  Tabler、旧页面状态、sessionStorage、额外锁文件或上游自动修复 CI。
- [ ] P3：补齐组件、E2E、axe、键盘、下载文件名和 320px 弹层回归，运行 typecheck、
  Biome、单元/组件测试、build、bundle、Playwright 与 Wrangler dry-run。
- [ ] P4：同步 README、`docs/DESIGN.md` 和本文件；另行确认 Git remote/分支迁移，
  不覆盖新仓库 `main`；真实 Cloudflare 部署与环境资源迁移另行授权。
