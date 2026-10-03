import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, clampElements, constrainView, type BoardView } from "./core";
import { InteractiveBlockView } from "./InteractiveBlockView";
import { ReferenceImageView } from "./ReferenceImageView";
import { useBoardStore } from "./store";
import type { BoardEvent, InteractiveBlock } from "./types";

type Props = { boardId: string; onBoardEvent: (event: BoardEvent, respond?: boolean) => void };

class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="block-error" role="alert">组件暂时无法显示，请刷新后重试。</div> : this.props.children; }
}

export function BoardCanvas({ boardId, onBoardEvent }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<{ elements: readonly ExcalidrawElement[]; files: BinaryFiles }>();
  const pointerDown = useRef(false);
  const editingText = useRef(false);
  const applyingScene = useRef(false);
  const dimensions = useRef({ width: 1600, height: 900 });
  const initialView = useRef<BoardView>();
  const [measured, setMeasured] = useState(false);
  const [view, setView] = useState<BoardView>({ zoom: 1, scrollX: 0, scrollY: 0 });
  const [focusedBlock, setFocusedBlock] = useState<string>();
  const [editorApi, setEditorApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const editorRef = useRef<ExcalidrawImperativeAPI | null>(null);
  editorRef.current = editorApi;
  const board = useBoardStore((state) => state.session.boards[boardId]);
  const store = useBoardStore;

  const flush = () => {
    clearTimeout(commitTimer.current);
    const snapshot = pending.current;
    if (!snapshot) return;
    pending.current = undefined;
    const bounded = clampElements(snapshot.elements);
    const event = store.getState().commitScene(boardId, bounded.elements, snapshot.files);
    if (event) onBoardEvent(event, false);
    if (bounded.corrected) editorApi?.updateScene({ elements: bounded.elements });
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const fit = () => {
    if (stageRef.current) dimensions.current = { width: stageRef.current.clientWidth, height: stageRef.current.clientHeight };
    const { width, height } = dimensions.current;
    if (!width || !height) return;
    const next = constrainView({ zoom: Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT), scrollX: 0, scrollY: 0 }, width, height);
    editorRef.current?.updateScene({ appState: { zoom: { value: next.zoom as AppState["zoom"]["value"] }, scrollX: next.scrollX, scrollY: next.scrollY } });
    setView(next);
  };

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      dimensions.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      if (!initialView.current) {
        const { width, height } = dimensions.current;
        initialView.current = constrainView({ zoom: Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT), scrollX: 0, scrollY: 0 }, width, height);
        setMeasured(true);
      }
      fit();
    });
    observer.observe(stageRef.current);
    const save = () => flushRef.current();
    window.addEventListener("pagehide", save);
    // Reading/operating from AI must see the last local edit, even before its debounce expires.
    window.addEventListener("blackboard:flush", save);
    return () => {
      observer.disconnect();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("blackboard:flush", save);
      flushRef.current();
    };
  }, []);

  useEffect(() => {
    if (!editorApi) return;
    applyingScene.current = true;
    editorApi.updateScene({ elements: board.elements });
    editorApi.addFiles(Object.values(board.files));
    applyingScene.current = false;
  }, [board.elements, board.files, editorApi]);

  useEffect(() => {
    if (editorApi) fit();
  }, [editorApi]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (focusedBlock && dialog && !dialog.open) dialog.showModal();
    else if (!focusedBlock && dialog?.open) dialog.close();
  }, [focusedBlock]);

  const renderBlock = (block: InteractiveBlock, focused = false) => (
    <BlockBoundary key={block.id}>
      <InteractiveBlockView boardId={boardId} block={block} zoom={focused ? 1 : view.zoom} focused={focused} onFocus={setFocusedBlock}
        onMove={(x, y) => { const event = store.getState().moveInteractive(boardId, block.id, x, y); if (event) onBoardEvent(event, false); }}
        onCommit={(patch) => {
          const event = store.getState().updateInteractive(boardId, block.id, patch);
          if (event) onBoardEvent(event, block.feedbackPolicy === "when_awaited");
          return event;
        }}
        onRemove={() => { const event = store.getState().removeInteractive(boardId, block.id); if (event) onBoardEvent(event, false); }}
      />
    </BlockBoundary>
  );

  return (
    <div className="board-stage" ref={stageRef}>
      <div className="board-surface">
        <div className="board-editor">
          {measured && <Excalidraw excalidrawAPI={setEditorApi}
            initialData={{ elements: board.elements, files: board.files, appState: {
              theme: "light", viewBackgroundColor: "#ffffff", currentItemStrokeColor: "#252525",
              scrollX: initialView.current!.scrollX, scrollY: initialView.current!.scrollY, zoom: { value: initialView.current!.zoom as AppState["zoom"]["value"] },
            } }}
            theme="light" langCode="zh-CN" handleKeyboardGlobally={false}
            UIOptions={{ canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveAsImage: false, saveToActiveFile: false, toggleTheme: false } }}
            onPointerDown={() => { pointerDown.current = true; clearTimeout(commitTimer.current); }}
            onPointerUp={() => { pointerDown.current = false; queueMicrotask(() => { if (!editingText.current) flushRef.current(); }); }}
            onChange={(elements, appState, files) => {
              const { width, height } = dimensions.current;
              const next = constrainView({ zoom: appState.zoom.value, scrollX: appState.scrollX, scrollY: appState.scrollY }, width, height);
              setView((current) => current.zoom === next.zoom && current.scrollX === next.scrollX && current.scrollY === next.scrollY ? current : next);
              // Correct an attempted pan beyond the board even if the bounded view is unchanged.
              if (next.zoom !== appState.zoom.value || next.scrollX !== appState.scrollX || next.scrollY !== appState.scrollY) {
                editorApi?.updateScene({ appState: { zoom: { value: next.zoom as AppState["zoom"]["value"] }, scrollX: next.scrollX, scrollY: next.scrollY } });
              }
              if (applyingScene.current) return;
              editingText.current = Boolean(appState.editingTextElement);
              pending.current = { elements, files };
              clearTimeout(commitTimer.current);
              if (!pointerDown.current && !editingText.current) commitTimer.current = setTimeout(() => flushRef.current(), 400);
            }}
          />}
        </div>
        <div className="interactive-layer" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `translate(${view.scrollX * view.zoom}px, ${view.scrollY * view.zoom}px) scale(${view.zoom})` }}>
          {Object.values(board.interactiveBlocks).map((block) => renderBlock(block))}
          {Object.values(board.referenceImages).map((image) => (
            <ReferenceImageView key={image.id} image={image} zoom={view.zoom}
              onTransform={(rect) => { const event = store.getState().updateReferenceImage(boardId, image.id, rect); if (event) onBoardEvent(event, false); }}
              onRemove={() => { const event = store.getState().removeReferenceImage(boardId, image.id); if (event) onBoardEvent(event, false); }} />
          ))}
        </div>
      </div>
      <button type="button" className="fit-board" onClick={fit} aria-label="适应白板大小">{Math.round(view.zoom * 100)}% · 适应画布</button>
      <dialog ref={dialogRef} className="focus-dialog" aria-label="放大互动组件" onCancel={() => setFocusedBlock(undefined)} onClose={() => setFocusedBlock(undefined)} onClick={(event) => { if (event.target === event.currentTarget) setFocusedBlock(undefined); }}>
        {focusedBlock && board.interactiveBlocks[focusedBlock] && renderBlock(board.interactiveBlocks[focusedBlock], true)}
      </dialog>
    </div>
  );
}
