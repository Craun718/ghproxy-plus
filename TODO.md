# ghproxy-plus 重构 TODO

> 权威方案：`docs/DESIGN.md`
>
> 当前状态：搜索表单视觉精炼实施中（2026-08-09）。

本文件只记录 `docs/DESIGN.md` 中尚未落地的工作。开始任何新需求前，必须先确认并
更新 `docs/DESIGN.md`，再按方案优先级把未实施事项写入本文件。

- [ ] P0：使用正式 shadcn/ui CLI 增加 Base UI `Field` 与 `InputGroup` 组件。
- [ ] P1：以官方组件重构仓库字段和 Token disclosure，移除 Card 内部的重边框嵌套。
- [ ] P2：补齐 Token 显示/隐藏、限流展开、键盘、axe 和 320px 移动端回归。
- [ ] P3：运行完整质量门禁，复核实际页面并同步方案实施状态。
