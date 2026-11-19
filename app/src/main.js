// Wires the page: photos in, panels cropped and placed, caption typed, PNG out.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutRects, panelCount, renderCover } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { key: 'boulevard', name: 'Boulevard', file: 'samples/boulevard.jpg' },
  { key: 'pier', name: 'Pier', file: 'samples/pier.jpg' },
  { key: 'neon', name: 'Neon street', file: 'samples/neon.jpg' },
  { key: 'palms', name: 'Palm sunset', file: 'samples/palms.jpg' },
];

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const captionPos = document.getElementById('captionPos');
const panelPhoto = document.getElementById('panelPhoto');
const zoomRange = document.getElementById('zoomRange');
const offsetX = document.getElementById('offsetX');
const offsetY = document.getElementById('offsetY');
const panelLabel = document.getElementById('panelLabel');
const status = document.getElementById('status');
const sampleRow = document.getElementById('sampleRow');

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: '1080x1080',
  title: titleInput.value,
  subtitle: subtitleInput.value,
  captionPos: 'bottom',
  photos: [],
  panels: [],
  selected: 0,
};

function freshPanels(layout) {
  const count = panelCount(layout);
  const next = [];
  for (let i = 0; i < count; i++) {
    const old = state.panels[i];
    next.push(old ?? { photo: state.photos.length ? i % state.photos.length : -1, zoom: 1, dx: 0, dy: 0 });
  }
  return next;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the library and returns its index. */
export async function addPhoto(name, url, key = '') {
  const img = await loadImage(url);
  state.photos.push({ name, img, key });
  return state.photos.length - 1;
}

function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // The cover scene hides the editor, so it never shows the selection outline.
  drawCover(canvas, state, !document.body.classList.contains('shot-cover'));
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  panelLabel.textContent = `Panel ${state.selected + 1} of ${state.panels.length} — click a panel in the preview to pick it.`;
  panelPhoto.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = '— empty —';
  panelPhoto.appendChild(empty);
  state.photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = photo.name;
    panelPhoto.appendChild(option);
  });
  if (panel) {
    panelPhoto.value = String(panel.photo);
    zoomRange.value = String(panel.zoom);
    offsetX.value = String(panel.dx);
    offsetY.value = String(panel.dy);
  }
}

function refresh() {
  syncPanelControls();
  redraw();
}

function radioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

document.querySelectorAll('input[name="layout"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.layout = radioValue('layout');
    state.panels = freshPanels(state.layout);
    state.selected = 0;
    refresh();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.grade = radioValue('grade');
    redraw();
  });
});
document.querySelectorAll('input[name="size"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.size = radioValue('size');
    redraw();
  });
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
captionPos.addEventListener('change', () => { state.captionPos = captionPos.value; redraw(); });

panelPhoto.addEventListener('change', () => {
  const panel = state.panels[state.selected];
  if (panel) panel.photo = Number(panelPhoto.value);
  redraw();
});
zoomRange.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (panel) panel.zoom = Number(zoomRange.value);
  redraw();
});
offsetX.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (panel) panel.dx = Number(offsetX.value);
  redraw();
});
offsetY.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (panel) panel.dy = Number(offsetY.value);
  redraw();
});

document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    const index = await addPhoto(file.name, URL.createObjectURL(file));
    const panel = state.panels[state.selected];
    if (panel && panel.photo < 0) panel.photo = index;
  }
  status.textContent = files.length === 1 ? 'Photo added.' : `${files.length} photos added.`;
  refresh();
});

SAMPLES.forEach((sample) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  const img = document.createElement('img');
  img.src = sample.file;
  img.alt = sample.name;
  button.appendChild(img);
  button.addEventListener('click', async () => {
    let index = state.photos.findIndex((photo) => photo.name === sample.name);
    if (index < 0) index = await addPhoto(sample.name, sample.file);
    const panel = state.panels[state.selected];
    if (panel) panel.photo = index;
    button.setAttribute('aria-pressed', 'true');
    refresh();
  });
  sampleRow.appendChild(button);
});

document.getElementById('fillAll').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel || panel.photo < 0) {
    status.textContent = 'Pick a photo for the selected panel first.';
    return;
  }
  state.panels.forEach((p) => { p.photo = panel.photo; });
  status.textContent = 'Every panel now uses that photo — crop each one differently.';
  redraw();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const out = renderCover(state, w, h);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-panels-${w}x${h}.png`;
  }, 'image/png');
});

/** Picks the panel under a point on the preview canvas. */
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = (clientX - box.left) * (canvas.width / box.width);
  const y = (clientY - box.top) * (canvas.height / box.height);
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  state.selected = hit;
  syncPanelControls();
  redraw();
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  dragging = { panel: state.panels[hit], rect: rects[hit], x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const box = canvas.getBoundingClientRect();
  const scaleX = canvas.width / box.width;
  const scaleY = canvas.height / box.height;
  dragging.panel.dx += ((e.clientX - dragging.x) * scaleX) / dragging.rect.w;
  dragging.panel.dy += ((e.clientY - dragging.y) * scaleY) / dragging.rect.h;
  dragging.panel.dx = Math.max(-0.5, Math.min(0.5, dragging.panel.dx));
  dragging.panel.dy = Math.max(-0.5, Math.min(0.5, dragging.panel.dy));
  dragging.x = e.clientX;
  dragging.y = e.clientY;
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(2.5, panel.zoom * (1 - e.deltaY * 0.001)));
  syncPanelControls();
  redraw();
}, { passive: false });

const shot = new URLSearchParams(location.search).get('shot');
async function boot() {
  // Load the samples first so the first paint is already a full cover.
  for (const sample of SAMPLES) {
    await addPhoto(sample.name, sample.file, sample.key);
  }
  state.panels = freshPanels(state.layout);
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, refresh);
  } else {
    refresh();
  }
  try {
    await document.fonts.load('40px Anton');
  } catch { /* the fallback font still draws */ }
  redraw();
}
boot();
