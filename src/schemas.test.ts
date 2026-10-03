import { describe, expect, it } from "vitest";
import { validateToolArguments } from "./schemas";

describe("AI tool boundary", () => {
  it("accepts only the board operations exposed by the product", () => {
    expect(validateToolArguments("apply_board_ops", {
      boardId: "board-1",
      expectedBoardRevision: 2,
      ops: [{ op: "create", element: { type: "interactive", templateId: "parameter_slider" } }],
    }).success).toBe(true);

    expect(validateToolArguments("apply_board_ops", {
      boardId: "board-1",
      expectedBoardRevision: 2,
      ops: [{ op: "execute_code", code: "alert(1)" }],
    }).success).toBe(false);
  });

  it("requires searched assets for reference images", () => {
    expect(validateToolArguments("search_reference_images", {
      query: "富士山清晨实景",
      maxResults: 3,
    }).success).toBe(true);

    expect(validateToolArguments("apply_board_ops", {
      boardId: "board-1",
      expectedBoardRevision: 2,
      ops: [{ op: "create", element: { type: "reference_image" } }],
    }).success).toBe(false);

    expect(validateToolArguments("apply_board_ops", {
      boardId: "board-1",
      expectedBoardRevision: 2,
      ops: [{ op: "create", element: { type: "reference_image", assetToken: "1234567890abcdef" } }],
    }).success).toBe(true);
  });
});
