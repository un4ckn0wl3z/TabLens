// TabOCR: finds tab staves in an image, reads fret numbers and barlines.
// Works in the browser (needs canvas for glyph templates).
const TabOCR = (() => {
  const GW = 12, GH = 16;
  const POS = '0123456789xX|';
  const NEG = 'hpbr/\\~()<>eEBGDAsSt^v*.:=+-';
  const FONTS = ['Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Segoe UI', 'Roboto', 'DejaVu Sans', 'Liberation Sans',
    'Times New Roman', 'Georgia', 'DejaVu Serif', 'Courier New', 'Consolas', 'Menlo', 'DejaVu Sans Mono', 'Liberation Mono',
    'monospace', 'sans-serif', 'serif'];
  let TEMPLATES = null;

  // ---------- features ----------
  function featureFromMask(mask, W, x0, y0, w, h) {
    const f = new Float32Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) {
      const ya = y0 + gy * h / GH, yb = y0 + (gy + 1) * h / GH;
      for (let gx = 0; gx < GW; gx++) {
        const xa = x0 + gx * w / GW, xb = x0 + (gx + 1) * w / GW;
        let s = 0, a = 0;
        for (let y = Math.floor(ya); y < Math.ceil(yb); y++) {
          const wy = Math.min(yb, y + 1) - Math.max(ya, y);
          if (wy <= 0) continue;
          for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
            const wx = Math.min(xb, x + 1) - Math.max(xa, x);
            if (wx <= 0) continue;
            s += mask[y * W + x] * wx * wy; a += wx * wy;
          }
        }
        f[gy * GW + gx] = a ? s / a : 0;
      }
    }
    // blur a little for tolerance to stroke weight
    const g = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= GH || xx >= GW) continue;
        const k = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0 ? 2 : 1);
        s += f[yy * GW + xx] * k; n += k;
      }
      g[y * GW + x] = s / n;
    }
    let m = 0; for (const v of g) m += v; m /= g.length;
    let nrm = 0; for (let i = 0; i < g.length; i++) { g[i] -= m; nrm += g[i] * g[i]; }
    nrm = Math.sqrt(nrm) || 1; for (let i = 0; i < g.length; i++) g[i] /= nrm;
    return { f: g, aspect: w / h };
  }

  function buildTemplates() {
    if (TEMPLATES) return TEMPLATES;
    const S = 96, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const out = []; const seen = new Set();
    for (const font of FONTS) for (const weight of ['400', '700']) for (const ch of POS + NEG) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#000'; ctx.font = `${weight} 56px "${font}"`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(ch, S / 2, S / 2);
      const d = ctx.getImageData(0, 0, S, S).data; const m = new Uint8Array(S * S);
      let x0 = S, y0 = S, x1 = -1, y1 = -1;
      for (let i = 0; i < S * S; i++) if (d[i * 4] < 128) { m[i] = 1; const x = i % S, y = (i / S) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) continue;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const ft = featureFromMask(m, S, x0, y0, w, h);
      const key = ch + ft.f.slice(0, 40).map(v => Math.round(v * 20)).join(',');
      if (seen.has(key)) continue; seen.add(key);
      out.push({ ch, f: ft.f, aspect: ft.aspect });
    }
    TEMPLATES = out; return out;
  }

  function classify(feat) {
    const T = buildTemplates();
    let best = { ch: '?', d: 9 }, bestPos = { ch: '?', d: 9 };
    for (const t of T) {
      let c = 0; for (let i = 0; i < t.f.length; i++) c += t.f[i] * feat.f[i];
      const d = (1 - c) + 0.35 * Math.abs(Math.log(feat.aspect / t.aspect));
      if (d < best.d) best = { ch: t.ch, d };
      if (POS.includes(t.ch) && d < bestPos.d) bestPos = { ch: t.ch, d };
    }
    return { best, bestPos };
  }

  // ---------- image helpers ----------
  function toGray(imgData) {
    const { width: W, height: H, data } = imgData; const g = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
    return g;
  }
  function histogram(g) { const h = new Uint32Array(256); for (const v of g) h[v]++; return h; }
  function otsu(hist, lo, hi) {
    let total = 0, sum = 0; for (let i = lo; i <= hi; i++) { total += hist[i]; sum += i * hist[i]; }
    let wB = 0, sB = 0, best = 0, th = (lo + hi) >> 1;
    for (let t = lo; t <= hi; t++) {
      wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
      sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) ** 2;
      if (v > best) { best = v; th = t; }
    }
    return th;
  }

  function drawToCanvas(src, scale, angleDeg) {
    const W = Math.round(src.width * scale), H = Math.round(src.height * scale);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (angleDeg) { ctx.translate(W / 2, H / 2); ctx.rotate(-angleDeg * Math.PI / 180); ctx.translate(-W / 2, -H / 2); }
    ctx.drawImage(src, 0, 0, W, H);
    return cv;
  }

  function prepare(cv, sensitivity) {
    const W = cv.width, H = cv.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    let g = toGray(ctx.getImageData(0, 0, W, H));
    let hist = histogram(g);
    let mode = 0; for (let i = 1; i < 256; i++) if (hist[i] > hist[mode]) mode = i;
    let inverted = false;
    if (mode < 110) { for (let i = 0; i < g.length; i++) g[i] = 255 - g[i]; hist = histogram(g); mode = 255 - mode; inverted = true; }
    // background = brightest dominant level
    let dark = 0; let acc = 0; const total = W * H;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.002) { dark = i; break; } }
    const bg = mode;
    const t = otsu(hist, Math.max(0, dark), Math.min(255, bg));
    const strictT = Math.min(bg - 8, t + (sensitivity || 0));
    const lenientT = Math.max(strictT, bg - Math.max(18, (bg - dark) * 0.18));
    const strict = new Uint8Array(W * H), lenient = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { if (g[i] <= strictT) strict[i] = 1; if (g[i] <= lenientT) lenient[i] = 1; }
    return { W, H, strict, lenient, inverted };
  }

  function estimateSkew(src) {
    const scale = Math.min(1, 800 / Math.max(src.width, src.height));
    let best = 0, bestScore = -1;
    for (let a = -4; a <= 4.001; a += 0.25) {
      const cv = drawToCanvas(src, scale, a);
      const p = prepare(cv, 0);
      let s = 0;
      for (let y = 0; y < p.H; y++) { let c = 0; for (let x = 0; x < p.W; x++) c += p.lenient[y * p.W + x]; s += c * c; }
      if (s > bestScore) { bestScore = s; best = a; }
    }
    return best;
  }

  // ---------- staff lines ----------
  function findLines(p) {
    const { W, H, lenient } = p; const score = new Float32Array(H);
    const minRun = 3;
    for (let y = 0; y < H; y++) {
      let run = 0, s = 0;
      for (let x = 0; x <= W; x++) {
        const v = x < W ? lenient[y * W + x] : 0;
        if (v) run++; else { if (run >= minRun) s += run; run = 0; }
      }
      score[y] = s / W;
    }
    let mx = 0; for (const v of score) if (v > mx) mx = v;
    const th = Math.max(0.12, mx * 0.3);
    const lines = [];
    for (let y = 0; y < H; y++) {
      if (score[y] >= th) {
        let y1 = y; while (y1 + 1 < H && score[y1 + 1] >= th) y1++;
        let wsum = 0, ysum = 0; for (let k = y; k <= y1; k++) { wsum += score[k]; ysum += score[k] * k; }
        lines.push({ y: ysum / wsum, y0: y, y1, t: y1 - y + 1, s: wsum / (y1 - y + 1) });
        y = y1;
      }
    }
    return lines;
  }

  function groupStaves(lines, N) {
    const used = new Set(); const groups = [];
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      let best = null, bestScore = -1;
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        if (used.has(j)) continue;
        const gap = lines[j].y - lines[i].y; if (gap < 5) continue;
        const chain = [i, j]; let last = j;
        for (;;) {
          const target = lines[last].y + gap; let k = -1, kd = 1e9;
          for (let q = last + 1; q < lines.length && lines[q].y <= target + gap * 0.5; q++) { if (used.has(q)) continue; const d = Math.abs(lines[q].y - target); if (d < kd) { kd = d; k = q; } }
          if (k < 0 || kd > Math.max(2, gap * 0.15)) break;
          const lim = 0.6 * Math.min(lines[last].s, lines[k].s);
          let blocked = false; for (let q = last + 1; q < k; q++) if (lines[q].s >= lim && lines[q].t >= Math.min(lines[last].t, lines[k].t)) { blocked = true; break; }
          if (blocked) break;
          chain.push(k); last = k;
        }
        if (chain.length < N) continue;
        { const lim = 0.6 * Math.min(lines[i].s, lines[j].s); let bl = false; for (let q = i + 1; q < j; q++) if (lines[q].s >= lim && lines[q].t >= Math.min(lines[i].t, lines[j].t)) bl = true; if (bl) continue; }
        const sc = chain.length * 10 + chain.reduce((a, q) => a + lines[q].s, 0) / chain.length - gap * 0.001;
        if (sc > bestScore) { bestScore = sc; best = chain; }
      }
      if (!best) continue;
      best.forEach(q => used.add(q));
      const ls = best.map(q => lines[q]);
      if (ls.length % N === 0) for (let k = 0; k < ls.length; k += N) groups.push(ls.slice(k, k + N));
      else groups.push(ls.slice(ls.length - N));
    }
    return groups.map(ls => ({ lines: ls, sp: (ls[ls.length - 1].y - ls[0].y) / (ls.length - 1) }))
      .filter(s => s.lines.every(l => l.t < s.sp * 0.4)).sort((a, b) => a.lines[0].y - b.lines[0].y);
  }
  function staffExtent(p, st) {
    const { W, lenient } = p; const N = st.lines.length; const cov = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let c = 0;
      for (const l of st.lines) { let hit = 0; for (let y = l.y0 - 1; y <= l.y1 + 1; y++) if (lenient[y * W + x]) { hit = 1; break; } c += hit; }
      cov[x] = c;
    }
    const win = Math.max(3, Math.round(st.sp * 0.6)); const sm = new Float32Array(W);
    let s = 0; for (let x = 0; x < W; x++) { s += cov[x]; if (x >= win) s -= cov[x - win]; sm[x] = s / Math.min(win, x + 1); }
    let x0 = -1, x1 = -1;
    for (let x = 0; x < W; x++) if (sm[x] >= N * 0.6) { if (x0 < 0) x0 = x - win; x1 = x; }
    return { x0: Math.max(0, x0), x1: Math.min(W - 1, x1) };
  }

  // ---------- components ----------
  function components(mask, W, H, x0, y0, x1, y1) {
    const lab = new Int32Array((x1 - x0 + 1) * (y1 - y0 + 1)); const cw = x1 - x0 + 1;
    const comps = []; const stack = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const li = (y - y0) * cw + (x - x0);
      if (!mask[y * W + x] || lab[li]) continue;
      const id = comps.length + 1; let bx0 = x, bx1 = x, by0 = y, by1 = y, n = 0;
      lab[li] = id; stack.push(x, y);
      while (stack.length) {
        const yy = stack.pop(), xx = stack.pop(); n++;
        if (xx < bx0) bx0 = xx; if (xx > bx1) bx1 = xx; if (yy < by0) by0 = yy; if (yy > by1) by1 = yy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = xx + dx, ny = yy + dy;
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
          const nl = (ny - y0) * cw + (nx - x0);
          if (mask[ny * W + nx] && !lab[nl]) { lab[nl] = id; stack.push(nx, ny); }
        }
      }
      comps.push({ id, x0: bx0, x1: bx1, y0: by0, y1: by1, n });
    }
    return { comps, lab, ox: x0, oy: y0, cw };
  }

  function compMask(C, c) { // binary mask of component c in its bbox
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = C.lab[(c.y0 + y - C.oy) * C.cw + (c.x0 + x - C.ox)];
      if (c.ids ? c.ids.includes(id) : id === c.id) m[y * w + x] = 1;
    }
    return { m, w, h };
  }

  function tightBox(C, c) {
    const ids = c.ids || [c.id]; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
      if (ids.includes(C.lab[(y - C.oy) * C.cw + (x - C.ox)])) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return n ? { ...c, ids, x0, x1, y0, y1, n } : null;
  }
  function featOf(C, c) { const { m, w, h } = compMask(C, c); return featureFromMask(m, w, 0, 0, w, h); }

  function removeLines(p, st, ext) {
    const { W, strict } = p; const m = strict.slice();
    const maxRun = st.sp * 0.8;
    for (const l of st.lines) {
      const a = l.y0 - 1, b = l.y1 + 1;
      for (let y = a; y <= b; y++) {
        let x = ext.x0;
        while (x <= ext.x1) {
          if (!m[y * W + x]) { x++; continue; }
          let e = x; while (e + 1 <= ext.x1 && strict[y * W + e + 1]) e++;
          const long = (e - x + 1) > maxRun;
          for (let k = x; k <= e; k++) {
            let up = 0, dn = 0;
            for (let q = k - 1; q <= k + 1; q++) { up |= strict[(a - 1) * W + q] | strict[(a - 2) * W + q]; dn |= strict[(b + 1) * W + q] | strict[(b + 2) * W + q]; }
            if (long ? !(up && dn) : !(up || dn)) m[y * W + k] = 0;
            else if (long && up && dn) { /* crossing stroke; keep */ }
          }
          x = e + 1;
        }
      }
    }
    return m;
  }

  // ---------- main ----------
  function readStaff(p, st, opts) {
    const { W, H } = p; const N = st.lines.length; const sp = st.sp;
    const ext = staffExtent(p, st);
    if (ext.x1 - ext.x0 < sp * 3) return null;
    const mask = removeLines(p, st, ext);
    const top = st.lines[0].y, bot = st.lines[N - 1].y;
    const X0 = Math.max(0, Math.round(ext.x0 - sp)), X1 = Math.min(W - 1, Math.round(ext.x1 + sp));
    const Y0 = Math.max(0, Math.round(top - sp * 0.9)), Y1 = Math.min(H - 1, Math.round(bot + sp * 0.9));
    const C = components(mask, W, H, X0, Y0, X1, Y1);
    let comps = C.comps.filter(c => c.n >= 3);
    const hOf = c => c.y1 - c.y0 + 1, wOf = c => c.x1 - c.x0 + 1;

    // merge fragments that belong to one glyph (split by line removal); repeat until stable
    const canMerge = (m, c) => {
      const ov = Math.min(m.x1, c.x1) - Math.max(m.x0, c.x0) + 1;
      const vgap = Math.max(m.y0, c.y0) - Math.min(m.y1, c.y1);
      const uh = Math.max(m.y1, c.y1) - Math.min(m.y0, c.y0);
      if (hOf(m) >= sp * 0.95 || hOf(c) >= sp * 0.95 || uh >= sp * 1.0) return false;
      if (ov > 0.5 * Math.min(wOf(m), wOf(c)) && vgap <= Math.max(3, sp * 0.25)) return true;
      // side by side halves (e.g. an 'x' cut through its centre)
      const hgap = Math.max(m.x0, c.x0) - Math.min(m.x1, c.x1);
      const vov = Math.min(m.y1, c.y1) - Math.max(m.y0, c.y0);
      return hgap <= 1 && vov > 0.6 * Math.min(hOf(m), hOf(c)) && wOf(m) < hOf(m) * 0.6 && wOf(c) < hOf(c) * 0.6 && hOf(m) < sp * 0.55 && hOf(c) < sp * 0.55;
    };
    let changed = true;
    while (changed) {
      changed = false;
      comps.sort((a, b) => a.x0 - b.x0);
      const merged = [];
      for (const c of comps) {
        const target = merged.find(m => canMerge(m, c));
        if (target) { changed = true; target.ids = (target.ids || [target.id]).concat(c.ids || [c.id]); target.x0 = Math.min(target.x0, c.x0); target.x1 = Math.max(target.x1, c.x1); target.y0 = Math.min(target.y0, c.y0); target.y1 = Math.max(target.y1, c.y1); target.n += c.n; }
        else merged.push({ ...c });
      }
      comps = merged;
    }

    if (opts.debugComps) comps.forEach(c => opts.debugComps.push({ x: c.x0, y: c.y0, w: wOf(c), h: hOf(c), n: c.n }));
    // candidate glyphs: size filter
    const glyphs = comps.filter(c => hOf(c) >= sp * 0.3 && hOf(c) <= sp * 1.25 && wOf(c) <= sp * 2.2);
    const hs = glyphs.map(hOf).sort((a, b) => a - b); const medH = hs.length ? hs[hs.length >> 1] : sp * 0.7;

    // barlines
    const vert = comps.filter(c => wOf(c) <= Math.max(3, hOf(c) * 0.3) && hOf(c) >= sp * 0.4);
    vert.sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
    const bars = []; const barComp = new Set();
    for (let i = 0; i < vert.length;) {
      const cx = (vert[i].x0 + vert[i].x1) / 2; const grp = [vert[i]]; let j = i + 1;
      while (j < vert.length && Math.abs((vert[j].x0 + vert[j].x1) / 2 - cx) < sp * 0.35) grp.push(vert[j++]);
      // coverage of [top, bot]
      const iv = grp.filter(c => hOf(c) >= medH * 1.22 || hOf(c) >= sp * (N - 1) * 0.8).map(c => [Math.max(c.y0, top), Math.min(c.y1, bot)]).filter(v => v[1] > v[0]).sort((a, b) => a[0] - b[0]);
      let cov = 0, cur = null; for (const v of iv) { if (!cur || v[0] > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = v.slice(); } else cur[1] = Math.max(cur[1], v[1]); }
      if (cur) cov += cur[1] - cur[0];
      const perString = new Set(grp.filter(c => wOf(c) <= sp * 0.22).map(c => { const cy = (c.y0 + c.y1) / 2; let k = 0, dm = 1e9; st.lines.forEach((l, q) => { const d = Math.abs(l.y - cy); if (d < dm) { dm = d; k = q; } }); return dm < sp * 0.45 ? k : -1; }));
      perString.delete(-1);
      if (cov >= (bot - top) * 0.7 || (perString.size >= N && grp.length <= N + 2)) { bars.push(grp.reduce((s, c) => s + (c.x0 + c.x1) / 2, 0) / grp.length); grp.forEach(c => barComp.add(c)); }
      i = j;
    }
    // merge double barlines
    const barsM = []; for (const b of bars) { if (barsM.length && b - barsM[barsM.length - 1] < sp * 0.8) barsM[barsM.length - 1] = (barsM[barsM.length - 1] + b) / 2; else barsM.push(b); }

    // tall non-barline blobs (digit touching a stem/beam): cut out the part around each string line
    for (const c of comps) {
      if (barComp.has(c) || hOf(c) <= sp * 1.25 || wOf(c) > sp * 2.2) continue;
      for (const l of st.lines) {
        if (l.y < c.y0 - sp * 0.3 || l.y > c.y1 + sp * 0.3) continue;
        const pc = tightBox(C, { ...c, y0: Math.max(c.y0, Math.round(l.y - sp * 0.45)), y1: Math.min(c.y1, Math.round(l.y + sp * 0.45)) });
        if (pc) {
          const thin = Math.max(2, sp * 0.2), maxTrim = Math.round(sp * 0.4);
          const rowSpan = y => { let a = 1e9, b = -1; for (let x = pc.x0; x <= pc.x1; x++) if (pc.ids.includes(C.lab[(y - C.oy) * C.cw + (x - C.ox)])) { if (x < a) a = x; if (x > b) b = x; } return [a, b]; };
          const trim = (dir) => { // remove a stem entering from the crop edge: rows whose ink stays inside the stem's columns
            let y = dir > 0 ? pc.y1 : pc.y0; const [sa, sb] = rowSpan(y); if (sb < 0 || sb - sa + 1 > thin) return;
            let t = 0;
            while (t < maxTrim && pc.y1 > pc.y0) { const [a, b] = rowSpan(y); if (b < 0 || a < sa - 1 || b > sb + 1) break; if (dir > 0) pc.y1--; else pc.y0++; y -= dir; t++; }
          };
          if (c.y1 > pc.y1) trim(1);
          if (c.y0 < pc.y0) trim(-1);
          const pc2 = tightBox(C, pc);
          if (pc2 && hOf(pc2) >= sp * 0.3) glyphs.push(pc2);
        }
      }
    }
    // assign glyphs to strings & classify
    const items = []; const marks = [];
    for (const c of glyphs) {
      if (barComp.has(c)) continue;
      const cy = (c.y0 + c.y1) / 2;
      let si = -1, dmin = 1e9; st.lines.forEach((l, k) => { const d = Math.abs(l.y - cy); if (d < dmin) { dmin = d; si = k; } });
      if (dmin > sp * 0.42) continue;
      if (c.x1 < ext.x0 - sp * 0.2 || c.x0 > ext.x1 + sp * 0.2) continue;
      let parts = [c];
      const res = classify(featOf(C, c));
      let best = res.best, pos = res.bestPos;
      // try splitting wide blobs (touching digits)
      if (wOf(c) > hOf(c) * 0.95 && (best.d > 0.25 || !POS.includes(best.ch))) {
        const sp2 = trySplit(C, c);
        if (sp2) { items.push(...sp2.map(r => ({ ...r, string: si }))); continue; }
      }
      if (opts.debug) opts.debug.push({ x: c.x0, y: c.y0, w: wOf(c), h: hOf(c), s: si, best: best.ch + best.d.toFixed(2), pos: pos.ch + pos.d.toFixed(2) });
      if (!POS.includes(best.ch) && best.d < pos.d - 0.02) { // technique mark / letter
        if ('hpbr/\\()~'.includes(best.ch) && best.d < 0.32) marks.push({ ch: best.ch, x0: c.x0, x1: c.x1, string: si });
        continue;
      }
      if (pos.d > 0.75) continue;
      items.push({ ch: pos.ch === '|' ? '1' : pos.ch.toLowerCase(), d: pos.d, x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, string: si });
    }

    // combine multi-digit numbers on the same string
    items.sort((a, b) => a.string - b.string || a.x0 - b.x0);
    const notes = [];
    const joinable = (a, b) => { const mh = Math.max(a.y1 - a.y0, b.y1 - b.y0) + 1; const cd = (b.x0 + b.x1) / 2 - (a.lx0 + a.x1) / 2;
      return b.x0 - a.x1 < mh * 0.6 && b.x0 - a.x1 > -sp * 0.1 && cd < mh * 1.2; };
    for (const it of items) {
      const last = notes[notes.length - 1];
      if (last && last.string === it.string && it.ch !== 'x' && last.text !== 'x' && last.text.length < 2 && joinable(last, it) && +(last.text + it.ch) <= 36) {
        last.text += it.ch; last.lx0 = it.x0; last.x1 = it.x1; last.y0 = Math.min(last.y0, it.y0); last.y1 = Math.max(last.y1, it.y1); last.d = Math.max(last.d, it.d);
      } else notes.push({ text: it.ch, string: it.string, lx0: it.x0, x0: it.x0, x1: it.x1, y0: it.y0, y1: it.y1, d: it.d });
    }

    // attach technique marks (h p b / \ ( ) ~) written between numbers
    notes.forEach(n => n.fx = {});
    const removed = new Set();
    marks.sort((a, b) => a.x0 - b.x0);
    for (const mk of marks) {
      const same = notes.filter(n => n.string === mk.string && !removed.has(n));
      const L = same.filter(n => n.x1 <= mk.x0 + 2 && mk.x0 - n.x1 < sp * 0.9).sort((a, b) => b.x1 - a.x1)[0];
      const R = same.filter(n => n.x0 >= mk.x1 - 2 && n.x0 - mk.x1 < sp * 0.9).sort((a, b) => a.x0 - b.x0)[0];
      if (mk.ch === 'h' || mk.ch === 'p') { if (L && R) L.fx.hammer = true; }
      else if (mk.ch === '/' || mk.ch === '\\') {
        if (L && R) L.fx.slide = 'legato'; else if (R) R.fx.slide = mk.ch === '/' ? 'inBelow' : 'inAbove'; else if (L) L.fx.slide = mk.ch === '/' ? 'outUp' : 'outDown';
      }
      else if (mk.ch === 'b') {
        if (L) { let amt = 100; if (R && R.x0 - mk.x1 < sp * 0.35 && /^\d+$/.test(L.text) && /^\d+$/.test(R.text) && +R.text > +L.text) { amt = Math.min(200, (+R.text - +L.text) * 50); removed.add(R); L.x1 = R.x1; } L.fx.bend = { type: 'bend', amt }; }
      }
      else if (mk.ch === 'r') { if (L && L.fx.bend && R && R.x0 - mk.x1 < sp * 0.35) { L.fx.bend.type = 'bendRelease'; removed.add(R); L.x1 = R.x1; } }
      else if (mk.ch === '(') { if (R) R.fx.ghost = true; }
      else if (mk.ch === '~') { if (L) L.fx.vib = true; }
    }
    for (let i = notes.length - 1; i >= 0; i--) if (removed.has(notes[i])) notes.splice(i, 1);

    // group into beats (columns)
    notes.sort((a, b) => a.x0 - b.x0);
    const beats = [];
    const margin = sp * 0.12;
    for (const n of notes) {
      const b = beats[beats.length - 1];
      if (b && n.x0 <= b.x1 + margin && !b.notes.some(m => m.string === n.string)) { b.notes.push(n); b.x0 = Math.min(b.x0, n.x0); b.x1 = Math.max(b.x1, n.x1); }
      else beats.push({ x0: n.x0, x1: n.x1, notes: [n] });
    }

    // split into measures by barlines
    const edges = barsM.slice();
    const segs = [];
    const bounds = [ext.x0 - sp].concat(edges, [ext.x1 + sp]).sort((a, b) => a - b);
    for (let i = 0; i < bounds.length - 1; i++) {
      const a = bounds[i], b = bounds[i + 1];
      const bs = beats.filter(bt => { const cx = (bt.x0 + bt.x1) / 2; return cx > a && cx <= b; });
      if (bs.length) segs.push({ x0: a, x1: b, beats: bs });
    }
    return { lines: st.lines, sp, ext, bars: barsM, segs, N };
  }

  function trySplit(C, c) {
    const { m, w, h } = compMask(C, c);
    const proj = new Array(w).fill(0); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) proj[x] += m[y * w + x];
    let bx = -1, bv = 1e9;
    for (let x = Math.floor(w * 0.3); x <= Math.ceil(w * 0.7); x++) if (proj[x] < bv) { bv = proj[x]; bx = x; }
    if (bx <= 0) return null;
    const featPart = (xa, xb) => {
      let ya = h, yb = -1; for (let y = 0; y < h; y++) for (let x = xa; x < xb; x++) if (m[y * w + x]) { if (y < ya) ya = y; if (y > yb) yb = y; }
      if (yb < 0) return null; return { feat: featureFromMask(m, w, xa, ya, xb - xa, yb - ya + 1), ya, yb };
    };
    const L = featPart(0, bx), R = featPart(bx, w); if (!L || !R) return null;
    const rl = classify(L.feat).bestPos, rr = classify(R.feat).bestPos;
    if (rl.d > 0.45 || rr.d > 0.45 || rl.ch.toLowerCase() === 'x' || rr.ch.toLowerCase() === 'x') return null;
    return [
      { ch: rl.ch, d: rl.d, x0: c.x0, x1: c.x0 + bx - 1, y0: c.y0 + L.ya, y1: c.y0 + L.yb },
      { ch: rr.ch, d: rr.d, x0: c.x0 + bx, x1: c.x1, y0: c.y0 + R.ya, y1: c.y0 + R.yb }];
  }

  // src: HTMLImageElement / canvas. opts: {strings:6, sensitivity:0, deskew:true}
  function read(src, opts = {}) {
    const N = opts.strings || 6;
    buildTemplates();
    const angle = opts.deskew === false ? 0 : estimateSkew(src);
    // first pass at native scale to measure line spacing
    let scale = Math.min(1, 2400 / Math.max(src.width, src.height));
    let cv = drawToCanvas(src, scale, angle); let p = prepare(cv, opts.sensitivity);
    let staves = groupStaves(findLines(p), N);
    if (opts.info) opts.info.first = staves.map(st => st.lines.map(l => Math.round(l.y)));
    if (staves.length) {
      const sps = staves.map(s => s.sp).sort((a, b) => a - b); const sp = sps[sps.length >> 1];
      const f = Math.min(4, Math.max(0.5, 30 / sp));
      if (Math.abs(f - 1) > 0.15) {
        scale *= f; cv = drawToCanvas(src, scale, angle); p = prepare(cv, opts.sensitivity);
        staves = groupStaves(findLines(p), N);
      }
    }
    const out = [];
    if (opts.info) { opts.info.lines = findLines(p).map(l => [Math.round(l.y), l.t]); opts.info.staves = staves.length; }
    for (const st of staves) { const r = readStaff(p, st, opts); if (opts.info) (opts.info.read = opts.info.read || []).push(r ? r.segs.length : null); if (r && r.segs.length) out.push(r); }
    return { scale, angle, width: cv.width, height: cv.height, staves: out, inverted: p.inverted, canvas: cv };
  }

  return { read, buildTemplates };
})();
if (typeof module !== 'undefined') module.exports = TabOCR;
