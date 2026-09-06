export const GRID = 1000;
export const WORLD = 1;

export function numberToXY(n: number) {
  const index = n - 1;
  return {
    x: (index % GRID) / GRID,
    y: Math.floor(index / GRID) / GRID,
  };
}

export function worldToScreen(x: number, y: number, cam: Camera, w: number, h: number) {
  const scale = Math.pow(2, cam.zoom) * Math.min(w, h);
  return {
    sx: (x - cam.x) * scale + w / 2,
    sy: (y - cam.y) * scale + h / 2,
    scale,
  };
}

export function screenToWorld(sx: number, sy: number, cam: Camera, w: number, h: number) {
  const scale = Math.pow(2, cam.zoom) * Math.min(w, h);
  return {
    x: cam.x + (sx - w / 2) / scale,
    y: cam.y + (sy - h / 2) / scale,
  };
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function clampCamera(cam: Camera, w = 1, h = 1): Camera {
  const zoom = Math.min(9.5, Math.max(0.4, cam.zoom));
  const scale = Math.pow(2, zoom) * Math.min(w, h);
  const padX = Math.min(0.08, 72 / scale);
  const padY = Math.min(0.12, 132 / scale);
  const halfX = w / (2 * scale);
  const halfY = h / (2 * scale);
  const minX = halfX - padX;
  const maxX = 1 - halfX + padX;
  const minY = halfY - padY;
  const maxY = 1 - halfY + padY;
  return {
    x: maxX < minX ? 0.5 : Math.min(maxX, Math.max(minX, cam.x)),
    y: maxY < minY ? 0.5 : Math.min(maxY, Math.max(minY, cam.y)),
    zoom,
  };
}

export function zoomLevel(zoom: number) {
  if (zoom < 1.4) return 1;
  if (zoom < 2.6) return 2;
  if (zoom < 4.2) return 3;
  return 4;
}
