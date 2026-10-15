// Turns a photo into a comic-book picture on the phone: flat colours + bold black outlines.
// No network, no AI: smooth → reduce to a few colours → draw the edges in black.

const MAX_SIDE = 1200;

export async function comicify(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const r = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // 1. Even out the light: stretch the colours and lift shadows so dark skin keeps its detail.
  levels(px);
  // 2. Kuwahara smoothing: flattens texture into clean areas but keeps the edges of faces and clothes sharp.
  const radius = Math.max(3, Math.round(w / 110));
  const smooth = kuwahara(rgbOf(px), w, h, radius);

  // 3. Cel shading: keep each area's own colour but step its brightness into a few bands,
  //    the way cartoons shade faces and clothes. Bands follow this photo's own light levels.
  const L = new Float32Array(w * h);
  for (let k = 0, j = 0; k < L.length; k++, j += 3) L[k] = 0.299 * smooth[j] + 0.587 * smooth[j + 1] + 0.114 * smooth[j + 2];
  const BANDS = 6;
  const edgesAt = Array.from({ length: BANDS - 1 }, (_, i) => percentile(L, (i + 1) / BANDS));
  const out = new Uint8ClampedArray(px.length);
  for (let k = 0, i = 0, j = 0; k < L.length; k++, i += 4, j += 3) {
    let band = 0;
    while (band < BANDS - 1 && L[k] > edgesAt[band]) band++;
    const lo = band ? edgesAt[band - 1] : 0, hi = band < BANDS - 1 ? edgesAt[band] : 255;
    const target = (lo + hi) / 2 + 6;
    const f = target / Math.max(8, L[k]);
    const avg = L[k];
    for (let c = 0; c < 3; c++) {
      const sat = avg + (smooth[j + c] - avg) * 1.25;
      out[i + c] = sat * f;
    }
    out[i + 3] = 255;
  }

  // 4. Outlines: edges of the smoothed picture, keeping only the strongest, longer lines.
  const lum = new Float32Array(w * h);
  for (let k = 0, j = 0; k < lum.length; k++, j += 3) lum[k] = 0.299 * smooth[j] + 0.587 * smooth[j + 1] + 0.114 * smooth[j + 2];
  const mag = sobel(lum, w, h);
  const cut = percentile(mag, 0.92);
  let edge = new Uint8Array(w * h);
  for (let k = 0; k < edge.length; k++) edge[k] = mag[k] > cut ? 1 : 0;
  edge = dropSmallBits(edge, w, h, Math.round(w * h / 12000));
  const thick = Math.max(1, Math.round(w / 700));
  for (let t = 0; t < thick; t++) edge = dilate(edge, w, h);
  for (let k = 0, i = 0; k < edge.length; k++, i += 4) {
    if (edge[k]) { out[i] = 17; out[i + 1] = 17; out[i + 2] = 20; }
  }

  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return { src: canvas.toDataURL('image/jpeg', 0.92), w, h };
}

function rgbOf(px) {
  const a = new Float32Array((px.length / 4) * 3);
  for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { a[j] = px[i]; a[j + 1] = px[i + 1]; a[j + 2] = px[i + 2]; }
  return a;
}

function sobel(l, w, h) {
  const m = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -l[i - w - 1] - 2 * l[i - 1] - l[i + w - 1] + l[i - w + 1] + 2 * l[i + 1] + l[i + w + 1];
      const gy = -l[i - w - 1] - 2 * l[i - w] - l[i - w + 1] + l[i + w - 1] + 2 * l[i + w] + l[i + w + 1];
      m[i] = Math.hypot(gx, gy);
    }
  }
  return m;
}

function percentile(arr, p) {
  const step = Math.max(1, Math.floor(arr.length / 20000));
  const s = [];
  for (let i = 0; i < arr.length; i += step) s.push(arr[i]);
  s.sort((a, b) => a - b);
  return s[Math.floor(p * (s.length - 1))];
}

function dilate(e, w, h) {
  const o = new Uint8Array(e.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (e[i] || e[i - 1] || e[i + 1] || e[i - w] || e[i + w]) o[i] = 1;
    }
  }
  return o;
}

// Stretch each channel between its 1% and 99% values, then lift the shadows a little.
function levels(px) {
  const lo = [], hi = [];
  for (let c = 0; c < 3; c++) {
    const hist = new Uint32Array(256);
    for (let i = c; i < px.length; i += 4) hist[px[i]]++;
    const n = px.length / 4;
    let acc = 0, l = 0, h = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.01) { l = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.01) { h = v; break; } }
    lo.push(l); hi.push(Math.max(l + 1, h));
  }
  const lut = [0, 1, 2].map((c) => {
    const t = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      const x = Math.min(1, Math.max(0, (v - lo[c]) / (hi[c] - lo[c])));
      t[v] = Math.round(255 * Math.pow(x, 0.78));
    }
    return t;
  });
  for (let i = 0; i < px.length; i += 4) { px[i] = lut[0][px[i]]; px[i + 1] = lut[1][px[i + 1]]; px[i + 2] = lut[2][px[i + 2]]; }
}

// Kuwahara filter using summed-area tables, so it stays fast on phones.
function kuwahara(rgb, w, h, r) {
  const W = w + 1, size = W * (h + 1);
  const sr = new Float64Array(size), sg = new Float64Array(size), sb = new Float64Array(size), sl = new Float64Array(size), sl2 = new Float64Array(size);
  for (let y = 0; y < h; y++) {
    let ar = 0, ag = 0, ab = 0, al = 0, al2 = 0;
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 3;
      const R = rgb[j], G = rgb[j + 1], B = rgb[j + 2], L = 0.299 * R + 0.587 * G + 0.114 * B;
      ar += R; ag += G; ab += B; al += L; al2 += L * L;
      const k = (y + 1) * W + x + 1, up = y * W + x + 1;
      sr[k] = sr[up] + ar; sg[k] = sg[up] + ag; sb[k] = sb[up] + ab; sl[k] = sl[up] + al; sl2[k] = sl2[up] + al2;
    }
  }
  const box = (t, x0, y0, x1, y1) => t[(y1 + 1) * W + x1 + 1] - t[y0 * W + x1 + 1] - t[(y1 + 1) * W + x0] + t[y0 * W + x0];
  const out = new Float32Array(rgb.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = Infinity, br = 0, bg = 0, bb = 0;
      for (let q = 0; q < 4; q++) {
        const x0 = Math.max(0, q & 1 ? x : x - r), x1 = Math.min(w - 1, q & 1 ? x + r : x);
        const y0 = Math.max(0, q & 2 ? y : y - r), y1 = Math.min(h - 1, q & 2 ? y + r : y);
        const n = (x1 - x0 + 1) * (y1 - y0 + 1);
        const m = box(sl, x0, y0, x1, y1) / n;
        const v = box(sl2, x0, y0, x1, y1) / n - m * m;
        if (v < best) { best = v; br = box(sr, x0, y0, x1, y1) / n; bg = box(sg, x0, y0, x1, y1) / n; bb = box(sb, x0, y0, x1, y1) / n; }
      }
      const j = (y * w + x) * 3;
      out[j] = br; out[j + 1] = bg; out[j + 2] = bb;
    }
  }
  return out;
}

// Remove edge pieces smaller than minSize pixels (wall texture, noise).
function dropSmallBits(e, w, h, minSize) {
  const seen = new Uint8Array(e.length), out = new Uint8Array(e.length), stack = [], comp = [];
  for (let s = 0; s < e.length; s++) {
    if (!e[s] || seen[s]) continue;
    stack.push(s); seen[s] = 1; comp.length = 0;
    while (stack.length) {
      const i = stack.pop(); comp.push(i);
      const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (e[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (comp.length >= minSize) for (const i of comp) out[i] = 1;
  }
  return out;
}

// Screen-print look: black ink + halftone dots on the page colour, like a comic printed in one ink.
// Returns a PNG with transparent "paper" so the design's own colour shows through.
export async function inkPrint(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const r = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  levels(px);
  const smooth = kuwahara(rgbOf(px), w, h, Math.max(2, Math.round(w / 260)));
  const L = new Float32Array(w * h);
  for (let k = 0, j = 0; k < L.length; k++, j += 3) L[k] = 0.299 * smooth[j] + 0.587 * smooth[j + 1] + 0.114 * smooth[j + 2];
  // Set the ink levels from the middle of the picture (where the person usually is), so faces keep detail.
  const mid = [];
  for (let y = Math.floor(h * 0.15); y < h * 0.75; y += 2) for (let x = Math.floor(w * 0.25); x < w * 0.75; x += 2) mid.push(L[y * w + x]);
  const dark = percentile(mid, 0.12), light = percentile(mid, 0.8);
  const cell = Math.max(6, Math.round(w / 110));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x, l = L[k];
      let ink = 0;
      if (l <= dark) ink = 1;
      else if (l < light) {
        // halftone: dot radius grows as the tone gets darker; dots on a 45° grid
        const t = 1 - (l - dark) / (light - dark);
        const u = (x + y) / Math.SQRT2, v = (x - y) / Math.SQRT2;
        const cx = (Math.floor(u / cell) + 0.5) * cell, cy = (Math.floor(v / cell) + 0.5) * cell;
        const d = Math.hypot(u - cx, v - cy) / (cell / 2);
        ink = d < Math.sqrt(t) * 0.95 ? 1 : 0;
      }
      out[k * 4 + 3] = ink ? 255 : 0; // ink colour comes from rgb below
      out[k * 4] = 17; out[k * 4 + 1] = 17; out[k * 4 + 2] = 20;
    }
  }
  // outlines
  const mag = sobel(L, w, h);
  const cut = percentile(mag, 0.92);
  let edge = new Uint8Array(w * h);
  for (let k = 0; k < edge.length; k++) edge[k] = mag[k] > cut ? 1 : 0;
  edge = dropSmallBits(edge, w, h, Math.round(w * h / 12000));
  for (let k = 0; k < edge.length; k++) if (edge[k]) out[k * 4 + 3] = 255;
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return { src: canvas.toDataURL('image/png'), w, h };
}
