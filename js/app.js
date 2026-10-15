import { TEMPLATES } from './templates.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const scaler = $('scaler');
const PLACEHOLDER = { src: 'img/placeholder.svg', w: 800, h: 1000 };
const OUT_SCALE = 2; // 1080 px design → 2160 px image

const state = {
  tpl: TEMPLATES[0],
  photo: PLACEHOLDER,
  name: '',
  zoom: 1,
  dx: 0,
  dy: 0,
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// ---------- design picker ----------
function renderPicker() {
  const box = $('designs');
  box.innerHTML = '';
  for (const t of TEMPLATES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'design';
    b.setAttribute('aria-pressed', String(t === state.tpl));
    b.innerHTML = `<img src="img/thumb-${t.id}.jpg" alt="">${t.label}`;
    b.onclick = () => {
      state.tpl = t;
      state.zoom = 1; state.dx = 0; state.dy = 0;
      $('zoom').value = 1;
      store.set('design', t.id);
      renderPicker();
      renderFlyer();
    };
    box.appendChild(b);
  }
}

// ---------- flyer ----------
function flyerNode() { return scaler.firstElementChild; }

function renderFlyer() {
  const t = state.tpl;
  scaler.innerHTML = t.html;
  const img = new Image();
  img.alt = '';
  img.draggable = false;
  img.src = state.photo.src;
  flyerNode().querySelector('.ph').appendChild(img);
  setName();
  layoutPhoto();
  fitStage();
}

// Shrink long names until the text fits the width the design allows (data-fit, in design pixels).
const measure = document.createElement('canvas').getContext('2d');
function setName() {
  const el = flyerNode().querySelector('[data-name]');
  el.textContent = state.name.trim() || 'Your Name';
  el.style.fontSize = '';
  const cs = getComputedStyle(el);
  const fit = +el.dataset.fit;
  let size = parseFloat(cs.fontSize);
  const width = () => {
    measure.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    return measure.measureText(el.textContent).width;
  };
  while (width() > fit && size > 16) size -= 1;
  el.style.fontSize = size + 'px';
}

function layoutPhoto() {
  const ph = flyerNode().querySelector('.ph');
  const img = ph.querySelector('img');
  const cw = ph.clientWidth, ch = ph.clientHeight;
  const { w: iw, h: ih } = state.photo;
  const s = Math.max(cw / iw, ch / ih) * state.zoom;
  const w = iw * s, h = ih * s;
  const left0 = (cw - w) / 2, top0 = (ch - h) * state.tpl.photoTop;
  const left = Math.min(0, Math.max(cw - w, left0 + state.dx));
  const top = Math.min(0, Math.max(ch - h, top0 + state.dy));
  state.dx = left - left0; state.dy = top - top0;
  Object.assign(img.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px' });
}

function fitStage() {
  const t = state.tpl;
  const k = stage.clientWidth / t.width;
  scaler.style.transform = `scale(${k})`;
  stage.style.height = t.height * k + 'px';
  return k;
}
window.addEventListener('resize', fitStage);

// ---------- drag + pinch ----------
const pointers = new Map();
let pinchStart = null;

// Only the photo area moves the photo; touching anywhere else scrolls the page as normal.
stage.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.frame, .photo')) return;
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) pinchStart = { d: pinchDist(), zoom: state.zoom };
});
stage.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const k = stage.clientWidth / state.tpl.width;
  if (pointers.size === 1) {
    state.dx += (e.clientX - p.x) / k;
    state.dy += (e.clientY - p.y) / k;
  }
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && pinchStart) {
    state.zoom = Math.min(3, Math.max(1, pinchStart.zoom * pinchDist() / pinchStart.d));
    $('zoom').value = state.zoom;
  }
  layoutPhoto();
});
const endPointer = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = null; };
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);

function pinchDist() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}

$('zoom').addEventListener('input', (e) => { state.zoom = +e.target.value; layoutPhoto(); });
$('reset').addEventListener('click', () => {
  state.zoom = 1; state.dx = 0; state.dy = 0; $('zoom').value = 1; layoutPhoto();
});

// ---------- inputs ----------
$('name').addEventListener('input', (e) => {
  state.name = e.target.value;
  store.set('name', state.name);
  setName();
});

$('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  status('Loading your photo…');
  try {
    state.photo = await shrinkPhoto(file);
    state.zoom = 1; state.dx = 0; state.dy = 0; $('zoom').value = 1;
    $('photo-label').textContent = 'Change photo';
    $('adjust').hidden = false;
    renderFlyer();
    status('');
    if (window.innerWidth < 860) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    status('Could not open that photo. Try another one (JPG or PNG).');
  }
});

// Big phone photos are resized so the page stays fast; 2000 px is still sharper than the flyer needs.
async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 2000;
    const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return { src: c.toDataURL('image/jpeg', 0.92), w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- export ----------
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function makeImage() {
  await document.fonts.ready;
  const node = flyerNode();
  const opts = { pixelRatio: OUT_SCALE, width: state.tpl.width, height: state.tpl.height, cacheBust: false };
  // Safari sometimes leaves images out on the first pass; drawing twice fixes it.
  if (isIOS) await htmlToImage.toCanvas(node, opts);
  const canvas = await htmlToImage.toCanvas(node, opts);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.93));
  const who = (state.name.trim() || 'flyer').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  return new File([blob], `GOSOSA-2016-${who}.jpg`, { type: 'image/jpeg' });
}

async function withBusy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  try { await fn(); } catch (err) {
    console.error(err);
    status('Something went wrong. Please try again.');
  } finally { btn.disabled = false; btn.textContent = old; }
}

function checkReady() {
  if (state.photo === PLACEHOLDER) { status('Add your photo first.'); return false; }
  if (!state.name.trim()) { status('Type your name first.'); $('name').focus(); return false; }
  return true;
}

$('download').addEventListener('click', () => {
  if (!checkReady()) return;
  withBusy($('download'), 'Making your flyer…', async () => {
    const file = await makeImage();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    status('Saved. Check your downloads or gallery.');
  });
});

const canShareFiles = !!(navigator.canShare && navigator.canShare({
  files: [new File([''], 'x.jpg', { type: 'image/jpeg' })],
}));
if (canShareFiles) $('share').hidden = false;

$('share').addEventListener('click', () => {
  if (!checkReady()) return;
  withBusy($('share'), 'Preparing…', async () => {
    const file = await makeImage();
    try {
      await navigator.share({ files: [file], text: 'I will be present! GOSOSA Set 2016 · 20–22 Nov 2026' });
      status('');
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    }
  });
});

function status(msg) { $('status').textContent = msg; }

// ---------- start ----------
state.name = store.get('name') || '';
$('name').value = state.name;
state.tpl = TEMPLATES.find((t) => t.id === store.get('design')) || TEMPLATES[0];
renderPicker();
document.fonts.ready.then(renderFlyer);
renderFlyer();
