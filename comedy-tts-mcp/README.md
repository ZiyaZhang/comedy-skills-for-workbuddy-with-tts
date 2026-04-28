# comedy-tts-mcp

本地 MCP server。把 4 个领笑员人设的点评文字，通过火山引擎豆包大模型 TTS 合成 4 段不同音色的 mp3，并：

- 在本机扬声器顺序播放（macOS=`afplay`，Windows=PowerShell + WPF MediaPlayer）
- 同时跑一个 HTTP 服务（`http://localhost:9876/audio/<hash>.mp3`）给 WorkBuddy 的 audio widget 播放

## 运行要求

- Node.js ≥ 20
- 一个有效的火山引擎 API Key（已开通"语音合成大模型"+认领试用包+绑定音色）

## 安装

```bash
npm install
```

## 配置（`.env`）

```bash
VOLC_API_KEY=<火山控制台 API Key>
VOICE_SCHOLAR=zh_male_yourougongzi_emo_v2_mars_bigtts
VOICE_VETERAN=zh_male_dayi_uranus_bigtts
VOICE_BELLE=zh_female_tianxinxiaomei_emo_v2_mars_bigtts
VOICE_ALIEN=zh_male_dongmanhaimian_mars_bigtts
HTTP_PORT=9876
```

仓库已附带可用的 `.env`（仓库私有）。要换音色，去火山控制台音色列表挑选并替换对应的音色 ID。

## 启动（独立测试用）

```bash
node server.js
# stderr 应该看到：
# [comedy-tts] audio server listening on http://localhost:9876
# [comedy-tts] MCP server ready on stdio
```

## 在宿主里注册（WorkBuddy / Claude Desktop / Codebuddy）

stdio 形态：

```json
{
  "command": "node",
  "args": ["<repo 绝对路径>/comedy-tts-mcp/server.js"]
}
```

## 暴露的工具

### `synthesize_judges`

输入：

```json
{
  "items": [
    { "persona": "scholar", "voice": "scholar-calm",  "text": "..." },
    { "persona": "veteran", "voice": "veteran-rough", "text": "..." },
    { "persona": "belle",   "voice": "belle-vivid",   "text": "..." },
    { "persona": "alien",   "voice": "alien-curious", "text": "..." }
  ]
}
```

输出（精简）：

```json
{
  "audios": [
    { "persona": "scholar", "voiceType": "...", "url": "http://localhost:9876/audio/abc123.mp3", "bytes": 38421 },
    ...
  ],
  "playing": true,
  "platform": "darwin",
  "message": "..."
}
```

调用后 server 会立即在本机后台启动顺序播放（fire-and-forget），同时返回小体积 JSON 供 SKILL.md 渲染 audio widget。

## 文本约束

- 单段 ≤ 300 字（火山 V1 接口限 1024 字节）
- 不要把 `「」` 之外的标记符号（emoji / markdown）传进 text，会被读出来
- 同一 voice + text 命中缓存（hash 截断 16 位），不会重复合成

## 缓存

`cache/<hash>.mp3`，相对 server.js 路径。`.gitignore` 已忽略该目录。要清理：删 `cache/` 即可，下次合成会自动重建。
