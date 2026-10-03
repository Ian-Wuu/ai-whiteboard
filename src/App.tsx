import { useEffect, useMemo, useRef, useState } from "react";
import { BoardCanvas } from "./BoardCanvas";
import { useRealtime } from "./realtime";
import { useBoardStore } from "./store";
import type { InteractiveTemplate } from "./types";

const templates: { id: InteractiveTemplate; label: string; icon: string }[] = [
  { id: "parameter_slider", label: "参数滑块", icon: "↔" },
  { id: "toggle_compare", label: "方案对比", icon: "⇄" },
  { id: "timeline_scrubber", label: "时间线", icon: "→" },
  { id: "calculator_form", label: "计算器", icon: "+" },
];
const statusCopy = { idle: "一起，把想法看清。", connecting: "正在连接千问…", listening: "正在听，请讲", thinking: "正在思考", speaking: "正在讲解", error: "连接未完成" } as const;

export default function App() {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const injectedRef = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const session = useBoardStore((state) => state.session);
  const hydrated = useBoardStore((state) => state.hydrated);
  const saveStatus = useBoardStore((state) => state.saveStatus);
  const removedOverlay = useBoardStore((state) => state.removedOverlay);
  const hydrate = useBoardStore((state) => state.hydrate);
  const realtime = useRealtime();
  const board = session.boards[session.viewedBoardId];
  const viewedIndex = session.boardOrder.indexOf(session.viewedBoardId);
  const voiceActive = realtime.status !== "idle" && realtime.status !== "error";
  const transcripts = useMemo(() => session.boardOrder.flatMap((id) => session.boards[id]?.transcript ?? []).sort((a, b) => a.at - b.at), [session.boardOrder, session.boards]);
  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (realtime.status === "idle" || realtime.status === "error") injectedRef.current = false;
    if (realtime.status === "listening" && !injectedRef.current) { realtime.injectLiveBoard(); injectedRef.current = true; }
  }, [realtime.status, realtime.injectLiveBoard]);
  useEffect(() => { transcriptEnd.current?.scrollIntoView({ block: "nearest" }); }, [transcripts.length]);

  if (!hydrated || !board) return <main className="loading-screen" role="status">正在恢复你的白板…</main>;
  const store = useBoardStore.getState();
  const flush = () => window.dispatchEvent(new Event("blackboard:flush"));
  const moveBoard = (id: string) => { flush(); useBoardStore.getState().setViewedBoard(id); };
  const addTemplate = (id: InteractiveTemplate) => {
    flush();
    store.addInteractive(board.id, id);
    const event = useBoardStore.getState().session.boards[board.id].recentEvents.at(-1);
    if (event) realtime.sendBoardEvent(event, false);
  };
  const createBoard = () => {
    flush();
    const next = store.advanceBoard(session.liveBoardId, `白板 ${session.boardOrder.length + 1}`);
    moveBoard(next.id);
    if (voiceActive) realtime.injectLiveBoard();
  };
  const empty = !board.elements.some((item) => !item.isDeleted) && !Object.keys(board.interactiveBlocks).length && !Object.keys(board.referenceImages).length;

  return (
    <main className={`app-shell ${transcriptOpen ? "" : "app-shell--transcript-closed"}`}>
      <header className="topbar">
        <strong className="brand">Whiteboard</strong>
        <details className="add-menu">
          <summary>＋ 添加互动</summary>
          <div>{templates.map((template) => <button key={template.id} type="button" onClick={(event) => { addTemplate(template.id); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{template.label}</button>)}</div>
        </details>
        <nav className="board-navigation" aria-label="白板切换">
          <button type="button" disabled={viewedIndex <= 0} onClick={() => moveBoard(session.boardOrder[viewedIndex - 1])} aria-label="上一块白板">←</button>
          <span>{board.index} / {session.boardOrder.length}</span>
          <button type="button" disabled={viewedIndex >= session.boardOrder.length - 1} onClick={() => moveBoard(session.boardOrder[viewedIndex + 1])} aria-label="下一块白板">→</button>
          <button type="button" onClick={createBoard} aria-label="新建白板">＋</button>
          {board.status === "history" && <button type="button" onClick={() => moveBoard(session.liveBoardId)}>回到当前</button>}
        </nav>
        <div className="topbar-actions">
          <span className={`save-status save-status--${saveStatus}`} role="status">{saveStatus === "saved" ? "已保存" : saveStatus === "saving" ? "保存中…" : "保存失败，请勿关闭"}</span>
          <button type="button" className="panel-toggle" aria-label="切换对话文字" aria-expanded={transcriptOpen} aria-controls="transcript" onClick={() => setTranscriptOpen(!transcriptOpen)}>对话 {transcriptOpen ? "×" : "☰"}</button>
        </div>
      </header>
      <section className="workspace">
        <div className="board-column">
          <div className="canvas-wrap">
            <BoardCanvas key={board.id} boardId={board.id} onBoardEvent={realtime.sendBoardEvent} />
            {empty && <div className="empty-board-hint"><p>说说你想弄懂什么。</p><span>也可以直接画下来。</span></div>}
          </div>
          <footer className="voice-dock">
            {voiceActive && <span className="voice-label" aria-live="polite">{statusCopy[realtime.status]}</span>}
            <button type="button" className={`mic-button ${voiceActive ? "mic-button--active" : ""}`} onClick={voiceActive ? realtime.disconnect : realtime.connect}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4m-3 0h6" /></svg>
              {voiceActive ? "结束对话" : "开始对话"}
            </button>
            {voiceActive && <button type="button" className="stop-button" onClick={realtime.cancel} disabled={realtime.status === "listening" || realtime.status === "connecting"}>停止回答</button>}
            {(realtime.error || realtime.liveCaption || realtime.activity) && <p className="live-caption" role="status">{realtime.error || realtime.liveCaption || realtime.activity}</p>}
          </footer>
        </div>
        {transcriptOpen && <aside className="transcript-panel" id="transcript">
          <header><h2>对话</h2><button className="icon-button" type="button" onClick={() => setTranscriptOpen(false)} aria-label="关闭对话面板">×</button></header>
          <div className="transcript-list">{transcripts.length === 0
            ? <p className="transcript-empty">对话开始后，文字会留在这里。</p>
            : transcripts.map((segment) => <button type="button" className={`transcript-item transcript-item--${segment.role}`} key={segment.id} onClick={() => moveBoard(segment.boardId)}><span>{segment.role === "user" ? "你" : "AI"}<small>白板 {session.boards[segment.boardId]?.index}</small></span><p>{segment.text}</p></button>)}
            <div ref={transcriptEnd} />
          </div>
          <div className="privacy-note">不保存原始语音</div>
        </aside>}
      </section>
      {removedOverlay && <div className="undo-toast" role="status"><span>已删除</span><button type="button" onClick={() => { const event = store.undoRemove(); if (event) realtime.sendBoardEvent(event, false); }}>撤销</button><button type="button" aria-label="关闭撤销提示" onClick={() => useBoardStore.setState({ removedOverlay: undefined })}>×</button></div>}
    </main>
  );
}
