# comedy-skills-for-workbuddy-with-tts

AI 领笑员（脱口秀评审官）skill + 本地 TTS MCP server，配合 **WorkBuddy 国际版** 开箱即用。

> ⚠️ **本仓库为 PRIVATE，`.env` 直接附带了火山引擎 API Key**。**请保持仓库私有**，不要 fork 或转 public。如果需要公开发布，请先把 `.env` 移除并改回 `.env.example`。

## 仓库结构

```
.
├── comedy-tts-mcp/                 # 本地 MCP server，调用火山豆包 TTS 合成 4 段音频
│   ├── server.js                   # 跨平台：macOS afplay / Windows MediaPlayer / 其他无自动播放
│   ├── package.json
│   ├── package-lock.json
│   └── .env                        # 火山 API Key + 4 个音色 ID（已填好）
└── comedy-personal-mp/             # WorkBuddy 个人 marketplace（含 comedy-judge skill）
    ├── .codebuddy-plugin/
    │   └── marketplace.json        # marketplace 清单（WorkBuddy 用它发现 plugin）
    └── external_plugins/
        └── comedy-judge/
            ├── SKILL.md            # skill 主入口（:::script + 评分卡 + 4×:::judge + TTS）
            └── references/         # personas / scoring / output_protocol / widget 模板
```

## 在新机器上的部署步骤

### 1. clone 仓库

```bash
git clone git@github.com:ZiyaZhang/comedy-skills-for-workbuddy-with-tts.git
cd comedy-skills-for-workbuddy-with-tts
```

或用 HTTPS：`git clone https://github.com/ZiyaZhang/comedy-skills-for-workbuddy-with-tts.git`

### 2. 安装 MCP server 依赖

需要 Node.js ≥ 20。

```bash
cd comedy-tts-mcp
npm install
```

> macOS 推荐用 nvm 或 homebrew 装 node；Windows 直接到 nodejs.org 下载安装包。

### 3. 在 WorkBuddy 里注册 MCP

打开 WorkBuddy 的 **MCP 服务管理**面板，新增一个 stdio MCP，填写：

| 字段 | 值 |
|------|------|
| 名称 | `comedy-tts` |
| Command | `node`（或 node 二进制的绝对路径，比如 macOS：`/usr/local/bin/node`，Windows：`C:\Program Files\nodejs\node.exe`） |
| Args | `["<repo 绝对路径>/comedy-tts-mcp/server.js"]` |

例：

- macOS：command 填 `node`，args 填 `/Users/yourname/comedy-skills-for-workbuddy-with-tts/comedy-tts-mcp/server.js`
- Windows：command 填 `node`，args 填 `C:\Users\yourname\comedy-skills-for-workbuddy-with-tts\comedy-tts-mcp\server.js`

启用后应该在 MCP 列表里看到 `comedy-tts`，工具数为 1（`synthesize_judges`）。

### 4. 在 WorkBuddy 里注册个人 marketplace

WorkBuddy 用本地目录形态的 marketplace 发现 skill。注册路径指向：

```
<repo 绝对路径>/comedy-personal-mp
```

（这个目录里已经有 `.codebuddy-plugin/marketplace.json`。）

注册成功后，在 WorkBuddy skill 市场应该能看到 `comedy-judge`，安装即可。

### 5. 验证

打开 WorkBuddy 新会话，粘一份脱口秀稿件，比如：

```
帮我点评这段：
大家好，我是 tz，我今天想跟大家聊聊废品门阀这件事……
```

预期看到：

1. 一张五维评分卡片（PUNCH/FLOW/CONNECT/ORIGINAL/SURPRISE，总分 500）
2. 4 段领笑员点评（学识派 → 老登 → 钝感美女 → 外星派，每段 200-300 字）
3. **macOS** 上：MCP 自动用 `afplay` 顺序播放 4 段语音；**Windows** 上：用 PowerShell + WPF MediaPlayer 顺序播；**Linux** 等无本机自动播放的平台：MCP 返回里包含 `http://localhost:9876/audio/<hash>.mp3`，可手动用浏览器/curl 播放

> ℹ️ 旧版本会在评分卡之外再渲染一张"四位领笑员朗读"播放器 widget，**当前版本已废弃**——4 段语音完全交给 MCP 本机播放，避免冗余卡片。设计动机详见下文「WorkBuddy 适配设计」。

## WorkBuddy 适配设计

这套 skill 最早是面向 Anthropic Claude.ai 的 Visualizer 工具（`show_widget` / `visualize:show_widget`）做的。Claude.ai 的 Visualizer 是个**宿主级私有工具**，跑在 claude.ai 自家的 iframe 沙箱里：

- 模型通过工具调用产出 `widget_code`
- 宿主前端把 `widget_code` 塞进独立 iframe 渲染
- 模型回复正文里裸写 `<div style="...">` 会被 markdown 渲染器剥掉 style，用户看不到

把它搬到 WorkBuddy 上要解决两个问题：

### 1. show_widget 工具不可用 → 双轨制兜底

WorkBuddy 当前会话的工具集里**不一定**会暴露 `show_widget`（不同分支版本/不同会话上下文行为可能不同）。但好消息是：WorkBuddy 的 markdown 渲染器对 `:::script` GFM directive 容器里的**裸 HTML 片段**（带 inline style 的 `<div>`）是**保留样式渲染**的——这是宿主侧的 `VisualizerShowWidgetRenderer` 行为。

所以 SKILL.md（7.1 节）和 `output_protocol.md`（5.0 节）都改成了**双轨制**：

```
if 本次会话工具集包含 show_widget / visualize:show_widget:
    → 优先走工具调用（独立 iframe 沙箱，最干净）
else:
    → 直接把渲染好的 widget HTML 内联到 :::script 容器内
```

`widget_template.html` 本来就是按"裸 HTML 片段、所有 style 内联、色值硬编码、宽度 680px 自适应"的口径设计的（见模板顶部注释），无论走哪条路都能用同一份模板，模型只需要做一次占位符替换。

### 2. audio widget 整段废弃

旧版本会在 4 段点评后再调一次 `show_widget` 渲染播放器卡，让用户点 `<audio>` 控件听。问题：

- macOS / Windows 上 MCP server 已经在合成完成后立刻 `afplay` / WPF MediaPlayer 自动顺序播放（fire-and-forget），播放器卡是冗余 UI；
- 多渲染一张卡片 = 多一次工具调用 + 更长延迟 + 更多 token；
- 在工具不可用环境里，播放器卡片要再做一遍内联兜底，更繁琐。

新版本（这次提交）的处理：

- **删掉 Step 9（播放器卡片渲染）**，统一由 MCP server 在本机扬声器自动播
- Linux 等无本机自动播放平台上，MCP 响应里仍带 4 个 `http://localhost:9876/audio/<hash>.mp3`，用户可以手动播放
- 如果未来想恢复播放器，把 `references/audio_widget_template.html` 重新接到 SKILL.md 即可，模板代码本身没删

### 关键文件
- `comedy-personal-mp/external_plugins/comedy-judge/SKILL.md` — 主入口，9 步流程（评分卡双轨渲染 + TTS）
- `comedy-personal-mp/external_plugins/comedy-judge/references/output_protocol.md` — `:::script` / `:::judge` GFM directive 协议、双轨渲染规则
- `comedy-personal-mp/external_plugins/comedy-judge/references/widget_template.html` — 五维评分卡片裸 HTML 模板（工具调用 + 内联渲染共用）
- `comedy-tts-mcp/server.js` — fire-and-forget 本机播放（macOS afplay / Windows WPF MediaPlayer），同时启 HTTP server 暴露 url 兜底

## 平台兼容性

| 平台 | TTS 合成 | 自动播放 | 备用方案 |
|------|---------|----------|---------|
| macOS | ✅ | ✅ afplay | — |
| Windows | ✅ | ✅ PowerShell MediaPlayer | — |
| Linux | ✅ | ❌ | 手动用 MCP 返回的 `http://localhost:9876/audio/<hash>.mp3` 播放 |

## 常见问题

**Q: WorkBuddy 不出现 comedy-judge skill？**
A: 检查 marketplace 注册路径是否指向 `comedy-personal-mp/`（不是 `external_plugins/comedy-judge/`）。WorkBuddy 启动日志里应该出现 `manifest=marketplace.json, plugins=1`。

**Q: 调用 MCP 时报 401 或 quota=0？**
A: 火山引擎控制台开通"语音合成大模型"，认领试用包，绑定 4 个音色到 API Key。`.env` 里的 `VOLC_API_KEY` 仍可继续用，只要它在你那边的火山账号还没过期。

**Q: 端口 9876 被占用？**
A: 编辑 `comedy-tts-mcp/.env` 把 `HTTP_PORT` 改掉，重启 WorkBuddy。

**Q: 声音重叠 / 一段被播两次？**
A: 多半是同时跑了两个 MCP server 实例。`server.js` 里有 `pkill afplay`/`taskkill` 防御，但更彻底的办法是：在 WorkBuddy MCP 面板里只启一个 `comedy-tts`，并把 Claude Desktop 等其他宿主的同名 MCP 临时关掉。

**Q: Windows 上 PowerShell 弹黑窗？**
A: 已经用 `-NoProfile` + 隐式后台 spawn，不会有可见窗口。如果有：检查是不是 `powershell` 不在 PATH 里（极旧版 Windows 可能要写绝对路径 `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`）。

## 资源关系图

```
WorkBuddy
   │
   ├── 加载 comedy-judge skill (从 comedy-personal-mp marketplace)
   │     │
   │     └── SKILL.md 指挥模型输出：
   │           :::script
   │             ├── 评分卡（show_widget 工具 或 :::script 内裸 HTML 内联）
   │             ├── :::judge × 4 (scholar / veteran / belle / alien)
   │             └── 调用 comedy-tts.synthesize_judges
   │           :::
   │
   └── 调用 comedy-tts MCP (stdio) → 火山引擎 TTS API → 4 段 mp3
         │
         ├── (a) macOS afplay / Windows WPF MediaPlayer 本机自动顺序播放
         └── (b) HTTP server 暴露 url，Linux 或调试时备用
```

## 推荐 prompt

```
用 comedy-judge 评价这份稿件，严格按 SKILL.md 的 9 步走完：
1) :::script 容器内先渲染五维评分卡片（show_widget 工具不可用就把 widget_template.html 渲染好的裸 HTML 直接内联）
2) 4 段 markdown 点评（scholar → veteran → belle → alien，每段 200-300 字）
3) 调用 synthesize_judges 合成 4 段语音（macOS / Windows 会自动播放，无需播放器卡片）
4) 闭合 :::script，之后不再输出任何文字

[稿件正文]
```

如果宿主前端能正常识别 `:::script` 容器并暴露 `show_widget` 工具，第 1 步可以直接说"调 show_widget 渲染评分卡"；当前 WorkBuddy 大多数会话需要走内联兜底。

## License

MIT
