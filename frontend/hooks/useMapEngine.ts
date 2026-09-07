import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, clampCamera, numberToXY, screenToWorld, worldToScreen, zoomLevel } from '../map/camera';
import { api } from '../services/api';
import type { Spot, ViewportResponse } from '../types';

export function useMapEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cam = useRef<Camera>({ x: 0.5, y: 0.5, zoom: 0.8 });
  const [hover, setHover] = useState<{ spot: Spot; sx: number; sy: number } | null>(null);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [viewport, setViewport] = useState<ViewportResponse>({ mode: 'universe', claimed: 0, available: 1000000 });
  const spotsRef = useRef<Spot[]>([]);
  const claimedRef = useRef<Map<number, Spot>>(new Map());
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const loadViewport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;
    const tl = screenToWorld(0, 0, cam.current, width, height);
    const br = screenToWorld(width, height, cam.current, width, height);
    try {
      const data = await api.viewport({
        minX: Math.min(tl.x, br.x),
        maxX: Math.max(tl.x, br.x),
        minY: Math.min(tl.y, br.y),
        maxY: Math.max(tl.y, br.y),
        zoom: zoomLevel(cam.current.zoom),
      });
      setViewport(data);
      if (data.spots) {
        spotsRef.current = data.spots;
        data.spots.forEach((s) => {
          if (s.status === 'CLAIMED' || s.status === 'PENDING_VERIFICATION') {
            claimedRef.current.set(s.spotNumber, s);
          }
        });
      }
    } catch {
      setViewport({ mode: 'spots', spots: spotsRef.current });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0F1117';
    ctx.fillRect(0, 0, w, h);

    const z = zoomLevel(cam.current.zoom);
    const { scale } = worldToScreen(0, 0, cam.current, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const step = z < 3 ? 0.05 : 0.01;
    for (let i = 0; i <= 1; i += step) {
      const a = worldToScreen(i, 0, cam.current, w, h);
      const b = worldToScreen(i, 1, cam.current, w, h);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
      const c = worldToScreen(0, i, cam.current, w, h);
      const d = worldToScreen(1, i, cam.current, w, h);
      ctx.beginPath();
      ctx.moveTo(c.sx, c.sy);
      ctx.lineTo(d.sx, d.sy);
      ctx.stroke();
    }

    if (z === 1) {
      claimedRef.current.forEach((spot) => {
        const p = worldToScreen(spot.x, spot.y, cam.current, w, h);
        ctx.fillStyle = 'rgba(199,199,199,0.32)';
        ctx.fillRect(p.sx, p.sy, 3, 3);
      });
      ctx.fillStyle = 'rgba(245,245,245,0.55)';
      ctx.font = '600 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1,000,000 SPOTS', w / 2, h / 2);
    } else if (z === 2) {
      (viewport.regions || []).forEach((region) => {
        const p = worldToScreen(region.x, region.y, cam.current, w, h);
        ctx.fillStyle = 'rgba(199,199,199,0.22)';
        ctx.fillRect(p.sx, p.sy, 18, 18);
      });
    } else {
      const cell = Math.max(8, scale / 1000);
      const gap = Math.max(2, cell * 0.12);
      const size = cell - gap;
      const start = screenToWorld(0, 0, cam.current, w, h);
      const end = screenToWorld(w, h, cam.current, w, h);
      const zoom = cam.current.zoom;
      const hoverN = hover?.spot.spotNumber;
      const pulsePhase = (performance.now() % 2000) / 2000;
      const spotType = (s: number) => {
        if (s < 16) return { number: 0, message: 0, author: 0, numberOpacity: 0 };
        if (s < 24) return { number: Math.max(6, s * 0.3), message: 0, author: 0, numberOpacity: 0.4 };
        if (s < 32) return { number: Math.max(7, s * 0.28), message: 0, author: 0, numberOpacity: 0.75 };
        if (s < 48) return { number: Math.max(8, s * 0.24), message: s * 0.16, author: Math.max(5, s * 0.13), numberOpacity: 1 };
        if (s < 64) return { number: Math.max(9, s * 0.2), message: s * 0.18, author: Math.max(6, s * 0.12), numberOpacity: 1 };
        return { number: Math.min(16, s * 0.18), message: s * 0.2, author: Math.min(14, s * 0.12), numberOpacity: 1 };
      };
      const serifFace = '"Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif';
      const wrapLines = (text: string, maxW: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (ctx.measureText(candidate).width > maxW && line) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        if (line) lines.push(line);
        return lines;
      };
      const wrapAndRender = (text: string, fontPx: number, maxW: number, fontDecl: string) => {
        ctx.font = fontDecl;
        const lines = wrapLines(text, maxW);
        return { lines, lineH: fontPx * 1.3 };
      };
      const spotPath = (x: number, y: number, s: number, corner: number) => {
        ctx.beginPath();
        const r = Math.min(corner, s / 2);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, s, s, r);
        } else {
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + s, y, x + s, y + s, r);
          ctx.arcTo(x + s, y + s, x, y + s, r);
          ctx.arcTo(x, y + s, x, y, r);
          ctx.arcTo(x, y, x + s, y, r);
          ctx.closePath();
        }
      };
      for (let gy = Math.floor(start.y * 1000); gy <= Math.ceil(end.y * 1000); gy++) {
        for (let gx = Math.floor(start.x * 1000); gx <= Math.ceil(end.x * 1000); gx++) {
          if (gx < 0 || gy < 0 || gx >= 1000 || gy >= 1000) continue;
          const n = gy * 1000 + gx + 1;
          const owned = claimedRef.current.get(n);
          const p = worldToScreen(gx / 1000, gy / 1000, cam.current, w, h);
          const active = hoverN === n || pulse === n;
          const drawSize = size;
          const ox = p.sx;
          const oy = p.sy;
          const corner = Math.min(14, drawSize / 2);
          const cx = ox + drawSize / 2;
          const cy = oy + drawSize / 2;
          const pad = Math.max(3, drawSize * 0.08);
          const type = spotType(drawSize);
          if (owned) {
            const radial = ctx.createRadialGradient(cx - drawSize * 0.18, cy - drawSize * 0.22, 0, cx, cy, drawSize * 0.92);
            radial.addColorStop(0, '#3A2E16');
            radial.addColorStop(0.42, '#2A2314');
            radial.addColorStop(1, '#16130C');
            ctx.fillStyle = radial;
          } else {
            const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, drawSize * 0.72);
            radial.addColorStop(0, '#323E4F');
            radial.addColorStop(1, '#1F2633');
            ctx.fillStyle = radial;
          }
          if (active) {
            ctx.shadowColor = owned ? 'rgba(212,175,55,0.5)' : 'rgba(199,199,199,0.35)';
            ctx.shadowBlur = owned ? 16 : 12;
          } else if (owned) {
            ctx.shadowColor = `rgba(212,175,55,${0.16 + pulsePhase * 0.1})`;
            ctx.shadowBlur = 8;
          } else {
            ctx.shadowBlur = 0;
          }
          spotPath(ox, oy, drawSize, corner);
          ctx.fill();
          ctx.shadowBlur = 0;
          if (owned) {
            const shine = ctx.createLinearGradient(ox, oy, ox + drawSize, oy + drawSize);
            shine.addColorStop(0, 'rgba(232,213,181,0.16)');
            shine.addColorStop(0.38, 'rgba(212,175,55,0.04)');
            shine.addColorStop(1, 'rgba(0,0,0,0.28)');
            ctx.fillStyle = shine;
            ctx.fill();
          }
          ctx.lineWidth = owned ? 1.6 : 0.5;
          ctx.strokeStyle = owned ? 'rgba(212,175,55,0.72)' : active ? 'rgba(212,175,55,0.3)' : 'rgba(74,90,106,0.7)';
          ctx.stroke();
          if (pulse === n) {
            ctx.strokeStyle = 'rgba(212,175,55,0.85)';
            ctx.lineWidth = 2;
            spotPath(ox - 3, oy - 3, drawSize + 6, Math.min(14, (drawSize + 6) / 2));
            ctx.stroke();
          }
          if (type.number <= 0) continue;
          ctx.save();
          spotPath(ox + 1, oy + 1, drawSize - 2, Math.max(0, corner - 1));
          ctx.clip();
          if (owned) {
            ctx.shadowColor = 'rgba(0,0,0,0.55)';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(244,232,204,${0.96 * type.numberOpacity})`;
            ctx.font = `600 ${type.number}px ${serifFace}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`#${n.toLocaleString()}`, ox + pad, oy + pad);
            if (type.message > 0 && owned.message) {
              const numZoneH = type.number + pad;
              const authZoneH = type.author > 0 ? type.author + pad : 0;
              const msgTop = oy + numZoneH;
              const msgBottom = oy + drawSize - authZoneH;
              const msgCY = (msgTop + msgBottom) / 2;
              const msgAvailH = Math.max(6, msgBottom - msgTop);
              const msgAvailW = drawSize - pad * 2;
              let msgFontPx = Math.min(type.message, Math.max(6, drawSize * 0.45 / Math.sqrt(owned.message.length)));
              ctx.font = `italic ${msgFontPx}px ${serifFace}`;
              let lines = wrapLines(owned.message, msgAvailW);
              let lineH = msgFontPx * 1.3;
              if (lines.length * lineH > msgAvailH) {
                msgFontPx = Math.max(5, msgFontPx * (msgAvailH / (lines.length * lineH)));
                ctx.font = `italic ${msgFontPx}px ${serifFace}`;
                lines = wrapLines(owned.message, msgAvailW);
                lineH = msgFontPx * 1.3;
              }
              lines = lines.slice(0, Math.max(1, Math.floor(msgAvailH / lineH)));
              ctx.shadowColor = 'rgba(0,0,0,0.4)';
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
              ctx.shadowBlur = 2;
              ctx.fillStyle = 'rgba(232,213,181,0.94)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const blockH = lines.length * lineH;
              const startY = msgCY - blockH / 2 + lineH / 2;
              lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
            }
            if (type.author > 0 && owned.name) {
              const authText = `— ${owned.name}`;
              const authAvailW = drawSize - pad * 2;
              ctx.font = `500 ${type.author}px ${serifFace}`;
              const authW = ctx.measureText(authText).width;
              const authFontPx = authW > authAvailW ? Math.max(4, type.author * (authAvailW / authW)) : type.author;
              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(212,175,55,0.88)';
              ctx.font = `500 ${authFontPx}px ${serifFace}`;
              ctx.textAlign = 'right';
              ctx.textBaseline = 'bottom';
              ctx.fillText(authText, ox + drawSize - pad, oy + drawSize - pad);
            }
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(160,168,184,${0.8 * type.numberOpacity})`;
            ctx.font = `700 ${type.number}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${n.toLocaleString()}`, cx, cy);
          }
          ctx.restore();
        }
      }
    }
  }, [pulse, viewport.regions, hover]);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    loadViewport();
  }, [loadViewport]);

  const hitTest = (sx: number, sy: number): Spot | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (zoomLevel(cam.current.zoom) < 3) return null;
    const world = screenToWorld(sx, sy, cam.current, canvas.clientWidth, canvas.clientHeight);
    if (world.x < 0 || world.y < 0 || world.x >= 1 || world.y >= 1) return null;
    const gx = Math.floor(world.x * 1000);
    const gy = Math.floor(world.y * 1000);
    const { scale } = worldToScreen(0, 0, cam.current, canvas.clientWidth, canvas.clientHeight);
    const cell = Math.max(8, scale / 1000);
    const gap = Math.max(2, cell * 0.12);
    const size = cell - gap;
    const origin = worldToScreen(gx / 1000, gy / 1000, cam.current, canvas.clientWidth, canvas.clientHeight);
    if (sx < origin.sx || sy < origin.sy || sx > origin.sx + size || sy > origin.sy + size) {
      return null;
    }
    const n = gy * 1000 + gx + 1;
    return claimedRef.current.get(n) || {
      spotNumber: n,
      x: gx / 1000,
      y: gy / 1000,
      status: 'AVAILABLE',
    };
  };

  const bind = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    if (!canvas) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let moved = 0;
    let pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragging = true;
      moved = 0;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinch) {
          cam.current = clampCamera({ ...cam.current, zoom: cam.current.zoom + (dist - pinch) / 400 }, canvas.clientWidth, canvas.clientHeight);
          loadViewport();
        }
        pinch = dist;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved = 99;
        return;
      }
      if (!dragging) {
        const spot = hitTest(e.clientX, e.clientY);
        setHover(spot && zoomLevel(cam.current.zoom) >= 3 ? { spot, sx: e.clientX, sy: e.clientY } : null);
        return;
      }
      moved = Math.max(moved, Math.hypot(e.clientX - startX, e.clientY - startY));
      const scale = Math.pow(2, cam.current.zoom) * Math.min(canvas.clientWidth, canvas.clientHeight);
      cam.current = clampCamera({
        ...cam.current,
        x: cam.current.x - (e.clientX - lastX) / scale,
        y: cam.current.y - (e.clientY - lastY) / scale,
      }, canvas.clientWidth, canvas.clientHeight);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (dragging && moved < 8) {
        const spot = hitTest(e.clientX, e.clientY);
        if (spot) setSelected(spot);
      }
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.current = clampCamera({ ...cam.current, zoom: cam.current.zoom - e.deltaY * 0.0015 }, canvas.clientWidth, canvas.clientHeight);
      loadViewport();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [loadViewport]);

  const waitFrames = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  };

  const animateCamera = async (to: Camera, durationFrames: number) => {
    const from = { ...cam.current };
    const frames = reduced.current ? 1 : durationFrames;
    for (let i = 1; i <= frames; i++) {
      const t = i / frames;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const canvas = canvasRef.current;
      cam.current = clampCamera({
        x: from.x + (to.x - from.x) * ease,
        y: from.y + (to.y - from.y) * ease,
        zoom: from.zoom + (to.zoom - from.zoom) * ease,
      }, canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  };

  const flyTo = async (spot: Spot) => {
    const target = numberToXY(spot.spotNumber);
    const end = { x: target.x + 0.0005, y: target.y + 0.0005 };
    setPulse(spot.spotNumber);
    const start = { ...cam.current };
    const frames = reduced.current ? 1 : 260;
    const cruiseZoom = Math.max(start.zoom, 4.6);
    for (let i = 1; i <= frames; i++) {
      const t = i / frames;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const zigzag = Math.sin(t * Math.PI * 5) * 0.012 * (1 - t);
      const drift = Math.sin(t * Math.PI * 3 + 1) * 0.008 * (1 - t);
      const canvas = canvasRef.current;
      cam.current = clampCamera({
        x: start.x + (end.x - start.x) * ease + zigzag,
        y: start.y + (end.y - start.y) * ease + drift,
        zoom: cruiseZoom + (8.6 - cruiseZoom) * Math.pow(t, 1.6),
      }, canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    if (spot.status === 'CLAIMED' || spot.status === 'PENDING_VERIFICATION') {
      claimedRef.current.set(spot.spotNumber, spot);
    }
    loadViewport();
  };

  const zoomBy = (delta: number) => {
    const canvas = canvasRef.current;
    cam.current = clampCamera({ ...cam.current, zoom: cam.current.zoom + delta }, canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1);
    loadViewport();
  };

  return { bind, hover, selected, setSelected, flyTo, zoomBy, pulse, setPulse, viewport };
}
