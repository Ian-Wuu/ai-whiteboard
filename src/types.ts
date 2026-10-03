import type {
  ExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

export type Actor = "user" | "ai" | "system";
export type InteractiveTemplate =
  | "parameter_slider"
  | "toggle_compare"
  | "timeline_scrubber"
  | "calculator_form";

export type Rect = { x: number; y: number; width: number; height: number };

export type ReferenceImage = {
  id: string;
  owner: "ai";
  title: string;
  imageUrl: string;
  sourceUrl: string;
  sourceDomain: string;
  rect: Rect;
  revision: number;
};

export type InteractiveBlock = {
  id: string;
  owner: "user" | "ai";
  templateId: InteractiveTemplate;
  title: string;
  rect: Rect;
  config: Record<string, string | number | boolean | string[]>;
  state: Record<string, string | number | boolean>;
  derivedOutput: Record<string, string | number>;
  feedbackPolicy: "on_next_turn" | "when_awaited";
  revision: number;
};

export type TranscriptSegment = {
  id: string;
  role: "user" | "assistant";
  text: string;
  boardId: string;
  turnId: string;
  at: number;
};

export type BoardEvent = {
  id: string;
  boardId: string;
  actor: Actor;
  type:
    | "element.committed"
    | "interactive.state.committed"
    | "interactive.moved"
    | "reference_image.committed"
    | "board.advanced";
  baseRevision: number;
  at: number;
  payload: Record<string, unknown>;
};

export type Board = {
  id: string;
  index: number;
  title: string;
  status: "live" | "history";
  revision: number;
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  interactiveBlocks: Record<string, InteractiveBlock>;
  referenceImages: Record<string, ReferenceImage>;
  transcript: TranscriptSegment[];
  recentEvents: BoardEvent[];
};

export type Session = {
  id: string;
  title: string;
  liveBoardId: string;
  viewedBoardId: string;
  boardOrder: string[];
  boards: Record<string, Board>;
  createdAt: number;
  updatedAt: number;
};

export type BoardOperation =
  | {
      op: "create";
      element: {
        type:
          | "text"
          | "note"
          | "rectangle"
          | "ellipse"
          | "diamond"
          | "arrow"
          | "interactive"
          | "reference_image";
        id?: string;
        text?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        templateId?: InteractiveTemplate;
        assetToken?: string;
        imageUrl?: string;
        sourceUrl?: string;
        sourceDomain?: string;
      };
    }
  | {
      op: "patch";
      elementId: string;
      patch: { x?: number; y?: number; width?: number; height?: number };
    }
  | { op: "remove"; elementId: string };
