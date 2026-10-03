import { useState } from "react";
import { useBoardDrag } from "./useBoardDrag";
import type { Rect, ReferenceImage } from "./types";

export function ReferenceImageView({ image, zoom, onTransform, onRemove }: {
  image: ReferenceImage; zoom: number; onTransform: (rect: Rect) => void; onRemove: () => void;
}) {
  const drag = useBoardDrag(image.rect, zoom, onTransform);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <article className="reference-image" style={{ left: drag.rect.x, top: drag.rect.y, width: drag.rect.width, height: drag.rect.height }} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <header className="reference-image__header">
        <div className="card-drag-handle" tabIndex={0} aria-label="移动参考图片，可用方向键" {...drag.bind("move")}>参考图片</div>
        <button type="button" aria-label="删除这张参考图片" onClick={onRemove}>×</button>
      </header>
      <div className="reference-image__media">
        {status !== "failed" && <img key={attempt} src={image.imageUrl} alt={image.title} decoding="async" referrerPolicy="no-referrer" onLoad={() => setStatus("ready")} onError={() => setStatus("failed")} />}
        {status !== "ready" && <div className="image-status" role="status">{status === "failed" ? <>图片暂时无法加载<button type="button" onClick={() => { setStatus("loading"); setAttempt(attempt + 1); }}>重试</button></> : "正在载入图片…"}</div>}
      </div>
      <footer><strong>{image.title}</strong><a href={image.sourceUrl} target="_blank" rel="noreferrer noopener">来源 · {image.sourceDomain} ↗</a></footer>
      <button type="button" className="reference-image__resize" aria-label="调整图片大小，可用方向键" {...drag.bind("resize")} />
    </article>
  );
}
