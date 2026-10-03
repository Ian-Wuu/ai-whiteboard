import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { clampRect } from "./core";
import type { Rect } from "./types";

// Gesture previews stay local. Only the release produces a board event.
export function useBoardDrag(rect: Rect, zoom: number, commit: (rect: Rect) => void, minSize = { width: 240, height: 200 }) {
  const gesture = useRef<{ x: number; y: number; rect: Rect; kind: "move" | "resize" }>();
  const [preview, setPreview] = useState<Rect>();
  const calculate = (event: PointerEvent) => {
    const start = gesture.current!;
    const dx = (event.clientX - start.x) / zoom;
    const dy = (event.clientY - start.y) / zoom;
    return clampRect(start.kind === "move"
      ? { ...start.rect, x: start.rect.x + dx, y: start.rect.y + dy }
      : { ...start.rect, width: Math.max(minSize.width, start.rect.width + dx), height: Math.max(minSize.height, start.rect.height + dy) });
  };
  const bind = (kind: "move" | "resize") => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { x: event.clientX, y: event.clientY, rect, kind };
    },
    onPointerMove: (event: PointerEvent) => { if (gesture.current) setPreview(calculate(event)); },
    onPointerUp: (event: PointerEvent) => {
      if (!gesture.current) return;
      const next = calculate(event);
      gesture.current = undefined;
      setPreview(undefined);
      if (Object.keys(next).some((key) => next[key as keyof Rect] !== rect[key as keyof Rect])) commit(next);
    },
    onPointerCancel: () => { gesture.current = undefined; setPreview(undefined); },
    onLostPointerCapture: () => { gesture.current = undefined; setPreview(undefined); },
    onKeyDown: (event: KeyboardEvent) => {
      const keys: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = keys[event.key];
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 10 : 1;
      commit(clampRect(kind === "move"
        ? { ...rect, x: rect.x + delta[0] * step, y: rect.y + delta[1] * step }
        : { ...rect, width: Math.max(minSize.width, rect.width + delta[0] * step), height: Math.max(minSize.height, rect.height + delta[1] * step) }));
    },
  });
  return { rect: preview ?? rect, bind };
}
