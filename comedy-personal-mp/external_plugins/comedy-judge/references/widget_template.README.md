# widget_template.html — 设计文档

五维评分卡片 widget 的 HTML 模板。

## 用途

`comedy-judge` skill 生成脱口秀稿件评分时，渲染的可视化卡片。

## 调用方式（双轨）

- **首选**：通过 `show_widget` 工具调用，把渲染好的 HTML 作为 `widget_code` 参数传入
- **兜底**：当宿主未暴露 `show_widget` 工具时，把渲染好的 HTML 直接内联到 `:::script` 容器内（WorkBuddy desktop 的 `VisualizerShowWidgetRenderer` 会保留 inline style 渲染）

详见 `../SKILL.md` 第 7.1 节、`output_protocol.md` 第 5.0 节。

## 硬约束（不可违反）

- 必须是**裸 HTML 片段**，禁止 `<html>` / `<head>` / `<body>` / `<script>` / `<!doctype>` 外层
- 宽度基准 680px，自适应 `max-width: 100%`
- 禁止 `localStorage` / `sessionStorage`
- 禁止 `position: fixed` / `position: sticky`
- 禁止 `<form>` / `<input type="submit">`
- **所有样式写成 inline `style` 属性**，不使用 `<style>` 标签（避免污染全局）
- **不要在模板里写 HTML 注释**（`<!-- ... -->`）—— show_widget 工具规范里明确说"No comments — waste tokens, break streaming"，且内联到 `:::script` 容器时注释会跟着被吐到消息里

## 占位符填空规则

| 占位符 | 替换为 |
|--------|--------|
| `{{SCRIPT_TITLE}}` | 稿件标题（`:::script` 的 `name` 属性值）|
| `{{PERFORMER_NAME}}` | 选手名（`:::script` 的 `performer` 属性值）|
| `{{TAG_LINE}}` | 梗链一句话，例：`"废品门阀 → 资本家 → 三体人 help 三体人"`，无合适梗时填空字符串 |
| `{{PUNCH_SCORE}}` | 0-100 整数，5 为步长 |
| `{{PUNCH_COMMENT}}` | 20-40 字评语 |
| `{{FLOW_SCORE}}` / `{{FLOW_COMMENT}}` | 同上 |
| `{{CONNECT_SCORE}}` / `{{CONNECT_COMMENT}}` | 同上 |
| `{{ORIGINAL_SCORE}}` / `{{ORIGINAL_COMMENT}}` | 同上 |
| `{{SURPRISE_SCORE}}` / `{{SURPRISE_COMMENT}}` | 同上 |
| `{{TOTAL_SCORE}}` | 五项之和（**必须等于五项相加**）|
| `{{TOTAL_COMMENT}}` | 一句话总评，40 字以内 |

## 色值（已锁定，禁止修改）

| 用途 | 色值 |
|------|------|
| 背景主色（深夜剧场黑）| `#0F0F14` |
| 次级背景 | `#1A1A24` |
| 文本主 | `#FFFFFF` |
| 文本次 | `#8A8A9A` |
| 进度条轨道 | `#2A2A38` |
| 总分主色（统一紫，与人设色解耦，因卡片是客观评分）| `#A78BFA` |

## 五个维度的进度条主色

| 维度 | 进度条渐变 |
|------|-----------|
| PUNCH（爆梗度）| `#FF6B6B → #FF8E8E` 红 |
| FLOW（节奏感）| `#4ECDC4 → #7EE8DF` 青 |
| CONNECT（共鸣力）| `#FFD166 → #FFE29A` 黄 |
| ORIGINAL（原创度）| `#A78BFA → #C9B5FF` 紫 |
| SURPRISE（意外指数）| `#F59E0B → #FCC34A` 琥珀 |

## 维护说明

如需调整模板，请：
1. 改 `widget_template.html` 本身
2. 同步更新本 README 的占位符表 / 色值表
3. 用真实数据 dry-run 一次（替换占位符 → 浏览器打开 → 检查视觉），确保不挂

**绝对不要把 HTML 注释加回模板。**
