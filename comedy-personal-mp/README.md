# comedy-personal-mp

ziya 的 WorkBuddy 个人 marketplace —— 包含 `comedy-judge` 脱口秀评审 skill。

## 注册到 WorkBuddy

把这个目录的**绝对路径**注册到 WorkBuddy 的 marketplace 列表（具体入口在 WorkBuddy "skill 管理 / marketplace 管理" 面板）。

注册成功后，`comedy-judge` 会出现在 skill 市场，安装即可使用。

## 目录约定（重要，不能动）

```
.
├── .codebuddy-plugin/
│   └── marketplace.json          # marketplace 清单（WorkBuddy 启动时读取）
└── external_plugins/
    └── comedy-judge/             # 由 marketplace.json 的 source 字段引用
        ├── SKILL.md
        └── references/...
```

WorkBuddy 启动时会扫描 `.codebuddy-plugin/marketplace.json` → 拿到 `plugins[].source` → 拼出 plugin 实际路径 → 加载 `<plugin>/SKILL.md`。

如果 WorkBuddy 启动日志里看到：

```
[plugin-loader] manifest=marketplace.json, plugins=1
[plugin-loader] discovered: comedy-judge @ external_plugins/comedy-judge
```

就说明 marketplace 注册正常。

## 依赖

`comedy-judge` skill 依赖本地 MCP server `comedy-tts`，安装见仓库根目录 README。
