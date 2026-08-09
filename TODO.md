# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：Input Group 图标定位回归修复实施中（2026-08-09）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

- [x] 确认 shadcn/ui 官方 Input Group 的 DOM 与 `align` 用法，定位 Farm/Tailwind
  旧缓存缺少 `order-first` / `order-last` utility 的根因。
- [x] 清理可再生的 Farm 缓存并重新构建 Tailwind CSS，不提交缓存或构建产物。
- [ ] 显式标注 GitHub 与 Key addon 的 `inline-start` 对齐意图，并增加桌面/移动端
  addon 相对输入控件的位置回归断言。
- [ ] 复核 1440px 与 320px Token 展开态，通过 typecheck、Biome、单元/组件测试、
  build、bundle、E2E 与 Wrangler dry-run。
- [ ] 将 `docs/DESIGN.md` 和本文件同步为已完成状态。
