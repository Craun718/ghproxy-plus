# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：P16 Safari 真实部署下载路由待实施（2026-08-14）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

## P16：Safari 真实部署下载路由（待实施）

- 在 `wrangler.jsonc` 的 `assets` 中增加 `run_worker_first: ["/api/*"]`，
  避免 `/api/ghproxy/*` 顶层导航被 SPA fallback 接管。
- 在 `src/api/ghproxy.ts` 中兼容编码后的上游 URL 路径，例如
  `https%3A/github.com/...` 或 `https%3A%2F%2Fgithub.com/...`，并补充单元
  回归。
- 增加真实部署 Safari WebDriver 验证：点击 Download 后 `~/Downloads` 出现
  对应文件，页面不跳转到 SPA HTML。
- 用户完成 Wrangler 认证后部署，并在 `https://gpp.natsuu.top` 重新验证。
