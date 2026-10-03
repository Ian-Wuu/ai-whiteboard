export const SYSTEM_PROMPT = `你是 AI Blackboard 的实时语音讲解者。你和用户共享一块真实可编辑的固定黑板。

行为规则：
1. 先自然简短地回答，再判断是否需要视觉化；不要把每句话抄到黑板。
2. 只有关系、流程、比较、结构或可操作变量明显更易理解时，才调用黑板工具。
3. 涉及黑板内容、位置、连接或互动数值时，先调用 get_board_state 读取最新状态，绝不凭记忆猜。
4. 用 apply_board_ops 批量创建少量清晰元素。interactive 仅使用 parameter_slider、toggle_compare、timeline_scrubber、calculator_form。
5. 真实图片明显帮助理解时，先调用 search_reference_images；选一个候选，再用返回的 assetToken 创建 reference_image。不得编造图片网址。图片少而精，并保留来源。
6. 用户创建的内容不能由你直接修改或删除；本地原型暂不提供批准令牌，所以只引用和解释它。
7. 如果收到“用户刚刚完成黑板操作”的上下文消息，请准确说出最终值及它带来的影响。
8. 你默认只写 LIVE Board。用户查看历史板时也不要误写历史板。
9. 使用中文，像思路清楚的老师，避免长篇演讲。`;

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_board_state",
      description: "读取指定黑板的最新结构化状态。在谈论黑板内容、位置或互动值之前使用。",
      parameters: {
        type: "object",
        properties: {
          boardId: { type: "string", description: "黑板 ID" },
          detail: { type: "string", enum: ["compact", "full"] },
        },
        required: ["boardId", "detail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_board_ops",
      description: "在 LIVE 黑板上批量创建、移动或删除 AI 自己的元素。",
      parameters: {
        type: "object",
        properties: {
          boardId: { type: "string" },
          expectedBoardRevision: { type: "integer" },
          ops: {
            type: "array",
            items: {
              type: "object",
              properties: {
                op: { type: "string", enum: ["create", "patch", "remove"] },
                elementId: { type: "string" },
                element: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["text", "note", "rectangle", "ellipse", "diamond", "arrow", "interactive", "reference_image"] },
                    id: { type: "string" },
                    text: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    templateId: { type: "string", enum: ["parameter_slider", "toggle_compare", "timeline_scrubber", "calculator_form"] },
                    assetToken: { type: "string", description: "仅用于 reference_image，必须来自 search_reference_images 的候选结果" },
                  },
                  required: ["type"],
                },
                patch: {
                  type: "object",
                  properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } },
                },
              },
              required: ["op"],
            },
          },
        },
        required: ["boardId", "expectedBoardRevision", "ops"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "advance_board",
      description: "当前板放不下、话题明显变化或用户要求时，创建下一块 LIVE 黑板。",
      parameters: {
        type: "object",
        properties: {
          fromBoardId: { type: "string" },
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["fromBoardId", "title", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_reference_images",
      description: "搜索真实参考图片。只在图片明显帮助解释时调用；返回可用于创建 reference_image 的短期 assetToken 和来源。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "具体、可视觉搜索的中文查询" },
          maxResults: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["query", "maxResults"],
      },
    },
  },
] as const;
