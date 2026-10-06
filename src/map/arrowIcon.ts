import type { Map as MapboxMap } from 'mapbox-gl';
import { ARROW_ICON } from './mapboxLayers';

const SIZE = 48;

/** Draws a north-pointing arrow on a canvas — saves us from shipping a sprite. */
export function addArrowIcon(map: MapboxMap) {
  if (map.hasImage(ARROW_ICON)) return;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const c = SIZE / 2;
  ctx.beginPath();
  ctx.moveTo(c, 4);
  ctx.lineTo(c + 11, 22);
  ctx.lineTo(c + 4, 22);
  ctx.lineTo(c + 4, SIZE - 4);
  ctx.lineTo(c - 4, SIZE - 4);
  ctx.lineTo(c - 4, 22);
  ctx.lineTo(c - 11, 22);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  map.addImage(ARROW_ICON, ctx.getImageData(0, 0, SIZE, SIZE), { pixelRatio: 2 });
}
