import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@excalidraw/excalidraw", () => ({ convertToExcalidrawElements: (items: unknown[]) => items }));
vi.mock("./db", () => ({ loadSession: vi.fn(), saveSession: vi.fn().mockResolvedValue(undefined) }));
import { useBoardStore } from "./store";
import { boardSummary } from "./core";

const initial = structuredClone(useBoardStore.getState().session);
beforeEach(() => useBoardStore.setState({ session: structuredClone(initial), removedOverlay: undefined }));
const current = () => useBoardStore.getState();
const board = () => current().session.boards[current().session.liveBoardId];

describe("shared board state", () => {
  it("commits precise values once and derives from the same state", () => {
    const block = current().addInteractive(board().id, "parameter_slider");
    const event = current().updateInteractive(board().id, block.id, { value: 6 });
    expect(event?.payload.state).toEqual({ value: 6 });
    expect(boardSummary(board()).interactiveBlocks[0].derivedOutput.monthlyPayment).toBe(5996);
    const revision = board().revision;
    expect(current().updateInteractive(board().id, block.id, { value: 6 })).toBeUndefined();
    expect(board().revision).toBe(revision);
  });
  it("places consecutive cards separately, bounds movement and ignores a stationary drag", () => {
    const first = current().addInteractive(board().id, "parameter_slider");
    const second = current().addInteractive(board().id, "toggle_compare");
    expect(first.rect).not.toEqual(second.rect);
    expect(current().moveInteractive(board().id, first.id, first.rect.x, first.rect.y)).toBeUndefined();
    current().moveInteractive(board().id, first.id, 9000, -200);
    expect(board().interactiveBlocks[first.id].rect).toMatchObject({ x: 1020, y: 0 });
  });
  it("rejects stale operations and prevents AI overwriting a user card using a duplicate ID", () => {
    const block = current().addInteractive(board().id, "parameter_slider");
    expect(current().applyAiOps(board().id, 0, []).error).toBe("revision_conflict");
    expect(current().applyAiOps(board().id, board().revision, [{ op: "create", element: { type: "interactive", id: block.id } }]).error).toBe("duplicate_element_id");
    expect(current().applyAiOps(board().id, board().revision, [{ op: "remove", elementId: block.id }]).error).toBe("approval_required");
    expect(board().interactiveBlocks[block.id].owner).toBe("user");
  });
  it("restores a deleted card on its original board, including its values", () => {
    const original = board().id;
    const block = current().addInteractive(original, "parameter_slider");
    current().updateInteractive(original, block.id, { value: 6 });
    current().removeInteractive(original, block.id);
    current().advanceBoard(original, "下一板");
    expect(current().undoRemove()?.boardId).toBe(original);
    expect(current().session.boards[original].interactiveBlocks[block.id].state.value).toBe(6);
  });
  it("keeps viewed history unchanged when AI advances LIVE", () => {
    const first = board().id;
    const second = current().advanceBoard(first, "二").id;
    current().setViewedBoard(first);
    const third = current().advanceBoard(second, "三").id;
    expect(current().session.viewedBoardId).toBe(first);
    expect(current().session.liveBoardId).toBe(third);
    expect(current().session.boards[second].status).toBe("history");
    expect(() => current().advanceBoard(first, "非法换板")).toThrow();
  });
});
