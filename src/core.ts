import type { Board, InteractiveBlock } from "./types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;

export function clampRect<T extends { x: number; y: number; width: number; height: number }>(rect: T): T {
  const width = Math.min(BOARD_WIDTH, Math.max(1, Number.isFinite(rect.width) ? rect.width : 1));
  const height = Math.min(BOARD_HEIGHT, Math.max(1, Number.isFinite(rect.height) ? rect.height : 1));
  return {
    ...rect,
    width,
    height,
    x: Math.max(0, Math.min(BOARD_WIDTH - width, Number.isFinite(rect.x) ? rect.x : 0)),
    y: Math.max(0, Math.min(BOARD_HEIGHT - height, Number.isFinite(rect.y) ? rect.y : 0)),
  };
}

export type BoardView = { zoom: number; scrollX: number; scrollY: number };

export function constrainView(view: BoardView, width: number, height: number): BoardView {
  const fit = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT);
  const zoom = Math.max(fit, Math.min(2, view.zoom));
  const axis = (viewport: number, board: number, scroll: number) => viewport / zoom >= board
    ? (viewport / zoom - board) / 2
    : Math.max(viewport / zoom - board, Math.min(0, scroll));
  return { zoom, scrollX: axis(width, BOARD_WIDTH, view.scrollX), scrollY: axis(height, BOARD_HEIGHT, view.scrollY) };
}

export function clampElements(elements: readonly ExcalidrawElement[]) {
  let corrected = false;
  const bounded = elements.map((element) => {
    if (element.isDeleted) return element;
    const x = Math.max(0, Math.min(Math.max(0, BOARD_WIDTH - element.width), element.x));
    const y = Math.max(0, Math.min(Math.max(0, BOARD_HEIGHT - element.height), element.y));
    if (x === element.x && y === element.y) return element;
    corrected = true;
    return { ...element, x, y, version: element.version + 1, updated: Date.now() } as ExcalidrawElement;
  });
  return { elements: bounded, corrected };
}

export function deriveInteractive(block: InteractiveBlock): Record<string, string | number> {
  if (block.templateId === "parameter_slider") {
    const principal = Number(block.config.principal ?? 1_000_000);
    const years = Number(block.config.years ?? 30);
    const rate = Number(block.state.value ?? 3);
    const monthlyRate = rate / 1200;
    const months = years * 12;
    const payment = monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1);
    return { value: rate, monthlyPayment: Math.round(payment) };
  }

  if (block.templateId === "toggle_compare") {
    const enabled = Boolean(block.state.enabled);
    return { selected: enabled ? String(block.config.onLabel ?? "方案 B") : String(block.config.offLabel ?? "方案 A") };
  }

  if (block.templateId === "timeline_scrubber") {
    const index = Number(block.state.index ?? 0);
    const steps = Array.isArray(block.config.steps) ? block.config.steps : [];
    return { index, step: String(steps[index] ?? "") };
  }

  const a = Number(block.state.a ?? 0);
  const b = Number(block.state.b ?? 0);
  return { result: a + b };
}

export function boardSummary(board: Board) {
  const visibleElements = board.elements.filter((element) => !element.isDeleted);
  return {
    boardId: board.id,
    title: board.title,
    revision: board.revision,
    elements: visibleElements.map((element) => ({
        id: element.id,
        type: element.type,
        text: "text" in element ? element.text : undefined,
        owner: element.customData?.owner ?? "user",
        region: {
          horizontal: element.x + element.width / 2 < BOARD_WIDTH / 3 ? "left" : element.x + element.width / 2 > BOARD_WIDTH * 2 / 3 ? "right" : "center",
          vertical: element.y + element.height / 2 < BOARD_HEIGHT / 3 ? "top" : element.y + element.height / 2 > BOARD_HEIGHT * 2 / 3 ? "bottom" : "middle",
        },
        rect: {
          x: Math.round(element.x),
          y: Math.round(element.y),
          width: Math.round(element.width),
          height: Math.round(element.height),
        },
        normalizedRect: {
          x: Number((element.x / BOARD_WIDTH).toFixed(3)),
          y: Number((element.y / BOARD_HEIGHT).toFixed(3)),
          width: Number((element.width / BOARD_WIDTH).toFixed(3)),
          height: Number((element.height / BOARD_HEIGHT).toFixed(3)),
        },
        connectedTo: element.type === "arrow"
          ? [element.startBinding?.elementId, element.endBinding?.elementId].filter(Boolean)
          : undefined,
      })),
    interactiveBlocks: Object.values(board.interactiveBlocks).map((block) => ({
      id: block.id,
      templateId: block.templateId,
      title: block.title,
      owner: block.owner,
      rect: block.rect,
      state: block.state,
      derivedOutput: block.derivedOutput,
    })),
    referenceImages: Object.values(board.referenceImages).map((image) => ({
      id: image.id,
      title: image.title,
      owner: image.owner,
      sourceDomain: image.sourceDomain,
      sourceUrl: image.sourceUrl,
      rect: image.rect,
      region: {
        horizontal: image.rect.x + image.rect.width / 2 < BOARD_WIDTH / 3 ? "left" : image.rect.x + image.rect.width / 2 > BOARD_WIDTH * 2 / 3 ? "right" : "center",
        vertical: image.rect.y + image.rect.height / 2 < BOARD_HEIGHT / 3 ? "top" : image.rect.y + image.rect.height / 2 > BOARD_HEIGHT * 2 / 3 ? "bottom" : "middle",
      },
    })),
    recentEvents: board.recentEvents.slice(-8),
  };
}
