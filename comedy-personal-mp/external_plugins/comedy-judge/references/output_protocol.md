# 输出协议规范 (Output Protocol)

本文档定义 comedy-judge skill 的**结构化输出协议**。前端（WorkBuddy desktop）依赖这个协议识别并渲染领笑员点评和五维评分卡片，必须严格遵守。

---

## 一、协议总览

每份稿件的完整输出由**三层结构**组成：

```
:::script ...
  [show_widget 工具调用 或 裸 HTML 内联 → 渲染五维评分卡片]

  :::judge persona=scholar ...
    [自由形式点评文字]
  :::

  :::judge persona=veteran ...
    [自由形式点评文字]
  :::

  :::judge persona=belle ...
    [自由形式点评文字]
  :::

  :::judge persona=alien ...
    [自由形式点评文字]
  :::
:::
```

**三层职责：**

| 层级 | 形式 | 职责 |
|------|------|------|
| `:::script` | GFM directive 容器 | 稿件级分隔，承载稿件元数据 |
| 五维评分卡片 | `show_widget` 工具调用 或 裸 HTML 内联（详见 5.0） | 渲染五维评分（先给结论） |
| `:::judge` | GFM directive 容器 | 单个领笑员的互动点评，承载人设元数据（再给详解） |

**输出顺序：先 widget，再 4 个 judge。**评分卡片是结论，领笑员点评是展开论证；先看结果再听理由，符合脱口秀比赛"先亮分后讲评"的现场节奏。

---

## 二、容器语法硬规则

GFM container directive 的语法要求，违反将导致前端解析失败：

1. **三个冒号 `:::` 必须独占一行，顶格，无前导空格**
2. **开标签独占一行**，紧跟类型名和属性：`:::judge persona=scholar name="学识派" voice=scholar-calm color=#3B82F6`；写完就换行，**不能把正文内容写在开标签后面同一行**
3. **闭标签**只写 `:::`，不带类型名，独占一行顶格
4. **属性值**不含空格时可省略引号；含空格、中文标点、特殊字符时**必须加双引号**
5. **嵌套**：外层 `:::script` 和内层 `:::judge` 都用三个冒号，靠配对匹配区分；**不要**用 `::::`、`:::::` 这种加长写法
6. **容器内部**可包含正常 Markdown 文本（段落、列表、引用块等），不要再嵌第三层 `:::`
7. **空行要求**：`:::judge` 开标签下一行**必须空一行**再写正文；正文结束后**必须空一行**再写闭标签 `:::`

---

## 三、`:::script` 容器规范

### 3.1 开标签格式

```
:::script id={{script-id}} name="{{稿件标题}}" performer="{{选手名}}" index={{序号}}/{{总数}}
```

### 3.2 属性字典

| 属性 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `id` | ✅ | 稿件唯一 ID，建议 `script-1` / `script-2` 顺序生成 | `script-1` |
| `name` | ✅ | 稿件标题。**含中文或空格必须加双引号** | `"A-普通却自信"` |
| `performer` | ✅ | 选手名（人名或代号） | `"A"` 或 `"曹词三"` |
| `index` | 单稿件可省略，多稿件必填 | 第几份/总共几份 | `1/3` |

### 3.3 选手名与稿件标题的自动抽取规则

用户通常只提供稿件原文，skill 需要自动推断：

**选手名推断优先级：**

1. 文本中有 `"大家好，我是XXX"` / `"我是XXX"` 句式 → 抽取 `XXX`
2. 文件名含人名或代号（如 `A-普通却自信.md`） → 取开头代号 `A`
3. 都没有 → 用 `选手` 占位

**稿件标题推断优先级：**

1. 文件名去掉扩展名（如 `A-普通却自信.md` → `A-普通却自信`）
2. 文本第一行看起来像标题（<20 字、无句号） → 用第一行
3. 都没有 → 取正文前 10 字 + `…`

---

## 四、`:::judge` 容器规范

### 4.1 开标签格式

```
:::judge persona={{persona-id}} name="{{领笑员名}}" voice={{voice-id}} color={{主色}}
```

### 4.2 属性字典

| 属性 | 必填 | 说明 | 取值范围 |
|------|------|------|---------|
| `persona` | ✅ | 人设 ID，与 personas.md 对应 | `scholar` / `veteran` / `belle` / `alien` |
| `name` | ✅ | 领笑员显示名 | 默认按下表，用户可覆盖 |
| `voice` | ✅ | TTS 音色 ID，供后续 TTS 使用 | `scholar-calm` / `veteran-rough` / `belle-vivid` / `alien-curious` |
| `color` | ✅ | 主色（hex）供前端渲染头像色块 | 按下表固定 |

### 4.3 四种人设的全链路规范（**锁定，勿改**）

| 人设 | persona | 默认 name | voice | color | personas.md 对应章节 |
|------|---------|-----------|-------|-------|-----------------|
| 学识派 | `scholar` | 学识派 | `scholar-calm` | `#3B82F6` | ## 1. 学识派 |
| 老登 | `veteran` | 老登 | `veteran-rough` | `#B45309` | ## 2. 老登 |
| 钝感美女 | `belle` | 钝感美女 | `belle-vivid` | `#EC4899` | ## 3. 钝感美女 |
| 外星派 | `alien` | 外星派 | `alien-curious` | `#10B981` | ## 4. 外星派 |

**输出顺序（固定）：** scholar → veteran → belle → alien
（先专业切入 → 再阅历评判 → 再观众情绪 → 最后外部视角收尾）

### 4.4 容器内文字要求

- 200–300 字自由形式互动点评
- 完全化入人设，语气/用词/口头禅遵循 `personas.md` 对应章节
- 可引用具体段子原文，用 `「」` 包裹
- 结尾要有一句符合人设的金句（外星派除外——其"克制收尾"本身就是人设特点，不强求金句）

---

## 五、五维评分卡片渲染

### 5.0 ⚠️ 渲染方式（双轨制）

**五维评分卡片必须出现在 `:::script` 容器内、4 个 `:::judge` 之前。** 渲染方式按宿主能力分两种：

**首选：调用 `show_widget` 工具**（当本次会话工具列表里包含 `show_widget` / `visualize:show_widget` / `visualizer:show_widget` 时）

- ✅ **正确**：发起一次工具调用，传入 `title` / `widget_code` / `loading_messages` 三个参数（详见 5.2）
- ✅ 宿主前端会用独立 iframe 沙箱渲染卡片

**兜底：内联裸 HTML 片段**（当工具不可用时）

- ✅ **正确**：把 `widget_template.html` 渲染好的最终 HTML 片段**直接写到 `:::script` 容器内、第一个 `:::judge` 之前**。WorkBuddy 的 `VisualizerShowWidgetRenderer` 会保留 inline style 渲染
- 模板已经是为 WorkBuddy 内联渲染设计的：所有 style 都是 inline、色值全部硬编码、宽度 680px 自适应
- 不要把它丢进三重反引号代码块（会被当成代码而不是渲染）
- 不要写在 `:::script` 容器**外面**

**两种禁止**：

- ❌ 工具可用时还坚持走兜底（白白浪费独立沙箱）
- ❌ 工具不可用时反复尝试调用工具失败后才放弃（先看工具列表，没有就直接走兜底）

### 5.1 调用时机

每个 `:::script` 容器内，**`:::script` 开标签紧接着的第一件事**就是调用一次 `show_widget`，**之后再依次输出 4 个 `:::judge`**。卡片在判官之前出现，但**仍在 script 容器内部**，和 judge 平级。

### 5.2 调用参数

```javascript
show_widget({
  title: "AI 评分",   // 固定就是这四个字，显示在卡片标题栏
  widget_code: "<填好的 HTML 片段>",
  loading_messages: [
    "生成评分卡片",
    "计算维度权重",
    "渲染进度条",
    "准备就绪"
  ]
})
```

### 5.3 widget_code 生成规则

以 `widget_template.html` 为模板，替换占位符：

| 占位符 | 替换为 |
|--------|--------|
| `{{SCRIPT_TITLE}}` | `:::script` 的 `name` 属性值 |
| `{{PERFORMER_NAME}}` | `:::script` 的 `performer` 属性值 |
| `{{TAG_LINE}}` | 一句话梗链（从稿件中抽取 2-3 个关键梗，用 " → " 连接；无合适梗时填入"暂未整理"或空字符串） |
| `{{PUNCH_SCORE}}` | 0-100 整数，5 为步长 |
| `{{PUNCH_COMMENT}}` | 20-40 字评语 |
| `{{FLOW_SCORE}}` / `{{FLOW_COMMENT}}` | 同上 |
| `{{CONNECT_SCORE}}` / `{{CONNECT_COMMENT}}` | 同上 |
| `{{ORIGINAL_SCORE}}` / `{{ORIGINAL_COMMENT}}` | 同上 |
| `{{SURPRISE_SCORE}}` / `{{SURPRISE_COMMENT}}` | 同上 |
| `{{TOTAL_SCORE}}` | 五项之和（必须等于五项相加） |
| `{{TOTAL_COMMENT}}` | 一句话总评，40 字以内 |

### 5.4 widget_code 的硬约束（来自 show_widget 工具）

- 必须是**裸 HTML 片段**，不能带 `<html>/<head>/<body>/<script>` 外层
- 宽度基准 680px，自适应
- 禁止 `localStorage` / `sessionStorage`
- 禁止 `position:fixed` / `position:sticky`
- 禁止 `<form>` / `<input type="submit">`
- 不要自行改动色值（模板已锁定调色板）

---

## 六、完整输出示例（单稿件）

```markdown
:::script id=script-1 name="A-普通却自信" performer="A"

[此处调用 show_widget 工具，参数见 5.2，title 固定为"AI 评分"]

:::judge persona=scholar name="学识派" voice=scholar-calm color=#3B82F6

先说大的。这份稿子是个"反励志"母题，但作者做了一个不常见的包装……（200-300 字）……这份松弛比段子本身更值钱。

:::

:::judge persona=veteran name="老登" voice=veteran-rough color=#B45309

坐。听我一句劝。你这段子讲来讲去就一个字：怂。考研怂、篮球怂、考试怂……（200-300 字）……行，算你有点东西。

:::

:::judge persona=belle name="钝感美女" voice=belle-vivid color=#EC4899

我跟你说，听到「他那么普通却那么自信」我就笑了。然后那个化妆师叹气，我真的会哭……（200-300 字）……我投他。

:::

:::judge persona=alien name="外星派" voice=alien-curious color=#10B981

观察。这份稿子里，作者一直在把自己说得很普通，但观众反而笑了。我母星没有这个操作——说自己不行就是承认自己不行……（200-300 字）……喜欢，喜欢，作者是一个真诚的地球人。

:::

:::
```

---

## 七、多稿件场景

**不在 skill 内部做批量循环**。多稿件由 agent 自动拆解，逐份调用 skill。每份稿件的 `:::script` 容器之间用**正常换行**隔开即可，不需要额外分隔符。

唯一约束：每份稿件输出必须是**完整独立**的 `:::script` 容器（含 1 张评分卡片 + 4 个 judge），不要交叉混合。

---

## 八、错误示例与排查

### 8.1 常见错误

| 错误 | 症状 | 修复 |
|------|------|------|
| `:::script` 前有空格 | 整个容器失效，退化为普通文本 | 三个冒号必须顶格 |
| 属性值含中文未加引号 | 属性解析错乱 | `name="A-普通却自信"`，加双引号 |
| 闭标签写成 `:::judge` | 容器不闭合 | 闭标签只写 `:::` |
| 评分卡写在 script 容器外 | 卡片与稿件脱钩 | 必须在 script 内，所有 judge **之前** |
| 评分卡写在 4 个 judge 之后 | 顺序倒置，违反"先结论后详解" | 必须在所有 judge 之前 |
| 评分卡 HTML 包进三重反引号代码块 | 显示为代码而不是渲染 | 直接以裸 HTML 内联，或走 show_widget 工具 |
| widget_code 带 `<html>` | 前端渲染失败 | 只给裸片段 |
| 总分 ≠ 五项之和 | 数据自相矛盾 | 先算五项再填总分 |
| persona id 用旧的 `hype`/`folk`/`roast` | 前端无法匹配头像色块 | 必须是 `scholar` / `veteran` / `belle` / `alien` |

### 8.2 自检清单（输出前过一遍）

- [ ] 每个 `:::` 都顶格、独占一行
- [ ] **所有 `:::judge` 开标签之后必须换行空一行，正文从下一行开始，绝不能在开标签同一行写正文**
- [ ] 每个开标签有对应闭标签 `:::`
- [ ] **评分卡（show_widget 工具调用 或 内联 HTML 二选一）在所有 `:::judge` 之前**（卡片先于评论）
- [ ] 4 个 `:::judge` 的 persona 分别是 scholar / veteran / belle / alien，**顺序正确**
- [ ] 每个 judge 容器的 voice / color 与规范表一致
- [ ] 每个 script 容器内只渲染**一次**评分卡，不能多次
- [ ] widget_code 总分等于五项之和
- [ ] 每位 judge 文字 200–300 字
- [ ] 所有中文属性值都加了双引号
- [ ] `:::script` 容器闭合后**不输出任何文字**（无总结、无点评、无过渡语）

---

## 九、前端渲染预期（供参考，非 skill 职责）

写 skill 时只需保证输出符合本协议，前端怎么渲染是后续 adapter 阶段的事。但了解一下前端如何使用这些元数据有助于理解协议设计：

- `:::script` → 前端识别为稿件块，可能做稿件 tab 切换
- `show_widget` 调用 → 已有 `VisualizerShowWidgetRenderer` 内联渲染卡片，无需额外适配；位置在 script 容器顶部
- `:::judge` → 前端识别为领笑员点评块，渲染彩色头像圆点（取 color）+ 姓名徽章（取 name）+ 点评正文；消息工具栏注入小喇叭按钮（触发 TTS，传 voice）
