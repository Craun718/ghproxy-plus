# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：PR #2 review 修订实施中（2026-08-10）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

- [ ] P0：将 Repository/Releases 查询迁移到浏览器 GitHub API client；Token 只通过
  `Authorization` header 直接发送给 GitHub，并保留归一化、错误映射、请求取消、
  Zustand 与 URL 恢复。
- [ ] P1：删除 Worker `/api/repos`、相关 LRU 缓存及旧 `/api/download` 入口，保留
  `/api/ghproxy/`。
- [ ] P2：验证设备信息只影响推荐，Asset Combobox 默认展示全部平台与类型；补齐
  客户端 API、Token、错误、组件和 E2E 回归。
- [ ] P3：同步 README、API Docs 与最终实施基线，运行完整质量门禁并推送 PR #2。
