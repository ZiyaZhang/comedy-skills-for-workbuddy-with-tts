#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvFile(path.join(__dirname, ".env"));

const API_KEY = process.env.VOLC_API_KEY;
const HTTP_PORT = Number(process.env.HTTP_PORT || 9876);
const VOICE_MAP = {
  "scholar-calm": process.env.VOICE_SCHOLAR,
  "veteran-rough": process.env.VOICE_VETERAN,
  "belle-vivid": process.env.VOICE_BELLE,
  "alien-curious": process.env.VOICE_ALIEN,
};

if (!API_KEY) {
  console.error("VOLC_API_KEY missing in .env");
  process.exit(1);
}

async function synthesize(voiceLogical, text) {
  const voiceType = VOICE_MAP[voiceLogical];
  if (!voiceType) throw new Error(`unknown voice: ${voiceLogical}`);

  const cacheKey = crypto
    .createHash("sha256")
    .update(`${voiceType}:${text}`)
    .digest("hex")
    .slice(0, 16);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.mp3`);

  if (!fs.existsSync(cachePath)) {
    const body = {
      app: { cluster: "volcano_tts" },
      user: { uid: "comedy-judge" },
      audio: { voice_type: voiceType, encoding: "mp3", speed_ratio: 1.0 },
      request: {
        reqid: crypto.randomUUID(),
        text,
        operation: "query",
      },
    };
    const r = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.code !== 3000 || !j.data) {
      throw new Error(`TTS failed code=${j.code} msg=${j.message}`);
    }
    fs.writeFileSync(cachePath, Buffer.from(j.data, "base64"));
  }

  return {
    voiceLogical,
    voiceType,
    cacheKey,
    url: `http://localhost:${HTTP_PORT}/audio/${cacheKey}.mp3`,
    cachePath,
    bytes: fs.statSync(cachePath).size,
  };
}

// 跨平台本机扬声器播放
//   macOS  → /usr/bin/afplay 直接播 mp3
//   win32  → powershell + System.Windows.Media.MediaPlayer
//   其他    → 跳过本机播放，前端 audio_widget 仍可点播
function getPlayerForPlatform() {
  if (process.platform === "darwin") {
    return {
      kill: () => { try { spawnSync("/usr/bin/pkill", ["-x", "afplay"], { stdio: "ignore" }); } catch (_) {} },
      spawnPlay: (file) => spawn("/usr/bin/afplay", [file], { stdio: "ignore" }),
      blocking: true,
    };
  }
  if (process.platform === "win32") {
    // 用 PowerShell 调 WPF 的 MediaPlayer 阻塞播放，自带 mp3 解码
    return {
      kill: () => { try { spawnSync("taskkill", ["/IM", "powershell.exe", "/F"], { stdio: "ignore", shell: true }); } catch (_) {} },
      spawnPlay: (file) => {
        const ps = `Add-Type -AssemblyName presentationCore;` +
          `$p=New-Object System.Windows.Media.MediaPlayer;` +
          `$p.Open([Uri]::new('${file.replace(/'/g, "''")}'));` +
          `$p.Play();` +
          `Start-Sleep -Milliseconds 500;` +
          `while($p.NaturalDuration.HasTimeSpan -eq $false){Start-Sleep -Milliseconds 100};` +
          `$dur=$p.NaturalDuration.TimeSpan.TotalMilliseconds;` +
          `Start-Sleep -Milliseconds ([int]$dur);` +
          `$p.Close();`;
        return spawn("powershell", ["-NoProfile", "-Command", ps], { stdio: "ignore" });
      },
      blocking: true,
    };
  }
  return null;
}

function playSequential(paths) {
  const player = getPlayerForPlatform();
  if (!player) {
    console.error(`[comedy-tts] platform ${process.platform} has no local player; relying on audio_widget for playback`);
    return Promise.resolve();
  }
  // 防御：杀掉同名进程，避免多个 MCP server 实例同时播放导致声音重叠
  player.kill();
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= paths.length) return resolve();
      const proc = player.spawnPlay(paths[i]);
      proc.on("exit", () => { i++; next(); });
      proc.on("error", () => { i++; next(); });
    };
    next();
  });
}

const audioServer = http.createServer((req, res) => {
  const m = req.url?.match(/^\/audio\/([a-f0-9]+)\.mp3$/);
  if (!m) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const file = path.join(CACHE_DIR, `${m[1]}.mp3`);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("not cached");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": fs.statSync(file).size,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  fs.createReadStream(file).pipe(res);
});
audioServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[comedy-tts] port ${HTTP_PORT} already in use — assuming another instance is serving the same cache. Skipping HTTP server.`);
  } else {
    console.error("[comedy-tts] audio server error:", err);
  }
});
audioServer.listen(HTTP_PORT, "127.0.0.1", () => {
  console.error(`[comedy-tts] audio server listening on http://localhost:${HTTP_PORT}`);
});

const mcp = new Server(
  { name: "comedy-tts", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "synthesize_judges",
      description:
        "把 4 个领笑员的点评文字合成为 4 段语音，返回每段的本地播放 URL。voice 参数必须是 scholar-calm / veteran-rough / belle-vivid / alien-curious 之一。",
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "4 段点评，按 scholar/veteran/belle/alien 顺序",
            items: {
              type: "object",
              required: ["persona", "voice", "text"],
              properties: {
                persona: {
                  type: "string",
                  enum: ["scholar", "veteran", "belle", "alien"],
                },
                voice: {
                  type: "string",
                  enum: ["scholar-calm", "veteran-rough", "belle-vivid", "alien-curious"],
                },
                text: { type: "string", description: "点评纯文字（去掉 「」 之类）" },
              },
            },
            minItems: 1,
            maxItems: 4,
          },
        },
        required: ["items"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "synthesize_judges") {
    throw new Error(`unknown tool: ${req.params.name}`);
  }
  const items = req.params.arguments?.items ?? [];
  const out = [];
  for (const it of items) {
    const r = await synthesize(it.voice, it.text);
    out.push({
      persona: it.persona,
      voiceType: r.voiceType,
      url: r.url,
      bytes: r.bytes,
    });
  }
  // 关键：用 afplay 在本机扬声器顺序播放 4 段，不阻塞 MCP 响应（fire-and-forget）
  const cachePaths = items.map((it, i) => {
    const c = crypto.createHash("sha256")
      .update(`${VOICE_MAP[it.voice]}:${it.text}`)
      .digest("hex").slice(0, 16);
    return path.join(CACHE_DIR, `${c}.mp3`);
  });
  playSequential(cachePaths).catch((e) => console.error("[comedy-tts] play error:", e));

  const autoPlay = process.platform === "darwin" || process.platform === "win32";
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          audios: out,
          playing: autoPlay,
          platform: process.platform,
          message: autoPlay
            ? "✓ 4 段语音已开始在本机扬声器顺序播放（学识派 → 老登 → 钝感美女 → 外星派）。"
            : "✓ 4 段语音已合成；当前平台未配置本机自动播放，请通过 audio widget 中的播放按钮收听。",
        }, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await mcp.connect(transport);
console.error("[comedy-tts] MCP server ready on stdio");
