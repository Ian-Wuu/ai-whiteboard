# Configuration / 配置指南

[English overview](../README.md) · [中文首页](../README.zh-CN.md)

## English

### 1. Local requirements

Use Node.js 22 (22.12 or a newer 22.x release recommended) and pnpm. Install Node from [nodejs.org](https://nodejs.org/), then follow the [pnpm installation guide](https://pnpm.io/installation). In the project directory, run:

```bash
node --version
pnpm --version
pnpm install
```

No rented server is needed. `pnpm dev:web` starts only the whiteboard; `pnpm dev` starts both the frontend and AI backend. Do not run both commands at once: they share the same frontend port.

### 2. Model Studio configuration

Local editing needs no key. For AI features, prepare an API key and workspace ID from the same Beijing-region Model Studio workspace. Check your balance and model access. The API key is secret; the workspace ID is not a model name.

Copy `.env.example` to `.env` in the project root and fill in the variables below. **Never put real keys in a README, screenshot, issue, or frontend code. Never prefix secret variables with `VITE_`.** Restart the backend after changing configuration.

| Variable | Purpose and default |
| --- | --- |
| `DASHSCOPE_API_KEY` | Required server-side Model Studio API key |
| `DASHSCOPE_WORKSPACE_ID` | Required Beijing workspace ID associated with that key |
| `DASHSCOPE_MODEL` | Realtime voice; defaults to `qwen-audio-3.0-realtime-flash` |
| `DASHSCOPE_IMAGE_SEARCH_MODEL` | Responses model supporting `web_search_image`; defaults to `qwen3.6-flash` |
| `PORT` | Backend port; defaults to `8787`. Also update the proxy in `vite.config.ts` if changed |

The implementation uses Beijing workspace-specific realtime and Responses endpoints under `cn-beijing.maas.aliyuncs.com`. It does not provide a region-independent endpoint switch. Default model names reflect this project's configuration; verify availability in your workspace. A legacy fallback reads one fixed-name local credential CSV; new installations should use `.env` instead of relying on that migration path.

### 3. Start, use, and stop

Run `pnpm dev` and open `http://127.0.0.1:5173` on the same computer. The backend listens on `127.0.0.1:8787`; the frontend proxies `/api` requests.

- “开始对话” (Start conversation) requests microphone access and connects to Qwen. “停止回答” (Stop response) interrupts only the current response, not the session.
- Click “结束对话” (End conversation) when finished. Stop terminal-started services with `Ctrl+C`; use the matching stop launcher for services started with the macOS launcher.
- Do not start duplicate services using both methods, or expose local ports to the internet.
- Voice and image search incur provider charges. The application has no spending cap yet.

### 4. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Page cannot be reached | Start the services first. The URL works only on the computer running this project; it is not a public website |
| Port already in use | Stop this project's earlier instance. Do not kill unidentified processes |
| Board works, voice fails | Use `pnpm dev`, not only `dev:web`; check `.env`, workspace, model access, balance, and network |
| No input or audio output | Check browser microphone permission and system audio devices; try headphones and restart the conversation |
| Slow image search | Model search, safety validation, and external image loading happen in sequence. Network and source hosts affect latency; follow the status message instead of repeating the request |
| Missing data after refresh | Use the same browser profile and origin. Do not switch between `localhost` and `127.0.0.1` or use a private window |
| Disconnected | End and restart the conversation manually; automatic reconnection is not implemented |

### 5. Data and verification scope

Boards, widget values, final transcripts, and image data/references are stored in browser IndexedDB, without automatic cross-device sync. Locally inserted images can be saved with the scene; search images remain external URLs. The app does not persist raw audio. Voice sessions send audio and board context to Alibaba Cloud; the provider's data policies apply separately.

`pnpm test` and `pnpm build` make no paid model calls. They do not establish live voice/search reliability or acceptance across all browsers. Test those features separately with your own key.

## 中文

### 1. 本机环境

使用 Node.js 22（建议 22.12 或更新的 22.x）和 pnpm。可从 [Node.js 官网](https://nodejs.org/) 安装 Node，然后按 [pnpm 官方安装说明](https://pnpm.io/installation) 安装 pnpm。在项目目录运行：

```bash
node --version
pnpm --version
pnpm install
```

不需要租服务器。`pnpm dev:web` 只启动白板；`pnpm dev` 同时启动白板与 AI 后端。两者不要同时运行，否则会占用同一个端口。

### 2. 百炼配置

只体验本地编辑时无需配置密钥。使用 AI 时，在阿里云百炼准备同一北京业务空间内的 API Key 与 Workspace ID，并确认账号余额及对应模型权限。API Key 是秘密，Workspace ID 不是模型名称。

把根目录的 `.env.example` 复制为 `.env`，然后填写以下变量。**不要把真实密钥写进 README、截图、Issue 或前端代码，也不要给变量加 `VITE_` 前缀。** 修改配置后重启后端。

| 变量 | 用途与默认值 |
| --- | --- |
| `DASHSCOPE_API_KEY` | 必填，服务端使用的百炼 API Key |
| `DASHSCOPE_WORKSPACE_ID` | 必填，该 Key 所属的北京业务空间 ID |
| `DASHSCOPE_MODEL` | 实时语音，默认 `qwen-audio-3.0-realtime-flash` |
| `DASHSCOPE_IMAGE_SEARCH_MODEL` | 支持 `web_search_image` 的 Responses 模型，默认 `qwen3.6-flash` |
| `PORT` | 后端端口，默认 `8787`；修改时须同步修改 `vite.config.ts` 代理 |

当前代码使用北京业务空间专属的 `cn-beijing.maas.aliyuncs.com` 实时语音与 Responses 接口，不是可以任意替换地域的通用入口。默认模型名称来自本项目配置，是否可用以你的业务空间为准。服务端还兼容一个旧版、固定文件名的本地密钥 CSV；新安装请统一使用 `.env`，不要依赖该迁移兼容方式。

### 3. 使用与停止

运行 `pnpm dev` 后，在本机打开 `http://127.0.0.1:5173`。后端监听 `127.0.0.1:8787`，前端代理 `/api` 请求。

- 点击「开始对话」才会申请麦克风并连接模型；「停止回答」仅打断当前回答，不结束会话。
- 用完点击「结束对话」。终端启动的服务用 `Ctrl+C` 关闭；Mac 双击启动器开启的服务用对应关闭器停止。
- 不要同时用启动器和终端重复启动服务，不要把本地端口暴露到公网。
- 语音与搜图会产生供应商费用，本项目尚无应用内消费上限。

### 4. 常见问题

| 现象 | 检查方式 |
| --- | --- |
| 网页无法访问 | 先启动服务；此地址只在运行项目的电脑上可用，不是公开网站 |
| 端口已占用 | 关闭本项目先前启动的服务，不要直接结束不认识的进程 |
| 白板能打开，语音失败 | 确认运行的是 `pnpm dev` 而非仅 `dev:web`；检查 `.env`、空间、模型权限、余额和网络 |
| 没有声音或收不到语音 | 检查浏览器麦克风权限、系统输入输出设备，戴耳机后重新开始对话 |
| 搜图等待较久 | 需要经过模型搜索、结果安全验证及外部图片加载；网络和来源网站会影响延迟。等待状态提示，不要反复发出同一请求 |
| 刷新后找不到数据 | 使用相同浏览器配置和地址；不要切换 `localhost` / `127.0.0.1`，也不要使用无痕窗口 |
| 断线 | 当前需手动结束并重新开始对话，不会自动重连 |

### 5. 数据与验证范围

白板、互动值、最终转写与图片数据/引用保存到浏览器 IndexedDB，不会自动同步到其他电脑。上传到白板的本地图片可随场景保存，搜索图片仍引用外部 URL。应用不持久化原始音频；语音期间向阿里云发送音频及白板上下文，模型服务商的数据政策独立适用。

`pnpm test` 和 `pnpm build` 不调用付费模型，也不代表语音、搜图或所有浏览器已通过真实服务验收。语音体验需用自己的 Key 单独测试。
