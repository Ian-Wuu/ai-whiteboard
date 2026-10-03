# GitHub materials / GitHub 介绍素材

## English

### Repository introduction

Suggested repository name: `ai-whiteboard`

About text:

> Talk, draw, and explore with AI on a shared whiteboard. Qwen realtime voice, editable boards, interactive widgets, and image search. Source-available: commercial outputs allowed; software commercialization restricted.

Suggested topics: `ai-whiteboard`, `qwen`, `realtime-voice`, `excalidraw`, `interactive-learning`, `react`, `typescript`.

Use [README.md](../README.md) as the default English introduction, with [README.zh-CN.md](../README.zh-CN.md) as the Chinese version. Do not add an MIT or unrestricted open-source badge. Do not use a localhost address as a public demo link.

### Assets

| File | Purpose |
| --- | --- |
| [logo.png](../public/logo.png) | White-background monochrome logo; also used as the browser icon |
| [overview.jpg](assets/overview.jpg) | Actual whiteboard showing the four interactive templates |
| [interactive.jpg](assets/interactive.jpg) | Actual focused interest-rate slider at 6% |
| [drawing.jpg](assets/drawing.jpg) | Editable three-step flow drawn manually in the application |
| [images.jpg](assets/images.jpg) | Manually inserted project logo with editable notes; not an AI search result |
| [history.jpg](assets/history.jpg) | Historical board navigation with the empty transcript panel |
| [comparison.jpg](assets/comparison.jpg) | Focused comparison switch |
| [timeline.jpg](assets/timeline.jpg) | Focused four-stage timeline |
| [calculator.jpg](assets/calculator.jpg) | Focused addition calculator, 25 + 8 = 33 |

The logo was generated with imagegen, not extracted from another brand. It is a raster PNG, not an editable vector file. Its visual concept is an open board with a pen stroke. No trademark clearance or exclusive rights are claimed.

Final generation prompt:

```text
Use case: logo-brand.
Create a single minimal logo symbol for AI Whiteboard, a shared whiteboard for human and AI conversation.
Pure white square background, pure black symbol. One confident continuous monoline rounded rectangular outline, with a subtle opening and short inward diagonal stroke that suggests a pen meeting the board. Abstract, quiet, geometric, distinctive, with an excellent small-size silhouette. Centered, occupying about 55 percent of the square, generous balanced white margins. Uniform medium stroke weight with softly rounded terminals.
Flat vector-like artwork only. No text, letters, tagline, gradients, colors, shadows, texture, 3D, mockups, robots, brains, sparkles, stars, decorative frame, or watermark. Produce one resolved mark, not a sheet of options.
```

The screenshots were captured from the local application at `http://127.0.0.1:5173/` through browser screenshots, using sample data. No generated mockups or fabricated conversation were used. No paid Qwen calls were needed for the captures.

### Before publishing

- Confirm the destination repository and its visibility. Preparing these files does not publish them.
- Review the exact files being committed. Keep local keys, credential CSVs, environment files, logs, private planning files, and personal data out of the repository.
- Check both README language links and image paths. Keep configuration and feature claims aligned with the actual code.
- Run `pnpm test` and `pnpm build`. Test live voice and image search separately; these commands do not verify paid services.
- Keep [LICENSE](../LICENSE), [NOTICE.md](../NOTICE.md), and upstream license notices. The custom license permits commercial outputs, not commercial software products or services; independent legal review is advisable before relying on it for licensing disputes.
- Add a public demo URL only after a separately authorized, secured deployment. This local backend is not ready for public exposure.

## 中文

### 仓库介绍

建议仓库名：`ai-whiteboard`

中文 About 文案：

> 与 AI 一起说、画、操作。千问实时语音、可编辑白板、互动组件与图片搜索。源码可用：作品可商用，软件本体不可商业化。

建议主题标签同英文部分。默认首页使用 [README.md](../README.md)，中文版本使用 [README.zh-CN.md](../README.zh-CN.md)。不要添加 MIT 或无限制开源徽章，也不要把本机地址当作公开 Demo 链接。

### 素材

| 文件 | 用途 |
| --- | --- |
| [logo.png](../public/logo.png) | 白底黑色 Logo，也用于浏览器图标 |
| [overview.jpg](assets/overview.jpg) | 四种互动模板的真实界面总览 |
| [interactive.jpg](assets/interactive.jpg) | 利率为 6% 的组件放大视图 |
| [drawing.jpg](assets/drawing.jpg) | 在应用中手动绘制的可编辑三步流程图 |
| [images.jpg](assets/images.jpg) | 手动插入的项目 Logo 与可编辑说明，不是 AI 搜图结果 |
| [history.jpg](assets/history.jpg) | 历史白板导航与空白对话面板 |
| [comparison.jpg](assets/comparison.jpg) | 放大的方案开关 |
| [timeline.jpg](assets/timeline.jpg) | 放大的四阶段时间线 |
| [calculator.jpg](assets/calculator.jpg) | 放大的加法计算器，25 + 8 = 33 |

Logo 由 imagegen 生成，不是从其他品牌提取；交付的是 PNG 位图，不是可编辑矢量文件。图形概念为开放的白板与一笔书写。不声称经过商标检索或享有排他权。完整生成提示词保留在上方英文部分，要求单个白底黑色几何标志、统一线条、留白、无文字、渐变或装饰。

截图来自本地应用的浏览器截图，使用示例数据，不是生成式效果图，没有伪造 AI 对话；截图过程未调用付费千问服务。

### 发布前

- 确认目标仓库和可见性。准备本地文件不等于已经发布。
- 逐项检查待提交文件。密钥、凭据 CSV、环境配置、日志、私人规划文档和个人数据不得进入仓库。
- 检查 README 语言切换、图片路径，确保配置及功能描述与代码一致。
- 运行 `pnpm test` 和 `pnpm build`；真实语音和搜图须另行测试，不能用构建通过代替。
- 保留 [LICENSE](../LICENSE)、[NOTICE.md](../NOTICE.md)和上游许可声明。专用许可允许作品商用，不允许把软件做成商业产品或服务；在依赖它处理许可争议前，建议独立法律审查。
- 只有另行授权、完成安全部署后才添加公开 Demo 地址。当前本地后端不适合直接暴露到公网。
