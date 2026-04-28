# comedy-skills-for-workbuddy-with-tts

AI 领笑员（脱口秀评审官）skill + 本地 TTS MCP server，配合 **WorkBuddy 国际版** 使用，开箱即用。

> ⚠️ **本仓库为 PRIVATE，`.env` 直接附带了火山引擎 API Key**。**请保持仓库私有**，不要 fork 或转 public。如果需要公开发布，请先把 `.env` 移除并改回 `.env.example`。

## 仓库结构

```
.
├── comedy-tts-mcp/                 # 本地 MCP server，调用火山豆包 TTS 合成 4 段音频
│   ├── server.js                   # 跨平台：macOS afplay / Windows MediaPlayer / 其他靠 widget
│   ├── package.json
│   ├── package-lock.json
│   └── .env                        # 火山 API Key + 4 个音色 ID（已填好）
└── comedy-personal-mp/             # WorkBuddy 个人 marketplace（含 comedy-judge skill）
    ├── .codebuddy-plugin/
    │   └── marketplace.json        # marketplace 清单（WorkBuddy 用它发现 plugin）
    └── external_plugins/
        └── comedy-judge/
            ├── SKILL.md            # skill 主入口（:::script + show_widget + audio_widget）
            └── references/         # personas / scoring / output_protocol / 两套 widget 模板
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
3. 一张「四位领笑员朗读」播放器卡片，4 个 `<audio>` 控件指向 `http://localhost:9876/audio/<hash>.mp3`
4. **macOS** 上：MCP 还会用 `afplay` 自动顺序播放（不必点 widget）；**Windows** 上：用 PowerShell + WPF MediaPlayer 顺序播；**其他平台**：靠 widget 里点播放

## 平台兼容性

| 平台 | TTS 合成 | 自动播放 | Widget 播放 |
|------|---------|----------|------------|
| macOS | ✅ | ✅ afplay | ✅ |
| Windows | ✅ | ✅ PowerShell MediaPlayer | ✅ |
| Linux | ✅ | ❌（仅 widget） | ✅ |

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
   │     └── SKILL.md 指挥模型输出 :::script + show_widget + 4×:::judge
   │
   └── 调用 comedy-tts MCP (stdio) → 火山引擎 TTS API → 4 段 mp3
         │
         └── 同时 (a) afplay/MediaPlayer 本机播放 (b) HTTP server 暴露 URL 给 audio widget
```

## License

MIT
