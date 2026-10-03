# Security / 安全说明

## English

This is a local development prototype, not a hardened internet service. The backend has no authentication, application-level spending cap, or complete abuse protection. Keep both services on loopback. Do not expose them through public hosting, a reverse proxy, or a tunnel without first implementing and reviewing access control, origin validation, rate limiting, quotas, and deployment hardening.

### Secrets and data

- Keep permanent API keys in the server's `.env` only. Never use a `VITE_` prefix for secrets. Environment files and CSV files are ignored by Git, but ignore rules do not remove secrets already committed to history.
- Revoke any exposed key immediately, including a key pasted into a public issue or screenshot. Removing the visible text is not enough.
- The app does not persist raw audio. Active voice sessions send audio, transcript/context text, and board state to Alibaba Cloud. Provider retention is outside this application's control.
- Browser IndexedDB holds boards, final transcripts, and interactive state without application-level encryption. Do not use sensitive content on shared computers. There is no cloud backup or reliable concurrent-tab protection.
- Search images load from external hosts, which receive ordinary image requests. URL validation is not a comprehensive security audit or a copyright check.
- Redact credentials, private content, and identifying details before sharing logs or screenshots. Do not upload an entire project folder containing local secrets.

### Reporting a vulnerability

Do not publish exploit details, credentials, or private data in a public issue. If the GitHub repository offers private vulnerability reporting, use its Security → Report a vulnerability flow. Otherwise, ask the maintainer for a private reporting channel without disclosing the details publicly. No monitored security email or response-time guarantee is currently specified.

## 中文

这是本地开发原型，不是经过加固的公网服务。后端没有身份认证、应用级费用上限或完整滥用防护。请仅监听本机回环地址；在实现并审查访问控制、来源校验、限流、配额及部署加固之前，不要通过公网托管、反向代理或隧道暴露服务。

### 密钥与数据

- 永久 API Key 只放服务端 `.env`，不要使用 `VITE_` 前缀。环境文件和 CSV 已被 Git 忽略，但忽略规则不会清除曾经提交到历史中的秘密。
- 一旦密钥泄露，包括出现在公开 Issue 或截图里，应立即撤销。只删除可见文字不够。
- 应用不持久化原始音频。语音期间会向阿里云发送音频、转写/上下文文字及白板状态；供应商如何保留数据不由本应用控制。
- IndexedDB 保存白板、最终转写与互动状态，没有应用级加密。共享电脑上不要使用敏感内容；当前没有云备份或可靠的多标签页保护。
- 搜索图片从第三方域名直接加载，对方会收到正常的图片请求。URL 验证不是完整安全审计或版权审查。
- 分享日志、截图前请移除凭据、私人内容和身份信息。不要上传包含本地秘密的整个项目文件夹。

### 漏洞报告

不要把利用细节、密钥或私人数据发到公开 Issue。如果 GitHub 仓库已开启私密漏洞报告，请使用 Security → Report a vulnerability；否则先询问维护者的私密渠道，不要公开细节。项目尚未指定持续监控的安全邮箱，也不承诺响应时限。
