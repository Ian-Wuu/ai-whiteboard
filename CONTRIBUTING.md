# Contributing / 参与贡献

## English

Small, focused improvements and reproducible bug reports are welcome. For a larger change, describe the problem and proposed scope in an issue before implementation.

1. Read [README.md](README.md), [configuration](docs/CONFIGURATION.md), and [LICENSE](LICENSE).
2. Install dependencies with `pnpm install`. Use `pnpm dev:web` for changes that do not require paid AI calls.
3. Add a regression test where practical, then run `pnpm test` and `pnpm build`.
4. In the pull request, explain what changed, what was tested, and what remains unverified. Include a screenshot for visible UI changes, using synthetic data.

Bug reports should include browser/OS, steps, expected and actual behavior, and redacted error details. Never include API keys, credential CSVs, `.env` files, raw audio, or private transcripts. Follow [SECURITY.md](SECURITY.md) for vulnerabilities.

Keep board mutations in the single BoardStore command path, preserve revision checks and user ownership, and do not introduce arbitrary generated JavaScript. Document user-visible changes in English and Chinese, English first. Contributions must be your own or properly licensed; by submitting a contribution, you agree to make it available under the project's license. No copyright transfer is requested.

## 中文

欢迎小范围、可验证的改进和可复现的问题反馈。较大的改动请先在 Issue 说明问题与范围。

1. 阅读 [中文 README](README.zh-CN.md)、[配置指南](docs/CONFIGURATION.md)和 [LICENSE](LICENSE)。
2. 用 `pnpm install` 安装依赖。无需付费 AI 的改动使用 `pnpm dev:web`。
3. 尽可能补充回归测试，再运行 `pnpm test` 和 `pnpm build`。
4. 在 PR 中说明修改内容、验证方式及未验证部分；界面改动附使用示例数据的截图。

问题反馈应包含浏览器/系统、复现步骤、预期与实际行为、已脱敏的错误信息。不要上传 API Key、密钥 CSV、`.env`、原始音频或私人转写。安全漏洞按 [SECURITY.md](SECURITY.md)处理。

白板修改应走唯一 BoardStore 命令入口，保留版本检查和用户内容归属保护，不引入任意 AI 生成 JavaScript。用户可见的改动需同步中英文文档，英文在前。贡献必须为原创或获得适当授权；提交贡献即表示同意按项目许可提供该贡献，不要求转让著作权。
