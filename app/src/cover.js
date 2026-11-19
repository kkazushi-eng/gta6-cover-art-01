// Draws the multi-panel GTA-style cover: the photos cut into panels, a sunset or
// neon colour grade over each one, a sun disc or neon glow, and the bold caption.
// The state this draws from is:
//   { layout, grade, title, subtitle, captionPos, photos: [{ name, img }],
//     panels: [{ photo, zoom, dx, dy }], selected }
// A panel's photo is an index into photos (-1 means empty); zoom scales the photo
// beyond its cover fit, dx/dy shift it as a fraction of the panel size.

const GAP_RATIO = 0.012;
const FRAME_RATIO = 0.008;

/** Panel rectangles for a layout, as fractions of the cover, with gaps between them. */
export function layoutRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * GAP_RATIO);
  const halfW = (w - g) / 2;
  const halfH = (h - g) / 2;
  const thirdW = (w - 2 * g) / 3;
  const heroW = Math.round(w * 0.62);
  switch (layout) {
    case 'hero':
      return [
        { x: 0, y: 0, w: heroW, h },
        { x: heroW + g, y: 0, w: w - heroW - g, h: halfH },
        { x: heroW + g, y: halfH + g, w: w - heroW - g, h: halfH },
      ];
    case 'trio':
      return [
        { x: 0, y: 0, w: thirdW, h },
        { x: thirdW + g, y: 0, w: thirdW, h },
        { x: 2 * (thirdW + g), y: 0, w: thirdW, h },
      ];
    case 'duo':
      return [
        { x: 0, y: 0, w: halfW, h },
        { x: halfW + g, y: 0, w: halfW, h },
      ];
    case 'grid':
    default:
      return [
        { x: 0, y: 0, w: halfW, h: halfH },
        { x: halfW + g, y: 0, w: halfW, h: halfH },
        { x: 0, y: halfH + g, w: halfW, h: halfH },
        { x: halfW + g, y: halfH + g, w: halfW, h: halfH },
      ];
  }
}

/** How many panels a layout holds. */
export function panelCount(layout) {
  return layoutRects(layout, 100, 100).length;
}

const GRADES = {
  sunset: {
    top: 'rgba(255, 150, 70, 0.16)',
    bottom: 'rgba(255, 45, 130, 0.34)',
    caption: ['#ffffff', '#ffe3b0'],
    subtitle: '#ffd9a0',
  },
  neon: {
    top: 'rgba(255, 45, 150, 0.30)',
    bottom: 'rgba(0, 210, 255, 0.26)',
    caption: ['#ffffff', '#ffc4ec'],
    subtitle: '#8ef2ff',
  },
  teal: {
    top: 'rgba(0, 190, 170, 0.20)',
    bottom: 'rgba(20, 40, 90, 0.38)',
    caption: ['#ffffff', '#c9fff2'],
    subtitle: '#a8e8d8',
  },
};

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and shift. */
function drawPanelPhoto(ctx, img, rect, zoom, dx, dy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + dx * rect.w;
  const cy = rect.y + rect.h / 2 + dy * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

/** Fills an empty panel with a grade-coloured placeholder. */
function drawEmptyPanel(ctx, rect, grade) {
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  fill.addColorStop(0, '#3a2340');
  fill.addColorStop(1, '#191024');
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(rect.x + rect.w * 0.06, rect.y + rect.h * 0.06, rect.w * 0.88, rect.h * 0.88);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `${Math.round(rect.h * 0.05)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Lays the grade's tint, glow and sun over one panel. */
function gradePanel(ctx, rect, grade, w, h) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, g.top);
  tint.addColorStop(1, g.bottom);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(10, 5, 25, 0)');
  shade.addColorStop(1, 'rgba(10, 5, 25, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Draws the grade's sky feature across the whole cover: a low sun, or neon bars. */
function drawSky(ctx, grade, w, h) {
  if (grade === 'sunset') {
    const cx = w * 0.5;
    const cy = h * 0.17;
    const r = Math.min(w, h) * 0.095;
    const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    sun.addColorStop(0, 'rgba(255, 225, 140, 0.95)');
    sun.addColorStop(0.55, 'rgba(255, 120, 60, 0.75)');
    sun.addColorStop(1, 'rgba(255, 60, 120, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else if (grade === 'neon') {
    ctx.globalCompositeOperation = 'screen';
    const bar = (y, color, thick) => {
      const glow = ctx.createLinearGradient(0, y - thick, 0, y + thick);
      glow.addColorStop(0, 'rgba(0,0,0,0)');
      glow.addColorStop(0.5, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, y - thick, w, thick * 2);
    };
    bar(h * 0.1, 'rgba(255, 45, 150, 0.55)', Math.max(4, h * 0.006));
    bar(h * 0.14, 'rgba(0, 220, 255, 0.45)', Math.max(3, h * 0.004));
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** Fits the caption to the cover width, shrinking it until it fits. */
function fitTitleFont(ctx, text, w, h) {
  let size = Math.round(h * 0.105);
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  while (ctx.measureText(text).width > w * 0.94 && size > 16) {
    size -= 2;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  }
  return size;
}

/** Draws the title and subtitle over a dark band at the top or the bottom. */
function drawCaption(ctx, state, w, h) {
  const g = GRADES[state.grade] ?? GRADES.sunset;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const bandH = h * (title && subtitle ? 0.26 : 0.2);
  const top = state.captionPos === 'top';
  const band = ctx.createLinearGradient(0, top ? 0 : h - bandH, 0, top ? bandH : h);
  if (top) {
    band.addColorStop(0, 'rgba(8, 4, 18, 0.78)');
    band.addColorStop(1, 'rgba(8, 4, 18, 0)');
  } else {
    band.addColorStop(0, 'rgba(8, 4, 18, 0)');
    band.addColorStop(1, 'rgba(8, 4, 18, 0.78)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, top ? 0 : h - bandH, w, bandH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const size = fitTitleFont(ctx, title, w, h);
    const fill = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.5 + size);
    fill.addColorStop(0, g.caption[0]);
    fill.addColorStop(1, g.caption[1]);
    const y = top ? h * 0.085 : h - h * (subtitle ? 0.115 : 0.085);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = 'rgba(26, 8, 46, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.03;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    ctx.strokeText(title, w / 2, y);
    ctx.fillStyle = fill;
    ctx.fillText(title, w / 2, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (subtitle) {
    const size = Math.round(h * 0.026);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.42)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = g.subtitle;
    const y = top
      ? h * 0.085 + fitTitleFont(ctx, title || ' ', w, h) * 0.62
      : h - h * 0.038;
    ctx.fillText(subtitle, w / 2, title ? y : h / 2);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/** Draws the whole cover onto a canvas of its own size. `markSelected` outlines the selected panel (preview only). */
export function drawCover(canvas, state, markSelected = false) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f7f2ea';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const panel = state.panels[i];
    const photo = panel && panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (photo && photo.img) {
      drawPanelPhoto(ctx, photo.img, rect, panel.zoom || 1, panel.dx || 0, panel.dy || 0);
    } else {
      drawEmptyPanel(ctx, rect, state.grade);
    }
    gradePanel(ctx, rect, state.grade, w, h);
    ctx.restore();
  });

  drawSky(ctx, state.grade, w, h);
  drawCaption(ctx, state, w, h);

  const frame = Math.max(2, Math.round(Math.min(w, h) * FRAME_RATIO));
  ctx.strokeStyle = '#f7f2ea';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);

  if (markSelected && state.selected >= 0 && rects[state.selected]) {
    const r = rects[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
    ctx.setLineDash([Math.max(8, w * 0.015), Math.max(6, w * 0.01)]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}

/** Renders the cover at a chosen export size on a fresh canvas. */
export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, false);
  return canvas;
}
