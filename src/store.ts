import {
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { create } from "zustand";
import { clampRect, deriveInteractive } from "./core";
import { loadSession, saveSession } from "./db";
import type {
  Board,
  BoardEvent,
  BoardOperation,
  InteractiveBlock,
  InteractiveTemplate,
  Rect,
  ReferenceImage,
  Session,
  TranscriptSegment,
} from "./types";

const now = Date.now();
const firstBoardId = crypto.randomUUID();

const defaultSession: Session = {
  id: crypto.randomUUID(),
  title: "理解，不止于对话",
  liveBoardId: firstBoardId,
  viewedBoardId: firstBoardId,
  boardOrder: [firstBoardId],
  boards: {
    [firstBoardId]: {
      id: firstBoardId,
      index: 1,
      title: "开始对话",
      status: "live",
      revision: 0,
      elements: [],
      files: {},
      interactiveBlocks: {},
      referenceImages: {},
      transcript: [],
      recentEvents: [],
    },
  },
  createdAt: now,
  updatedAt: now,
};

type Store = {
  session: Session;
  hydrated: boolean;
  saveStatus: "saved" | "saving" | "error";
  removedOverlay?: { boardId: string; block?: InteractiveBlock; image?: ReferenceImage };
  hydrate: () => Promise<void>;
  setViewedBoard: (boardId: string) => void;
  returnToLive: () => void;
  commitScene: (
    boardId: string,
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) => BoardEvent | undefined;
  addTranscript: (segment: Omit<TranscriptSegment, "id" | "at">) => void;
  updateInteractive: (
    boardId: string,
    blockId: string,
    state: Record<string, string | number | boolean>,
  ) => BoardEvent | undefined;
  moveInteractive: (boardId: string, blockId: string, x: number, y: number) => BoardEvent | undefined;
  updateReferenceImage: (boardId: string, imageId: string, rect: Rect) => BoardEvent | undefined;
  removeReferenceImage: (boardId: string, imageId: string) => BoardEvent | undefined;
  removeInteractive: (boardId: string, blockId: string) => BoardEvent | undefined;
  undoRemove: () => BoardEvent | undefined;
  addInteractive: (
    boardId: string,
    templateId: InteractiveTemplate,
    partial?: Partial<InteractiveBlock>,
  ) => InteractiveBlock;
  applyAiOps: (
    boardId: string,
    expectedRevision: number,
    operations: BoardOperation[],
  ) => { ok: boolean; board: Board; error?: string };
  advanceBoard: (fromBoardId: string, title: string) => Board;
};

function event(
  board: Board,
  type: BoardEvent["type"],
  payload: Record<string, unknown>,
  actor: BoardEvent["actor"] = "user",
): BoardEvent {
  return {
    id: crypto.randomUUID(),
    boardId: board.id,
    actor,
    type,
    baseRevision: board.revision,
    at: Date.now(),
    payload,
  };
}

function blockDefaults(templateId: InteractiveTemplate, owner: "user" | "ai"): Omit<InteractiveBlock, "id"> {
  const base = {
    owner,
    rect: { x: 860, y: 155, width: 580, height: 390 },
    feedbackPolicy: owner === "ai" ? "when_awaited" as const : "on_next_turn" as const,
    revision: 1,
  };

  if (templateId === "parameter_slider") {
    return {
      ...base,
      templateId,
      title: "利率如何改变月供？",
      config: { min: 1, max: 10, step: 0.1, unit: "%", principal: 1_000_000, years: 30 },
      state: { value: 3 },
      derivedOutput: {},
    };
  }
  if (templateId === "toggle_compare") {
    return {
      ...base,
      templateId,
      title: "方案对比",
      config: { offLabel: "固定利率", onLabel: "浮动利率" },
      state: { enabled: false },
      derivedOutput: {},
    };
  }
  if (templateId === "timeline_scrubber") {
    return {
      ...base,
      templateId,
      title: "过程时间线",
      config: { steps: ["开始", "变化", "拐点", "现在"] },
      state: { index: 0 },
      derivedOutput: {},
    };
  }
  return {
    ...base,
    templateId,
    title: "快速计算",
    config: {},
    state: { a: 12, b: 8 },
    derivedOutput: {},
  };
}

let saveSequence = 0;
let pendingSave = Promise.resolve();
function persist(session: Session) {
  if (typeof indexedDB === "undefined") return;
  const sequence = ++saveSequence;
  queueMicrotask(() => useBoardStore.setState({ saveStatus: "saving" }));
  pendingSave = pendingSave.catch(() => {}).then(() => saveSession(session));
  void pendingSave.then(() => {
    if (sequence === saveSequence) useBoardStore.setState({ saveStatus: "saved" });
  }, () => {
    if (sequence === saveSequence) useBoardStore.setState({ saveStatus: "error" });
  });
}

function normalizeSession(session: Session): Session {
  return {
    ...session,
    boards: Object.fromEntries(Object.entries(session.boards).map(([id, board]) => [id, {
      ...board,
      elements: board.elements.map((element) => ({
        ...element,
        strokeColor: ["#e9f1ec", "#ffffff", "#fff"].includes(element.strokeColor.toLowerCase()) ? "#303b34" : element.strokeColor,
        backgroundColor: element.backgroundColor === "#28483c" ? "#eef2e8" : element.backgroundColor,
      })),
      interactiveBlocks: board.interactiveBlocks ?? {},
      referenceImages: board.referenceImages ?? {},
      transcript: board.transcript ?? [],
      recentEvents: board.recentEvents ?? [],
    }])),
  };
}

function withBoard(
  session: Session,
  boardId: string,
  mutate: (board: Board) => Board,
): Session {
  const current = session.boards[boardId];
  if (!current) return session;
  const board = mutate(current);
  return {
    ...session,
    boards: { ...session.boards, [boardId]: board },
    updatedAt: Date.now(),
  };
}

export const useBoardStore = create<Store>((set, get) => ({
  session: defaultSession,
  hydrated: false,
  saveStatus: "saved",

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const saved = await loadSession();
      set({ session: saved ? normalizeSession(saved) : defaultSession, hydrated: true });
    } catch {
      set({ hydrated: true, saveStatus: "error" });
    }
  },

  setViewedBoard: (boardId) => set((state) => ({
    session: { ...state.session, viewedBoardId: boardId },
  })),

  returnToLive: () => set((state) => ({
    session: { ...state.session, viewedBoardId: state.session.liveBoardId },
  })),

  commitScene: (boardId, elements, files) => {
    let committed: BoardEvent | undefined;
    set((state) => {
      const previous = state.session.boards[boardId];
      if (!previous) return state;
      const previousById = new Map(previous.elements.map((item) => [item.id, item]));
      const changedElements = elements.filter((item) => {
        const old = previousById.get(item.id);
        return !old || old.version !== item.version || old.isDeleted !== item.isDeleted;
      });
      const changed = changedElements.length > 0 || previous.elements.length !== elements.length;
      if (!changed && Object.keys(files).length === Object.keys(previous.files).length) return state;

      committed = event(previous, "element.committed", {
        changed: changedElements.map((item) => ({
          id: item.id,
          type: item.type,
          text: "text" in item ? item.text : undefined,
          owner: item.customData?.owner ?? "user",
          deleted: item.isDeleted,
          rect: { x: Math.round(item.x), y: Math.round(item.y), width: Math.round(item.width), height: Math.round(item.height) },
        })),
      });
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        elements,
        files,
        recentEvents: [...board.recentEvents.slice(-19), committed!],
      }));
      persist(session);
      return { session };
    });
    return committed;
  },

  addTranscript: (segment) => set((state) => {
    const complete: TranscriptSegment = { ...segment, id: crypto.randomUUID(), at: Date.now() };
    const session = withBoard(state.session, segment.boardId, (board) => ({
      ...board,
      transcript: [...board.transcript, complete],
    }));
    persist(session);
    return { session };
  }),

  updateInteractive: (boardId, blockId, patch) => {
    let committed: BoardEvent | undefined;
    set((state) => {
      const current = state.session.boards[boardId];
      const existing = current?.interactiveBlocks[blockId];
      if (!current || !existing) return state;
      if (Object.entries(patch).every(([key, value]) => existing.state[key] === value)) return state;
      if (Object.values(patch).some((value) => typeof value === "number" && !Number.isFinite(value))) return state;
      const block = { ...existing, state: { ...existing.state, ...patch }, revision: existing.revision + 1 };
      block.derivedOutput = deriveInteractive(block);
      committed = event(current, "interactive.state.committed", {
        blockId,
        templateId: block.templateId,
        state: block.state,
        derivedOutput: block.derivedOutput,
      });
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        interactiveBlocks: { ...board.interactiveBlocks, [blockId]: block },
        recentEvents: [...board.recentEvents.slice(-19), committed!],
      }));
      persist(session);
      return { session };
    });
    return committed;
  },

  moveInteractive: (boardId, blockId, x, y) => {
    let moved: BoardEvent | undefined;
    set((state) => {
      const current = state.session.boards[boardId];
      const existing = current?.interactiveBlocks[blockId];
      if (!current || !existing) return state;
      const block = { ...existing, rect: clampRect({ ...existing.rect, x, y }), revision: existing.revision + 1 };
      if (block.rect.x === existing.rect.x && block.rect.y === existing.rect.y) return state;
      moved = event(current, "interactive.moved", { blockId, rect: block.rect });
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        interactiveBlocks: { ...board.interactiveBlocks, [blockId]: block },
        recentEvents: [...board.recentEvents.slice(-19), moved!],
      }));
      persist(session);
      return { session };
    });
    return moved;
  },

  updateReferenceImage: (boardId, imageId, rect) => {
    let committed: BoardEvent | undefined;
    set((state) => {
      const current = state.session.boards[boardId];
      const existing = current?.referenceImages[imageId];
      if (!current || !existing) return state;
      const bounded = clampRect({
        x: rect.x,
        y: rect.y,
        width: Math.max(240, Math.min(960, rect.width)),
        height: Math.max(200, Math.min(720, rect.height)),
      });
      const image: ReferenceImage = { ...existing, rect: bounded, revision: existing.revision + 1 };
      if (Object.keys(bounded).every((key) => bounded[key as keyof Rect] === existing.rect[key as keyof Rect])) return state;
      committed = event(current, "reference_image.committed", { imageId, action: "transform", rect: bounded });
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        referenceImages: { ...board.referenceImages, [imageId]: image },
        recentEvents: [...board.recentEvents.slice(-19), committed!],
      }));
      persist(session);
      return { session };
    });
    return committed;
  },

  removeReferenceImage: (boardId, imageId) => {
    let committed: BoardEvent | undefined;
    set((state) => {
      const current = state.session.boards[boardId];
      if (!current?.referenceImages[imageId]) return state;
      const referenceImages = { ...current.referenceImages };
      delete referenceImages[imageId];
      committed = event(current, "reference_image.committed", { imageId, action: "remove" });
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        referenceImages,
        recentEvents: [...board.recentEvents.slice(-19), committed!],
      }));
      persist(session);
      return { session, removedOverlay: { boardId, image: current.referenceImages[imageId] } };
    });
    return committed;
  },

  removeInteractive: (boardId, blockId) => {
    const current = get().session.boards[boardId];
    const block = current?.interactiveBlocks[blockId];
    if (!block) return;
    const blocks = { ...current.interactiveBlocks };
    delete blocks[blockId];
    const committed = event(current, "element.committed", { blockId, action: "remove" });
    const session = withBoard(get().session, boardId, (board) => ({
      ...board, revision: board.revision + 1, interactiveBlocks: blocks,
      recentEvents: [...board.recentEvents.slice(-19), committed],
    }));
    set({ session, removedOverlay: { boardId, block } });
    persist(session);
    return committed;
  },

  undoRemove: () => {
    const removed = get().removedOverlay;
    if (!removed) return;
    const current = get().session.boards[removed.boardId];
    if (!current) return;
    const committed = event(current, "element.committed", { action: "restore", elementId: removed.block?.id ?? removed.image?.id });
    const session = withBoard(get().session, current.id, (board) => ({
      ...board, revision: board.revision + 1,
      interactiveBlocks: removed.block ? { ...board.interactiveBlocks, [removed.block.id]: removed.block } : board.interactiveBlocks,
      referenceImages: removed.image ? { ...board.referenceImages, [removed.image.id]: removed.image } : board.referenceImages,
      recentEvents: [...board.recentEvents.slice(-19), committed],
    }));
    set({ session, removedOverlay: undefined });
    persist(session);
    return committed;
  },

  addInteractive: (boardId, templateId, partial = {}) => {
    const id = partial.id ?? crypto.randomUUID();
    const block = { ...blockDefaults(templateId, "user"), ...partial, id } as InteractiveBlock;
    const count = Object.keys(get().session.boards[boardId]?.interactiveBlocks ?? {}).length;
    block.rect = clampRect(partial.rect ?? { ...block.rect, x: 170 + (count % 2) * 630 + Math.floor(count / 4) * 28, y: 85 + (Math.floor(count / 2) % 2) * 410 });
    block.derivedOutput = deriveInteractive(block);
    set((state) => {
      const current = state.session.boards[boardId];
      if (!current) return state;
      const committed = event(current, "element.committed", { blockId: id, templateId }, "user");
      const session = withBoard(state.session, boardId, (board) => ({
        ...board,
        revision: board.revision + 1,
        interactiveBlocks: { ...board.interactiveBlocks, [id]: block },
        recentEvents: [...board.recentEvents.slice(-19), committed],
      }));
      persist(session);
      return { session };
    });
    return block;
  },

  applyAiOps: (boardId, expectedRevision, operations) => {
    const current = get().session.boards[boardId];
    if (!current) return { ok: false, board: get().session.boards[get().session.liveBoardId], error: "board_not_found" };
    if (current.revision !== expectedRevision) return { ok: false, board: current, error: "revision_conflict" };

    const ids = new Set([...current.elements.map((item) => item.id), ...Object.keys(current.interactiveBlocks), ...Object.keys(current.referenceImages)]);
    for (const operation of operations) {
      if (operation.op === "create") {
        if (operation.element.id && ids.has(operation.element.id)) return { ok: false, board: current, error: "duplicate_element_id" };
        if (operation.element.id) ids.add(operation.element.id);
        if (operation.element.type === "reference_image" && !operation.element.imageUrl?.startsWith("https://")) {
          return { ok: false, board: current, error: "invalid_image_asset" };
        }
        continue;
      }
      const block = current.interactiveBlocks[operation.elementId];
      const referenceImage = current.referenceImages[operation.elementId];
      const element = current.elements.find((item) => item.id === operation.elementId);
      const owner = block?.owner ?? referenceImage?.owner ?? element?.customData?.owner ?? "user";
      if (owner !== "ai") return { ok: false, board: current, error: "approval_required" };
    }

    let elements = [...current.elements];
    let blocks = { ...current.interactiveBlocks };
    let referenceImages = { ...current.referenceImages };
    for (const operation of operations) {
      if (operation.op === "create" && operation.element.type === "interactive") {
        const templateId = operation.element.templateId ?? "parameter_slider";
        const id = operation.element.id ?? crypto.randomUUID();
        const block = { ...blockDefaults(templateId, "ai"), id } as InteractiveBlock;
        block.rect = clampRect({
          ...block.rect,
          x: operation.element.x ?? block.rect.x,
          y: operation.element.y ?? block.rect.y,
          width: Math.max(480, operation.element.width ?? block.rect.width),
          height: Math.max(330, operation.element.height ?? block.rect.height),
        });
        block.derivedOutput = deriveInteractive(block);
        blocks[id] = block;
        continue;
      }
      if (operation.op === "create" && operation.element.type === "reference_image") {
        const item = operation.element;
        const id = item.id ?? crypto.randomUUID();
        const rect = clampRect({
          x: item.x ?? 900,
          y: item.y ?? 150,
          width: Math.max(240, item.width ?? 560),
          height: Math.max(200, item.height ?? 430),
        });
        referenceImages[id] = {
          id,
          owner: "ai",
          title: item.text?.trim() || "参考图片",
          imageUrl: item.imageUrl!,
          sourceUrl: item.sourceUrl ?? item.imageUrl!,
          sourceDomain: item.sourceDomain ?? new URL(item.imageUrl!).hostname,
          rect,
          revision: 1,
        };
        continue;
      }
      if (operation.op === "create") {
        const item = operation.element;
        const type = item.type === "note" ? "rectangle" : item.type;
        const skeleton = {
          id: item.id ?? crypto.randomUUID(),
          type,
          x: item.x ?? 160,
          y: item.y ?? 150,
          width: item.width ?? 360,
          height: item.height ?? 160,
          text: item.text,
          label: item.type === "note" ? { text: item.text ?? "" } : undefined,
          backgroundColor: item.type === "note" ? "#f5f5f5" : "transparent",
          strokeColor: "#252525",
          customData: { owner: "ai" },
        } as ExcalidrawElementSkeleton;
        elements.push(...convertToExcalidrawElements([skeleton]));
        continue;
      }
      if (operation.op === "remove") {
        if (blocks[operation.elementId]) {
          delete blocks[operation.elementId];
        } else if (referenceImages[operation.elementId]) {
          delete referenceImages[operation.elementId];
        } else {
          elements = elements.map((item) => item.id === operation.elementId ? { ...item, isDeleted: true, version: item.version + 1, updated: Date.now() } : item);
        }
        continue;
      }
      if (operation.op === "patch") {
        if (blocks[operation.elementId]) {
          const block = blocks[operation.elementId];
          blocks[operation.elementId] = {
            ...block,
            rect: clampRect({
              ...block.rect,
              x: operation.patch.x ?? block.rect.x,
              y: operation.patch.y ?? block.rect.y,
              width: Math.max(480, operation.patch.width ?? block.rect.width),
              height: Math.max(330, operation.patch.height ?? block.rect.height),
            }),
            revision: block.revision + 1,
          };
        } else if (referenceImages[operation.elementId]) {
          const image = referenceImages[operation.elementId];
          referenceImages[operation.elementId] = {
            ...image,
            rect: clampRect({
              x: operation.patch.x ?? image.rect.x,
              y: operation.patch.y ?? image.rect.y,
              width: operation.patch.width ?? image.rect.width,
              height: operation.patch.height ?? image.rect.height,
            }),
            revision: image.revision + 1,
          };
        } else {
          elements = elements.map((item) => item.id === operation.elementId
            ? { ...item, x: operation.patch.x ?? item.x, y: operation.patch.y ?? item.y, version: item.version + 1, updated: Date.now() }
            : item);
        }
      }
    }

    const committed = event(current, "element.committed", { operationCount: operations.length }, "ai");
    let nextBoard: Board = current;
    set((state) => {
      const session = withBoard(state.session, boardId, (board) => {
        nextBoard = {
          ...board,
          revision: board.revision + 1,
          elements,
          interactiveBlocks: blocks,
          referenceImages,
          recentEvents: [...board.recentEvents.slice(-19), committed],
        };
        return nextBoard;
      });
      persist(session);
      return { session };
    });
    return { ok: true, board: nextBoard };
  },

  advanceBoard: (fromBoardId, title) => {
    if (fromBoardId !== get().session.liveBoardId) throw new Error("只能从当前 LIVE 白板创建下一块板");
    const id = crypto.randomUUID();
    let result!: Board;
    set((state) => {
      const old = state.session.boards[fromBoardId];
      const newBoard: Board = {
        id,
        index: state.session.boardOrder.length + 1,
        title,
        status: "live",
        revision: 0,
        elements: [],
        files: {},
        interactiveBlocks: {},
        referenceImages: {},
        transcript: [],
        recentEvents: [],
      };
      result = newBoard;
      const session: Session = {
        ...state.session,
        liveBoardId: id,
        viewedBoardId: state.session.viewedBoardId === fromBoardId ? id : state.session.viewedBoardId,
        boardOrder: [...state.session.boardOrder, id],
        boards: {
          ...state.session.boards,
          ...(old ? { [fromBoardId]: { ...old, status: "history" as const } } : {}),
          [id]: newBoard,
        },
        updatedAt: Date.now(),
      };
      persist(session);
      return { session };
    });
    return result;
  },
}));
