// Fixed scenes for screenshots: ?shot=editor shows the page with photos loaded;
// ?shot=cover shows the cover alone, edge to edge, at the chosen export size.
// Query knobs: layout, grade, size, title, subtitle, pos, photos (comma-separated
// sample names, cycled across the panels), zoom. window.__shotReady is set once
// the cover has been painted with the display font loaded.
import { panelCount } from './cover.js';

function setRadio(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

export async function runShot(shot, query, state, refresh) {
  const layout = query.get('layout') ?? 'grid';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  const title = query.get('title') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Vice Nights';
  const pos = query.get('pos') ?? 'bottom';
  const zoom = Number(query.get('zoom') ?? '1.15');
  const wanted = (query.get('photos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.title = title;
  state.subtitle = subtitle;
  state.captionPos = pos;
  setRadio('layout', layout);
  setRadio('grade', grade);
  setRadio('size', size);
  document.getElementById('titleInput').value = title;
  document.getElementById('subtitleInput').value = subtitle;
  document.getElementById('captionPos').value = pos;

  state.panels = [];
  for (let i = 0; i < panelCount(layout); i++) {
    const want = wanted[i % wanted.length] ?? state.photos[i % state.photos.length]?.name;
    const index = state.photos.findIndex((photo) => photo.key === want || photo.name === want);
    state.panels.push({ photo: index, zoom, dx: (i % 2 ? -0.06 : 0.06), dy: 0 });
  }
  state.selected = 0;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  refresh();
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.ready;
  } catch { /* the fallback font still draws */ }
  refresh();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
