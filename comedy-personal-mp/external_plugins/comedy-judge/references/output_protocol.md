# 输出协议规范 (Output Protocol)

本文档定义 comedy-judge skill 的**结构化输出协议**。WorkBuddy desktop 渲染器**只识别原生 markdown**，所以本协议完全基于 markdown 语法，**不使用任何 GFM container directive**（`:::script` / `:::judge` 这类标签会被原样字面输出）。

---

## 一、协议总览

每份稿件的完整输出结构（顺序固定，不可调换）：

```
我已经为您完成了关于脱口秀稿件《{{稿件标题}}》的五维评分以及四位领笑员点评，以下是详细评价：

[show_widget 工具调用：渲染五维评分卡片]

## 🎓 学识派

[200-300 字，学识派点评]

## 🍷 老登

[200-300 字，老登点评]

## 💃 钝感美女

[200-300 字，钝感美女点评]

## 👽 外星派

[200-300 字，外星派点评]

[synthesize_judges MCP 调用：合成 4 段语音并自动外放]
```

**三层职责：**

| 层级 | 形式 | 职责 |
|------|------|------|
| 总结句 | 普通 markdown 段落 | 一句话引子 |
| 评分卡 | `show_widget` 工具调用 | 渲染五维评分卡片（先给结论） |
| 4 段点评 | markdown 二级标题 + 段落 | 单个领笑员的互动点评（再给详解） |
| 4 段语音 | `synthesize_judges` MCP 调用 | 自动外放 4 段语音（macOS afplay / Windows MediaPlayer） |

**输出顺序：先 widget，再 4 段点评，最后 MCP。** 评分卡片是结论，领笑员点评是展开论证；先看结果再听理由，符合脱口秀比赛"先亮分后讲评"的现场节奏。

---

## 二、4 段领笑员的固定二级标题（**锁定，勿改**）

| 顺序 | 二级标题（必须一字不差） | persona | voice | personas.md 对应章节 |
|------|--------------------------|---------|-------|----------------------|
| 1 | `## 🎓 学识派` | `scholar` | `scholar-calm` | ## 1. 学识派 |
| 2 | `## 🍷 老登` | `veteran` | `veteran-rough` | ## 2. 老登 |
| 3 | `## 💃 钝感美女` | `belle` | `belle-vivid` | ## 3. 钝感美女 |
| 4 | `## 👽 外星派` | `alien` | `alien-curious` | ## 4. 外星派 |

**输出顺序（固定）：** scholar → veteran → belle → alien
（先专业切入 → 再阅历评判 → 再观众情绪 → 最后外部视角收尾）

### 标题硬规则

- 必须用 `## ` 二级标题（不要用 `### ` 三级，权重不够）
- emoji 紧跟 `## ` 后面，**有一个空格隔开**：`## 🎓 学识派` ✅，`##🎓学识派` ❌
- `persona` / `voice` 这两个英文 ID **只在调 MCP 的 items 数组里使用**，**绝不写到正文标题里**
- 不要使用 `:::judge` / `:::script` 这类 GFM container directive —— WorkBuddy 渲染器不识别，开标签会作为字面文字暴露在对话里

### 容器内文字要求

- 200–300 字自由形式互动点评
- 完全化入人设，语气/用词/口头禅遵循 `personas.md` 对应章节
- 可引用具体段子原文，用 `「」` 包裹
- 结尾要有一句符合人设的金句（外星派除外——其"克制收尾"本身就是人设特点，不强求金句）

---

## 三、五维评分卡片（show_widget 调用）

### 3.0 ⚠️ 最重要的约束

**五维评分卡片必须通过发起 `show_widget` 工具调用来实现，不能以任何形式把 HTML 写进消息正文。**

- ✅ **正确**：调用 `show_widget` 工具，传入 `title` / `widget_code` / `loading_messages` 三个参数
- ❌ **错误**：把 `<div style="...">...</div>` 直接写在消息正文
- ❌ **错误**：把卡片 HTML 放进三重反引号代码块展示

**为什么**：宿主前端（WorkBuddy desktop）的 Markdown 渲染器对消息正文里的裸 `<div style>` HTML 会直接丢弃或剥掉 style，用户看不到任何效果；只有通过 `show_widget` 工具调用，前端才会用独立的 iframe 沙箱把卡片正确渲染出来。

### 3.1 调用时机

**总结句之后、第一段领笑员点评之前**调用一次 show_widget。每份稿件**只调用一次**（不要在 4 段点评后再调第二次，那是已废弃的"播放器卡片"）。

### 3.2 调用参数

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

### 3.3 widget_code 生成规则

以 `widget_template.html` 为模板，替换占位符：

| 占位符 | 替换为 |
|--------|--------|
| `{{SCRIPT_TITLE}}` | 稿件标题 |
| `{{PERFORMER_NAME}}` | 选手名 |
| `{{TAG_LINE}}` | 一句话梗链（从稿件中抽取 2-3 个关键梗，用 " → " 连接；无合适梗时填入"暂未整理"或空字符串） |
| `{{PUNCH_SCORE}}` | 0-100 整数，5 为步长 |
| `{{PUNCH_COMMENT}}` | 20-40 字评语 |
| `{{FLOW_SCORE}}` / `{{FLOW_COMMENT}}` | 同上 |
| `{{CONNECT_SCORE}}` / `{{CONNECT_COMMENT}}` | 同上 |
| `{{ORIGINAL_SCORE}}` / `{{ORIGINAL_COMMENT}}` | 同上 |
| `{{SURPRISE_SCORE}}` / `{{SURPRISE_COMMENT}}` | 同上 |
| `{{TOTAL_SCORE}}` | 五项之和（必须等于五项相加） |
| `{{TOTAL_COMMENT}}` | 一句话总评，40 字以内 |

### 3.4 widget_code 的硬约束（来自 show_widget 工具）

- 必须是**裸 HTML 片段**，不能带 `<html>/<head>/<body>/<script>` 外层
- 宽度基准 680px，自适应
- 禁止 `localStorage` / `sessionStorage`
- 禁止 `position:fixed` / `position:sticky`
- 禁止 `<form>` / `<input type="submit">`
- 不要自行改动色值（模板已锁定调色板）

---

## 四、TTS 调用（synthesize_judges MCP）

### 4.1 调用时机

4 段领笑员点评全部写完之后**立即调用一次** synthesize_judges。调用结束后，整个回复就到这里 —— 不要再追加任何文字。

### 4.2 调用参数

```javascript
mcp__comedy-tts__synthesize_judges({
  items: [
    { persona: "scholar", voice: "scholar-calm",  text: "<学识派那段去掉「」的纯文字>" },
    { persona: "veteran", voice: "veteran-rough", text: "<老登纯文字>" },
    { persona: "belle",   voice: "belle-vivid",   text: "<钝感美女纯文字>" },
    { persona: "alien",   voice: "alien-curious", text: "<外星派纯文字>" }
  ]
})
```

### 4.3 返回值

`{ audios: [{ persona, url }, ...], playing: true/false, platform: "darwin"/"win32"/... }`

`playing: true` 表示 MCP server 已经在 macOS afplay / Windows MediaPlayer 上自动顺序播放了 4 段音频，无需任何前端控件，**也不要再调第二次 show_widget 渲染播放器卡片**。

---

## 五、完整输出示例（单稿件）

```markdown
我已经为您完成了关于脱口秀稿件《A-普通却自信》的五维评分以及四位领笑员点评，以下是详细评价：

[此处调用 show_widget 工具，参数见 3.2，title 固定为"AI 评分"]

## 🎓 学识派

先说大的。这份稿子是个"反励志"母题，但作者做了一个不常见的包装……（200-300 字）……这份松弛比段子本身更值钱。

## 🍷 老登

坐。听我一句劝。你这段子讲来讲去就一个字：怂。考研怂、篮球怂、考试怂……（200-300 字）……行，算你有点东西。

## 💃 钝感美女

我跟你说，听到「他那么普通却那么自信」我就笑了。然后那个化妆师叹气，我真的会哭……（200-300 字）……我投他。

## 👽 外星派

观察。这份稿子里，作者一直在把自己说得很普通，但观众反而笑了。我母星没有这个操作——说自己不行就是承认自己不行……（200-300 字）……喜欢，喜欢，作者是一个真诚的地球人。

[此处调用 synthesize_judges MCP，items 数组按 scholar → veteran → belle → alien 顺序填入 4 段去掉「」的纯文字]
```

---

## 六、多稿件场景

**不在 skill 内部做批量循环**。多稿件由 agent 自动拆解，逐份调用 skill。每份稿件之间用**正常换行**或一个 `---` 分隔即可。

唯一约束：每份稿件输出必须**完整独立**（含 1 个 show_widget 评分卡 + 4 段二级标题点评 + 1 次 synthesize_judges MCP 调用），不要交叉混合。

---

## 七、错误示例与排查

### 7.1 常见错误

| 错误 | 症状 | 修复 |
|------|------|------|
| 用 `:::judge persona=...` 之类 directive | 开标签字面文本暴露在对话里 | 改用 `## 🎓 学识派` 二级标题 |
| 用 `:::script` 包裹整个输出 | 同上 | 不要任何 GFM container directive |
| 标题写成 `### 🎓 学识派` | 视觉权重不够，被段落淹没 | 必须用 `## ` 二级标题 |
| 标题里写 persona/voice/color | 元数据暴露，难看 | 元数据只在调 MCP 的 items 数组里写 |
| emoji 顺序错或漏 | 头像不对 | 严格 🎓/🍷/💃/👽 一一对应 |
| show_widget 调了两次 | 第二张是废弃的播放器卡片 | 只调一次（评分卡），4 段点评后**不要**再调 |
| widget_code 带 `<html>` | 前端渲染失败 | 只给裸片段 |
| 总分 ≠ 五项之和 | 数据自相矛盾 | 先算五项再填总分 |
| voice 写错（如 `scholar-cool`） | 播错音色 | 严格按 4.2 节锁定值 |

### 7.2 自检清单（输出前过一遍）

- [ ] 第一行是总结句（"我已经为您完成了…"），写在 show_widget 调用之前
- [ ] 调用了一次（且仅一次）show_widget 渲染评分卡
- [ ] 4 段领笑员点评的标题严格是 `## 🎓 学识派` / `## 🍷 老登` / `## 💃 钝感美女` / `## 👽 外星派`
- [ ] **没有任何 `:::judge` / `:::script` 之类的 directive**
- [ ] 4 段顺序：scholar → veteran → belle → alien
- [ ] 每段 200–300 字
- [ ] widget_code 总分 = 五项之和
- [ ] 4 段写完后调用一次 `synthesize_judges` MCP
- [ ] MCP items 数组里 voice 顺序：`scholar-calm` / `veteran-rough` / `belle-vivid` / `alien-curious`
- [ ] **没有调用第二次 show_widget**（播放器卡片不渲染）
- [ ] MCP 调用结束后没有再追加任何文字

---

## 八、前端渲染预期（供参考）

- 总结句 → 普通 markdown 段落
- `show_widget` 调用 → WorkBuddy `VisualizerShowWidgetRenderer` 内联渲染卡片
- `## 🎓 学识派` 等 → 原生 markdown 二级标题（带 emoji 头像视觉效果）
- `synthesize_judges` MCP 调用 → MCP server 自动 afplay / MediaPlayer 外放，无 UI 渲染
