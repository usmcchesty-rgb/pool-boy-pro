import { useCallback, useEffect, useRef, useState } from 'react';
import {
  absolutePadSampleRegions,
  PAD_DISPLAY_LABELS,
} from '../../strip/scanner/stripGeometry';
import type { StripBoundingBox } from '../../strip/scanner/stripDetector';
import {
  getPreviewSession,
  getCurrentStripBox,
  updateSessionStripBox,
} from '../../strip/scanner/temporaryPreview';
import type { ScanTargetConfig } from '../../strip/scanner/types';

type HandleId = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface DisplayMetrics {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderW: number;
  renderH: number;
}

interface StripCapturePreviewProps {
  stripBox: StripBoundingBox;
  onStripBoxChange: (box: StripBoundingBox) => void;
  showPadRegions: boolean;
  readOnly?: boolean;
  config: ScanTargetConfig;
  frameWidth: number;
  frameHeight: number;
}

function computeDisplayMetrics(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): DisplayMetrics {
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const renderW = imageW * scale;
  const renderH = imageH * scale;
  return {
    scale,
    offsetX: (containerW - renderW) / 2,
    offsetY: (containerH - renderH) / 2,
    renderW,
    renderH,
  };
}

function imageBoxToCss(
  box: StripBoundingBox,
  metrics: DisplayMetrics
): { left: number; top: number; width: number; height: number } {
  return {
    left: metrics.offsetX + box.x * metrics.scale,
    top: metrics.offsetY + box.y * metrics.scale,
    width: box.w * metrics.scale,
    height: box.h * metrics.scale,
  };
}

function displayPointToImage(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  metrics: DisplayMetrics
): { x: number; y: number } {
  const localX = clientX - rect.left - metrics.offsetX;
  const localY = clientY - rect.top - metrics.offsetY;
  return {
    x: localX / metrics.scale,
    y: localY / metrics.scale,
  };
}

const MIN_BOX_PX = 40;

export function StripCapturePreview({
  stripBox,
  onStripBoxChange,
  showPadRegions,
  readOnly = false,
  config,
  frameWidth,
  frameHeight,
}: StripCapturePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    handle: HandleId;
    startX: number;
    startY: number;
    startBox: StripBoundingBox;
  } | null>(null);

  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null);

  const drawFrame = useCallback(() => {
    const session = getPreviewSession();
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!session || !canvas || !container) return;

    const { imageData } = session;
    const cw = container.clientWidth;
    const ch = container.clientHeight || 280;
    const m = computeDisplayMetrics(cw, ch, imageData.width, imageData.height);
    setMetrics(m);

    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cw, ch);

    const offscreen = document.createElement('canvas');
    offscreen.width = imageData.width;
    offscreen.height = imageData.height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, m.offsetX, m.offsetY, m.renderW, m.renderH);
  }, []);

  useEffect(() => {
    drawFrame();
    const ro = new ResizeObserver(() => drawFrame());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [drawFrame]);

  const padRegions = absolutePadSampleRegions(stripBox, config);

  function applyBox(next: StripBoundingBox) {
    updateSessionStripBox(next);
    onStripBoxChange(getCurrentStripBox() ?? next);
  }

  function onPointerDown(handle: HandleId, e: React.PointerEvent) {
    if (readOnly || !metrics || !containerRef.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...stripBox },
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !metrics || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const start = displayPointToImage(drag.startX, drag.startY, rect, metrics);
    const current = displayPointToImage(e.clientX, e.clientY, rect, metrics);
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const b = drag.startBox;

    let x = b.x;
    let y = b.y;
    let w = b.w;
    let h = b.h;

    if (drag.handle === 'move') {
      x = b.x + dx;
      y = b.y + dy;
    } else {
      if (drag.handle.includes('e')) w = b.w + dx;
      if (drag.handle.includes('w')) {
        x = b.x + dx;
        w = b.w - dx;
      }
      if (drag.handle.includes('s')) h = b.h + dy;
      if (drag.handle.includes('n')) {
        y = b.y + dy;
        h = b.h - dy;
      }
    }

    if (w < MIN_BOX_PX) w = MIN_BOX_PX;
    if (h < MIN_BOX_PX) h = MIN_BOX_PX;
    x = Math.max(0, Math.min(x, frameWidth - w));
    y = Math.max(0, Math.min(y, frameHeight - h));

    applyBox({
      ...b,
      x,
      y,
      w,
      h,
      detected: drag.handle === 'move' ? b.detected : true,
      confidence: Math.max(b.confidence, 0.45),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const boxCss = metrics ? imageBoxToCss(stripBox, metrics) : null;

  return (
    <div className="strip-capture-preview" ref={containerRef}>
      <canvas ref={canvasRef} className="strip-capture-preview__canvas" aria-hidden="true" />
      {boxCss && (
        <div
          className={`strip-capture-preview__bbox ${readOnly ? 'strip-capture-preview__bbox--readonly' : ''}`}
          style={{
            left: boxCss.left,
            top: boxCss.top,
            width: boxCss.width,
            height: boxCss.height,
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!readOnly && (
            <div
              className="strip-capture-preview__move"
              onPointerDown={(e) => onPointerDown('move', e)}
              aria-label="Move strip area"
            />
          )}
          {!readOnly &&
            (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map((h) => (
              <span
                key={h}
                className={`strip-capture-preview__handle strip-capture-preview__handle--${h}`}
                onPointerDown={(e) => onPointerDown(h, e)}
                aria-hidden="true"
              />
            ))}
          {showPadRegions &&
            metrics &&
            padRegions.map((roi) => {
              const padCss = {
                left: ((roi.absX - stripBox.x) / stripBox.w) * 100,
                top: ((roi.absY - stripBox.y) / stripBox.h) * 100,
                width: (roi.absW / stripBox.w) * 100,
                height: (roi.absH / stripBox.h) * 100,
              };
              return (
                <span
                  key={roi.padId}
                  className="strip-capture-preview__pad"
                  style={{
                    left: `${padCss.left}%`,
                    top: `${padCss.top}%`,
                    width: `${padCss.width}%`,
                    height: `${padCss.height}%`,
                  }}
                >
                  <span className="strip-capture-preview__pad-label">
                    {PAD_DISPLAY_LABELS[roi.padId] ?? roi.padId}
                  </span>
                </span>
              );
            })}
        </div>
      )}
      <p className="strip-capture-preview__privacy field__hint">
        Temporary preview only — not saved or uploaded.
      </p>
    </div>
  );
}
