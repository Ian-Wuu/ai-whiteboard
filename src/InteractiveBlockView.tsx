import { useEffect, useRef, useState } from "react";
import { clampRect, deriveInteractive } from "./core";
import { useBoardDrag } from "./useBoardDrag";
import type { BoardEvent, InteractiveBlock } from "./types";

type Props = {
  boardId: string;
  block: InteractiveBlock;
  zoom: number;
  focused?: boolean;
  onFocus: (id?: string) => void;
  onCommit: (state: Record<string, string | number | boolean>) => BoardEvent | undefined;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
};

export function InteractiveBlockView({ boardId, block, zoom, focused, onFocus, onCommit, onMove, onRemove }: Props) {
  const committedRef = useRef(block.state);
  const [preview, setPreview] = useState(block.state);
  useEffect(() => { committedRef.current = block.state; setPreview(block.state); }, [block.state]);
  const rect = clampRect({ ...block.rect, width: Math.max(480, block.rect.width), height: Math.max(330, block.rect.height) });
  const drag = useBoardDrag(rect, zoom, (next) => onMove(next.x, next.y));
  const output = deriveInteractive({ ...block, state: preview });
  const steps = Array.isArray(block.config.steps) ? block.config.steps : [];
  const commit = (patch: Record<string, string | number | boolean>) => {
    if (Object.entries(patch).every(([key, value]) => committedRef.current[key] === value)) return;
    const accepted = onCommit(patch);
    if (accepted) committedRef.current = { ...committedRef.current, ...patch };
    setPreview(committedRef.current);
  };
  const range = (field: string) => ({
    value: Number(preview[field]),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setPreview((state) => ({ ...state, [field]: Number(event.target.value) })),
    onPointerUp: (event: React.PointerEvent<HTMLInputElement>) => commit({ [field]: Number(event.currentTarget.value) }),
    onPointerCancel: () => setPreview(committedRef.current),
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => commit({ [field]: Number(event.currentTarget.value) }),
    onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) commit({ [field]: Number(event.currentTarget.value) });
    },
  });

  return (
    <article className={`interactive-block ${focused ? "interactive-block--focused" : ""}`}
      style={focused ? undefined : { left: drag.rect.x, top: drag.rect.y, width: drag.rect.width, height: drag.rect.height }}
      data-board-id={boardId} data-template={block.templateId}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onKeyUp={(event) => event.stopPropagation()}>
      <header className="interactive-block__header">
        <div className="card-drag-handle" tabIndex={focused ? undefined : 0} aria-label={focused ? undefined : `移动${block.title}，可用方向键`} {...(focused ? {} : drag.bind("move"))}>
          <h3>{block.title}</h3>
        </div>
        <div className="card-actions">
          <button type="button" onClick={() => onFocus(focused ? undefined : block.id)} aria-label={focused ? "收起互动组件" : `放大${block.title}`}>{focused ? "完成" : "放大 ↗"}</button>
          {!focused && <button type="button" onClick={onRemove} aria-label={`删除${block.title}`}>×</button>}
        </div>
      </header>
      <div className="interactive-block__body">
        {block.templateId === "parameter_slider" && <>
          <div className="interactive-number"><strong>{Number(preview.value).toFixed(1)}<small>%</small></strong><span>年利率</span></div>
          <div className="range-control">
            <input aria-label="年利率" type="range" min={Number(block.config.min ?? 1)} max={Number(block.config.max ?? 10)} step={Number(block.config.step ?? 0.1)} {...range("value")} />
            <div className="range-labels"><span>{Number(block.config.min ?? 1)}%</span><span>{Number(block.config.max ?? 10)}%</span></div>
          </div>
          <div className="interactive-result"><span>{Number(block.config.principal ?? 1_000_000).toLocaleString("zh-CN")} 元 · {Number(block.config.years ?? 30)} 年等额本息</span><div>每月还款 <strong>¥{Number(output.monthlyPayment).toLocaleString("zh-CN")}</strong></div></div>
        </>}
        {block.templateId === "toggle_compare" && <>
          <div className="comparison"><span className={!preview.enabled ? "is-current" : ""}>{String(block.config.offLabel)}</span><button type="button" className={`toggle ${preview.enabled ? "toggle--on" : ""}`} role="switch" aria-label="切换对比方案" aria-checked={Boolean(preview.enabled)} onClick={() => commit({ enabled: !preview.enabled })}><i /></button><span className={preview.enabled ? "is-current" : ""}>{String(block.config.onLabel)}</span></div>
          <div className="interactive-result">当前选择 <strong>{output.selected}</strong></div>
        </>}
        {block.templateId === "timeline_scrubber" && <>
          <div className="interactive-number"><strong>{String(Number(preview.index) + 1).padStart(2, "0")}</strong><span>{output.step}</span></div>
          <input aria-label="时间线位置" type="range" min="0" max={Math.max(0, steps.length - 1)} step="1" {...range("index")} />
          <ol className="timeline-labels" style={{ gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, 1fr)` }}>{steps.map((step, index) => <li key={`${index}-${step}`} className={index === Number(preview.index) ? "is-current" : ""}>{step}</li>)}</ol>
        </>}
        {block.templateId === "calculator_form" && <>
          <div className="calculator-inputs">{["a", "b"].map((field, index) => <label key={field}><span>{index ? "加数 B" : "加数 A"}</span><input type="number" value={Number(preview[field])} onChange={(event) => setPreview({ ...preview, [field]: Number(event.target.value) })} onBlur={() => commit({ [field]: Number(preview[field]) })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>)}</div>
          <div className="interactive-result">相加结果 <strong>{output.result}</strong></div>
        </>}
      </div>
    </article>
  );
}
