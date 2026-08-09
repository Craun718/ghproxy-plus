# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：可靠性与产品文案后续任务实施中（2026-08-09）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

- [ ] P0：为仓库查询增加临时 GitHub Token 的安全请求头传递、带 Token 请求缓存
  隔离以及 `invalid-token` 错误映射。
- [ ] P0：在 URL 主输入下增加折叠的可选 Token 控件，限流时自动展开，且不持久化
  Token。
- [ ] P1：首页示例改为 `noctisynth/semifold`，导航文案改为 `API Docs`，浏览器
  标题改为 `GitHub Proxy Plus`。
- [ ] P2：补齐 Token 流程测试以及 320px 移动端、键盘和 axe 回归。
- [ ] P3：运行类型、Biome、测试、构建、包体和 E2E 门禁，并同步方案实施状态。
