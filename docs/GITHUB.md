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
| [scene-design.jpg](assets/scene-design.jpg) | Prepared design-review scene with a generated room reference and editable annotations |
| [scene-finance.jpg](assets/scene-finance.jpg) | Prepared rate comparison with a real 6% interest slider |
| [scene-learning.jpg](assets/scene-learning.jpg) | Editable feedback-loop lesson beside an interactive timeline |
| [scene-history.jpg](assets/scene-history.jpg) | Design scene viewed as a historical board |
| [reading-room-reference.png](assets/reading-room-reference.png) | Imagegen-generated imaginary space used inside the design scene |
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

### Scene reference provenance

The reading-room image is an imaginary architectural reference generated with the built-in imagegen tool. It was copied into this repository and inserted into the running editor. The scene screenshots use editable text/shapes and actual application controls; they are curated examples, not automatically generated AI responses. Comparison bars and diagrams are static annotations, not bound to widget state.

Final reference-image prompt:

```text
Use case: photorealistic-natural.
Asset type: reference photograph placed inside a real AI Whiteboard design-review demo, not a UI mockup.
Primary request: a refined architectural photograph of an imaginary small reading room, curved white plaster wall, one recessed semicircular window with a deep reveal, a low stone bench, pale textured floor. Minimal, tactile, no people, restrained nearly monochrome warm-white and charcoal palette.
Composition: horizontal 4:3 photograph, eye-level architectural lens, straight verticals, coherent plausible geometry, generous quiet planes. Window and soft geometric sunlight are the focal point. Elegant soft afternoon side light, subtle plaster grain, natural fine shadows. Editorial architecture photography, not glossy CGI.
No text, annotations, diagrams, frames, branding, watermarks, furniture clutter, plants or bright colors. This is a single reference image, not a collage or interface.
```

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
| [scene-design.jpg](assets/scene-design.jpg) | 设计讨论场景：生成的空间参考图与可编辑标注 |
| [scene-finance.jpg](assets/scene-finance.jpg) | 利率对比场景，使用真实的 6% 互动滑块 |
| [scene-learning.jpg](assets/scene-learning.jpg) | 可编辑反馈循环课程与真实时间线 |
| [scene-history.jpg](assets/scene-history.jpg) | 以历史白板查看设计场景 |
| [reading-room-reference.png](assets/reading-room-reference.png) | 板内使用的 imagegen 虚构空间参考图 |
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

### 场景素材来源

阅读空间是使用内置 imagegen 生成的虚构建筑参考图，已保存到仓库并放入真实编辑器。场景截图使用可编辑文字、图形和实际控件，是整理后的示例，不是自动生成的 AI 回答。对比条与流程图为静态标注，没有与组件数值自动绑定。

完整参考图提示词见上方英文部分：极简阅读空间、弧形白色抹灰墙、深窗洞、低石凳、柔和自然侧光，无人物、文字、品牌或装饰性杂物；只生成板内参考图，不生成应用界面。

### 发布前

- 确认目标仓库和可见性。准备本地文件不等于已经发布。
- 逐项检查待提交文件。密钥、凭据 CSV、环境配置、日志、私人规划文档和个人数据不得进入仓库。
- 检查 README 语言切换、图片路径，确保配置及功能描述与代码一致。
- 运行 `pnpm test` 和 `pnpm build`；真实语音和搜图须另行测试，不能用构建通过代替。
- 保留 [LICENSE](../LICENSE)、[NOTICE.md](../NOTICE.md)和上游许可声明。专用许可允许作品商用，不允许把软件做成商业产品或服务；在依赖它处理许可争议前，建议独立法律审查。
- 只有另行授权、完成安全部署后才添加公开 Demo 地址。当前本地后端不适合直接暴露到公网。
