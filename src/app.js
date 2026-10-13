(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const WHOLE = 1920;
  const DURS = [1, 2, 4, 8, 16, 32];
  const t = I18N.t;
  const DUR_NAME = new Proxy({}, { get: (o, d) => t('dur.' + d) });
  const TUNINGS = {
    6: [['Standard E', [64, 59, 55, 50, 45, 40]], ['Drop D', [64, 59, 55, 50, 45, 38]], ['Eb Standard', [63, 58, 54, 49, 44, 39]],
      ['D Standard', [62, 57, 53, 48, 43, 38]], ['Drop C', [62, 57, 53, 48, 43, 36]], ['Open G', [62, 59, 55, 50, 43, 38]], ['Open D', [62, 57, 54, 50, 45, 38]], ['DADGAD', [62, 57, 55, 50, 45, 38]]],
    7: [['7-string B', [64, 59, 55, 50, 45, 40, 35]], ['7-string Drop A', [64, 59, 55, 50, 45, 40, 33]]],
    4: [['@tun.bass', [43, 38, 33, 28]], ['@tun.bassDropD', [43, 38, 33, 26]], ['@tun.uke', [69, 64, 60, 67]]],
    5: [['@tun.bass5', [43, 38, 33, 28, 23]]],
  };

  // ---------------- state ----------------
  const S = {
    images: [],          // {name, url, src(img|canvas), result}
    view: 0,             // image index in preview
    measures: [],        // {beats:[{dur,dot,tup,rest,frets:[], low:[], src}]}
    sel: null,           // {a, b} flat indices (a = anchor)
    isSample: false,
  };
  const undoStack = [];
  const N = () => +$('nStrings').value;
  const tuning = () => TUNINGS[N()][+$('tuning').value || 0][1];
  const tsNum = () => Math.max(1, +$('tsNum').value || 4);
  const tsDen = () => +$('tsDen').value || 4;
  const cap = () => tsNum() * WHOLE / tsDen();
  const ticks = b => WHOLE / b.dur * (b.dot ? 1.5 : 1) * (b.tup ? 2 / 3 : 1);
  const newBeat = (dur = 8) => ({ dur, dot: false, tup: false, rest: false, frets: Array(N()).fill(''), fx: Array(N()).fill(null), low: [], src: null });
  const fxOf = (b, s) => { if (!b.fx) b.fx = Array(N()).fill(null); return b.fx[s] || (b.fx[s] = {}); };
  const fxGet = (b, s) => (b.fx && b.fx[s]) || null;
  const flat = () => { const out = []; S.measures.forEach((m, mi) => m.beats.forEach((b, bi) => out.push({ mi, bi, b }))); return out; };

  function pushUndo() { undoStack.push(JSON.stringify(S.measures)); if (undoStack.length > 60) undoStack.shift(); }
  function undo() { if (!undoStack.length) return toast(t('toast.undoEmpty')); S.measures = JSON.parse(undoStack.pop()); clampSel(); render(); save(); }

  // ---------------- UI helpers ----------------
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
  let lastStatus = null;
  function status(msg, err) { lastStatus = [msg, err]; const s = $('status'); s.textContent = typeof msg === 'function' ? msg() : msg; s.classList.toggle('err', !!err); }

  function noteSvg(dur) {
    const filled = dur >= 4, stem = dur >= 2, flags = { 8: 1, 16: 2, 32: 3 }[dur] || 0;
    let s = `<svg viewBox="0 0 22 30" aria-hidden="true"><ellipse cx="8" cy="23" rx="5.2" ry="3.8" transform="rotate(-22 8 23)" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6"/>`;
    if (stem) s += `<path d="M12.6 21.6V3" stroke="currentColor" stroke-width="1.6"/>`;
    for (let i = 0; i < flags; i++) s += `<path d="M12.6 ${3 + i * 5}c1.5 3 6 4.5 5 9.5" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    return s + '</svg>';
  }
  function restSvg(dur) {
    if (dur <= 2) return `<svg viewBox="0 0 22 30" aria-hidden="true"><rect x="5" y="${dur === 1 ? 12 : 15}" width="12" height="4" fill="currentColor"/><path d="M3 ${dur === 1 ? 12 : 19}h16" stroke="currentColor" stroke-width="1.2"/></svg>`;
    if (dur === 4) return `<svg viewBox="0 0 22 30" aria-hidden="true"><path d="M9 4l5 6-4 5 5 6c-3-1.5-6 0-4 4-4-2-3-7 1-6l-5-6 4-5z" fill="currentColor"/></svg>`;
    const flags = { 8: 1, 16: 2, 32: 3 }[dur];
    let s = `<svg viewBox="0 0 22 30" aria-hidden="true"><path d="M15 5L9 26" stroke="currentColor" stroke-width="1.6"/>`;
    for (let i = 0; i < flags; i++) s += `<circle cx="${10 - i * 1.6}" cy="${7 + i * 6}" r="2.2" fill="currentColor"/><path d="M${10 - i * 1.6} ${7 + i * 6}c2 1.5 4 1 ${5 - i * 1.4} -2" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    return s + '</svg>';
  }


  // ---------------- techniques (note effects) ----------------
  const L = k => ({ toString: () => t(k) }); // label resolved at render time
  const BEND_OPTS = [['', L('bend.none')], ['bend:50', L('bend.50')], ['bend:100', L('bend.100')], ['bend:150', L('bend.150')], ['bend:200', L('bend.200')],
    ['bendRelease:50', L('bendR.50')], ['bendRelease:100', L('bendR.100')], ['prebend:50', L('pre.50')], ['prebend:100', L('pre.100')], ['prebendRelease:100', L('preR.100')]];
  const SLIDE_OPTS = [['', L('slide.none')], ['legato', L('slide.legato')], ['shift', L('slide.shift')], ['inBelow', L('slide.inBelow')], ['inAbove', L('slide.inAbove')], ['outUp', L('slide.outUp')], ['outDown', L('slide.outDown')]];
  const HARM_OPTS = [['', L('harm.none')], ['N', 'Natural (NH)'], ['A', 'Artificial (AH)'], ['P', 'Pinch (PH)'], ['T', 'Tapped (TH)'], ['S', 'Semi (SH)']];
  const TOGGLES = [['vib', '~', 'Vibrato', 'V'], ['hammer', 'h/p', L('tg.hammer'), 'H'], ['pm', 'P.M.', 'Palm mute', 'M'], ['lr', 'L.R.', 'Let ring', 'L'],
    ['ghost', '( )', 'Ghost note', 'G'], ['tie', '⌒', L('tg.tie'), ''], ['trem', 'tr', 'Tremolo picking', ''], ['stac', '·', 'Staccato', ''], ['acc', '>', L('tg.acc'), 'A']];
  const FX_NAME = { vib: 'Vibrato', hammer: 'Hammer/Pull', pm: 'Palm mute', lr: 'Let ring', ghost: 'Ghost', tie: 'Tie', trem: 'Tremolo picking', stac: 'Staccato' };
  const fretNum = v => (v === '' || v == null || v === 'x') ? null : +v;
  function nextOnString(fi, s) { const F = flat(); for (let i = fi + 1; i < F.length; i++) { const b = F[i].b; if (!b.rest && b.frets[s] !== '' && b.frets[s] != null) return b.frets[s]; } return null; }
  function bendText(bd) { const a = bd.amt || 100; return a === 100 ? 'full' : a === 50 ? '½' : a === 150 ? '1½' : a === 200 ? '2' : String(a / 100); }
  function markOf(fi, b, s) {
    const o = fxGet(b, s); if (!o) return null;
    const f = fretNum(b.frets[s]); const nx = fretNum(nextOnString(fi, s));
    const sh = [], lg = [];
    if (o.hammer) { const pull = nx != null && f != null && nx < f; sh.push(pull ? 'p' : 'h'); lg.push(pull ? 'Pull-off' : 'Hammer-on'); }
    if (o.slide) {
      const up = nx == null || f == null || nx >= f;
      const m = { legato: up ? '/' : '\\', shift: up ? '/' : '\\', inBelow: '⤴', inAbove: '⤵', outUp: '↗', outDown: '↘' }[o.slide];
      sh.push(m); lg.push((SLIDE_OPTS.find(x => x[0] === o.slide) || [])[1]);
    }
    if (o.bend) { const t = o.bend.type; sh.push((t.startsWith('pre') ? 'pb' : 'b') + (o.bend.amt === 100 ? '' : bendText(o.bend)) + (t.endsWith('Release') ? 'r' : '')); lg.push((BEND_OPTS.find(x => x[0] === t + ':' + o.bend.amt) || [, 'Bend ' + bendText(o.bend)])[1]); }
    if (o.vib) { sh.push('~'); lg.push('Vibrato'); }
    if (o.harm) { sh.push(o.harm + 'H'); lg.push((HARM_OPTS.find(x => x[0] === o.harm) || [])[1]); }
    if (o.pm) { sh.push('PM'); lg.push('Palm mute'); }
    if (o.lr) { sh.push('LR'); lg.push('Let ring'); }
    if (o.trem) { sh.push('tr'); lg.push('Tremolo picking'); }
    if (o.acc) { sh.push(o.acc === 2 ? '^' : '>'); lg.push(o.acc === 2 ? 'Heavy accent' : 'Accent'); }
    if (o.stac) { sh.push('·'); lg.push('Staccato'); }
    if (o.tie) { sh.push('⌒'); lg.push('Tie'); }
    if (o.ghost) { lg.push('Ghost note'); }
    if (!sh.length && !o.ghost) return null;
    const t = sh.join('');
    return { short: t.length > 6 ? t.slice(0, 6) + '…' : t, long: lg.join(' · '), ghost: !!o.ghost };
  }
  function fxTargets() {
    const sel = selected(); if (!sel.length) return [];
    if (S.selStr != null && sel.length === 1) { const b = sel[0].b; return (!b.rest && b.frets[S.selStr] !== '' && b.frets[S.selStr] != null) ? [{ f: sel[0], s: S.selStr }] : []; }
    const out = []; sel.forEach(f => { if (f.b.rest) return; f.b.frets.forEach((fr, s) => { if (fr !== '' && fr != null) out.push({ f, s }); }); }); return out;
  }
  function applyFx(fn) {
    const T = fxTargets(); if (!T.length) { toast(t('toast.pickFretNote')); return; }
    pushUndo(); fn(T);
    T.forEach(({ f, s }) => { const o = f.b.fx && f.b.fx[s]; if (o && !Object.keys(o).length) f.b.fx[s] = null; });
    afterEdit(); refocusCell();
  }
  function toggleFx(key) {
    if (key === 'acc') return applyFx(T => { const cur = (fxGet(T[0].f.b, T[0].s) || {}).acc || 0; const nv = (cur + 1) % 3; T.forEach(t => { const o = fxOf(t.f.b, t.s); if (nv) o.acc = nv; else delete o.acc; }); });
    applyFx(T => {
      const on = !T.every(t => (fxGet(t.f.b, t.s) || {})[key]);
      T.forEach(t => { const o = fxOf(t.f.b, t.s); if (on) o[key] = key === 'trem' ? 32 : true; else delete o[key]; });
    });
  }
  function setFx(key, val) { applyFx(T => T.forEach(t => { const o = fxOf(t.f.b, t.s); if (val == null || val === '') delete o[key]; else o[key] = val; })); }
  function setBend(v) { if (!v) return setFx('bend', null); const [type, amt] = v.split(':'); setFx('bend', { type, amt: +amt }); }
  function cycle(key, opts) {
    const T = fxTargets(); if (!T.length) return toast(t('toast.pickFretShort'));
    const o = fxGet(T[0].f.b, T[0].s) || {};
    const cur = key === 'bend' ? (o.bend ? o.bend.type + ':' + o.bend.amt : '') : (o[key] || '');
    const vals = opts.map(x => x[0]); const nv = vals[(vals.indexOf(cur) + 1) % vals.length];
    key === 'bend' ? setBend(nv) : setFx(key, nv);
  }
  function refocusCell() {
    if (S.selStr == null || !S.sel || S.sel.a !== S.sel.b) return;
    const el = document.querySelector(`.beat[data-i="${S.sel.b}"] .cell[data-s="${S.selStr}"]`); if (el) { el.focus({ preventScroll: true }); const l = el.value.length; el.setSelectionRange(l, l); }
  }
  function buildFxBar() {
    const bar = $('fxBtns');
    const mk = (id, opts, title, fn) => { const sel = document.createElement('select'); sel.id = id; sel.className = 'fxsel'; sel.title = title; opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); sel.onchange = () => fn(sel.value); bar.appendChild(sel); };
    mk('fxBend', BEND_OPTS, 'Bend (B)', setBend);
    mk('fxSlide', SLIDE_OPTS, 'Slide (S)', v => setFx('slide', v));
    mk('fxHarm', HARM_OPTS, 'Harmonic (N)', v => setFx('harm', v));
    TOGGLES.forEach(([k, lbl, title, key]) => { const b = document.createElement('button'); b.className = 'btn fx'; b.dataset.fx = k; b.title = title + (key ? ` (${key})` : ''); b.textContent = lbl; b.onmousedown = e => e.preventDefault(); b.onclick = () => toggleFx(k); bar.appendChild(b); });
    const clr = document.createElement('button'); clr.className = 'btn fx'; clr.dataset.i18n = 'fx.clear'; clr.dataset.i18nTitle = 'fx.clear.title'; clr.textContent = t('fx.clear'); clr.title = t('fx.clear.title'); clr.onmousedown = e => e.preventDefault();
    clr.onclick = () => applyFx(T => T.forEach(t => { t.f.b.fx[t.s] = null; })); bar.appendChild(clr);
  }
  function updateFxBar() {
    const T = fxTargets(); const all = k => T.length && T.every(t => (fxGet(t.f.b, t.s) || {})[k]);
    document.querySelectorAll('.btn.fx[data-fx]').forEach(b => { b.classList.toggle('on', !!all(b.dataset.fx)); if (b.dataset.fx === 'acc') b.textContent = all('acc') && (fxGet(T[0].f.b, T[0].s) || {}).acc === 2 ? '^' : '>'; });
    const one = T.length ? (fxGet(T[0].f.b, T[0].s) || {}) : {};
    const same = k => T.every(t => JSON.stringify((fxGet(t.f.b, t.s) || {})[k] || '') === JSON.stringify(one[k] || ''));
    $('fxBend').value = one.bend && same('bend') ? one.bend.type + ':' + one.bend.amt : '';
    if ($('fxBend').selectedIndex < 0) $('fxBend').value = '';
    $('fxSlide').value = same('slide') ? one.slide || '' : ''; $('fxHarm').value = same('harm') ? one.harm || '' : '';
    $('fxTarget').textContent = !T.length ? t('fx.target.none') : T.length === 1 ? t('fx.target.one', { s: T[0].s + 1, f: T[0].f.b.frets[T[0].s] }) : t('fx.target.many', { n: T.length });
  }

  // ---------------- tuning select ----------------
  function fillTunings() {
    const sel = $('tuning'); const keep = sel.value; sel.innerHTML = '';
    TUNINGS[N()].forEach(([name], i) => { const o = document.createElement('option'); o.value = i; o.textContent = name[0] === '@' ? t(name.slice(1)) : name; sel.appendChild(o); });
    if (keep && +keep < TUNINGS[N()].length) sel.value = keep;
  }

  // ---------------- images ----------------
  function addFiles(files) {
    const list = [...files].filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    S.images = S.images.filter(im => !im.sample); S.isSample = false;
    let pending = list.length;
    list.forEach(f => {
      const url = URL.createObjectURL(f); const img = new Image();
      img.onload = () => { S.images.push({ name: f.name || t('img.pasted'), url, src: img, result: null }); if (--pending === 0) { S.view = S.images.length - 1; renderThumbs(); drawPreview(); $('runOcr').disabled = false; { const n = S.images.length; status(() => t('st.added', { n })); } } };
      img.onerror = () => { --pending; status(() => t('st.openFail', { name: f.name }), true); };
      img.src = url;
    });
  }

  function renderThumbs() {
    const box = $('thumbs'); box.innerHTML = '';
    S.images.forEach((im, i) => {
      const el = document.createElement('div'); el.className = 'thumb'; el.setAttribute('aria-current', i === S.view);
      const r = im.result;
      const info = r ? t('img.info', { st: r.staves.length, m: r.staves.reduce((s, st) => s + st.segs.length, 0) }) : t('img.notRead');
      el.innerHTML = `<img alt=""><div class="meta"><b></b><span>${info}</span></div><button class="icon-btn" title="${t('img.remove')}" aria-label="${t('img.remove')}">✕</button>`;
      el.querySelector('img').src = im.url; el.querySelector('b').textContent = im.sample ? t('img.sample') : im.name;
      el.onclick = e => { if (e.target.closest('button')) return; S.view = i; renderThumbs(); drawPreview(); };
      el.querySelector('button').onclick = () => { S.images.splice(i, 1); S.view = Math.max(0, Math.min(S.view, S.images.length - 1)); $('runOcr').disabled = !S.images.length; renderThumbs(); drawPreview(); };
      box.appendChild(el);
    });
    $('runAi').disabled = !S.images.length;
  }

  // ---------------- preview / overlay ----------------
  const pv = document.createElement('canvas');
  function drawPreview() {
    const box = $('preview'); const im = S.images[S.view];
    if (!im) { box.innerHTML = `<div class="empty">${t('prev.empty')}</div>`; return; }
    if (!box.contains(pv)) { box.innerHTML = ''; box.appendChild(pv); }
    const r = im.result; const src = r ? r.canvas : im.src;
    const W = r ? r.width : im.src.width, H = r ? r.height : im.src.height;
    pv.width = W; pv.height = H; pv.style.width = '100%';
    const ctx = pv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(src, 0, 0, W, H);
    $('prevTitle').textContent = (im.sample ? t('img.sample') : im.name) + (r && r.angle ? ' · ' + t('prev.rotated', { a: r.angle }) : '');
    if (!r || !$('showOverlay').checked) return;
    const lw = Math.max(1.5, W / 900);
    for (const st of r.staves) {
      ctx.strokeStyle = 'rgba(31,111,120,.55)'; ctx.lineWidth = lw;
      for (const l of st.lines) { ctx.beginPath(); ctx.moveTo(st.ext.x0, l.y); ctx.lineTo(st.ext.x1, l.y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(179,54,43,.85)'; ctx.setLineDash([6, 4]);
      for (const b of st.bars) { ctx.beginPath(); ctx.moveTo(b, st.lines[0].y - st.sp * 0.6); ctx.lineTo(b, st.lines[st.lines.length - 1].y + st.sp * 0.6); ctx.stroke(); }
      ctx.setLineDash([]);
      for (const sg of st.segs) for (const bt of sg.beats) for (const n of bt.notes) {
        ctx.strokeStyle = n.d > 0.35 ? '#c58a00' : '#2f7d4a'; ctx.lineWidth = lw;
        ctx.strokeRect(n.x0 - 2, n.y0 - 2, n.x1 - n.x0 + 4, n.y1 - n.y0 + 4);
      }
    }
    // selected beats
    if (S.sel) {
      const F = flat(); const [a, b] = selRange();
      ctx.strokeStyle = '#1f6f78'; ctx.lineWidth = lw * 2;
      for (let i = a; i <= b; i++) { const s = F[i] && F[i].b.src; if (s && s.img === S.view) ctx.strokeRect(s.x0 - 5, s.y0 - 5, s.x1 - s.x0 + 10, s.y1 - s.y0 + 10); }
    }
  }
  pv.addEventListener('click', e => {
    const rect = pv.getBoundingClientRect(); const k = pv.width / rect.width;
    const x = (e.clientX - rect.left) * k, y = (e.clientY - rect.top) * k;
    const F = flat(); let best = -1, bd = 1e9;
    F.forEach((f, i) => { const s = f.b.src; if (!s || s.img !== S.view) return; const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2; const d = Math.abs(cx - x) + (y < s.y0 - 30 || y > s.y1 + 30 ? 1e6 : 0) + Math.abs(cy - y) * 0.2; if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 60) { S.sel = { a: best, b: best }; render(); scrollToCur(); }
  });

  // ---------------- OCR → measures ----------------
  function resultToMeasures(r, imgIdx) {
    const out = []; const n = N();
    for (const st of r.staves) for (const sg of st.segs) {
      const beats = sg.beats.map(bt => {
        const b = newBeat(); let y0 = 1e9, y1 = -1;
        for (const nt of bt.notes) { if (nt.string < n) { b.frets[nt.string] = nt.text; if (nt.fx && Object.keys(nt.fx).length) b.fx[nt.string] = { ...nt.fx }; if (nt.d > 0.35) b.low.push(nt.string); } y0 = Math.min(y0, nt.y0); y1 = Math.max(y1, nt.y1); }
        b.src = { img: imgIdx, x0: bt.x0, x1: bt.x1, y0, y1, segX0: sg.x0, segX1: sg.x1 };
        return b;
      });
      out.push({ beats });
    }
    return out;
  }

  async function runOcr() {
    if (!S.images.length) return;
    $('runOcr').disabled = true;
    const all = []; let notes = 0, low = 0;
    try {
      for (let i = 0; i < S.images.length; i++) {
        status(t('st.reading', { i: i + 1, n: S.images.length }));
        await new Promise(r => setTimeout(r, 30));
        const r = TabOCR.read(S.images[i].src, { strings: N(), sensitivity: +$('sens').value, deskew: $('deskew').checked });
        S.images[i].result = r;
        const ms = resultToMeasures(r, i);
        ms.forEach(m => m.beats.forEach(b => { notes += b.frets.filter(Boolean).length; low += b.low.length; }));
        all.push(...ms);
      }
      pushUndo();
      S.measures = all; S.measures.forEach(fillEven);
      S.sel = all.length ? { a: 0, b: 0 } : null;
      renderThumbs(); drawPreview(); render(); save();
      if (!all.length) { const n = N(); status(() => t('st.noStaff', { n }), true); }
      else status(() => t('st.read', { m: all.length, n: notes }) + (low ? t('st.readLow', { n: low }) : '') + t('st.readTail'));
    } catch (e) { console.error(e); status(() => t('st.ocrFail', { msg: e.message }), true); }
    $('runOcr').disabled = false;
  }

  // ---------------- Claude AI reading (sample capability) ----------------
  let sampleFn = null;
  async function initSample() {
    try {
      if (!window.claude || !claude.use) return;
      const s = await claude.use('sample'); if (!s) return;
      const lim = await s.limits().catch(() => null);
      if (!lim || !lim.images) return;
      sampleFn = s; $('runAi').hidden = false;
    } catch (e) { /* unavailable */ }
  }
  function imageBlob(src) {
    const k = Math.min(1, 2000 / Math.max(src.width, src.height));
    const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, 'image/png'));
  }
  async function runAi() {
    if (!sampleFn || !S.images.length) return;
    const n = N(); $('runAi').disabled = true;
    const all = [];
    try {
      for (let i = 0; i < S.images.length; i++) {
        { const ii = i + 1, nn = S.images.length; status(() => t('st.aiReading', { i: ii, n: nn })); }
        const blob = await imageBlob(S.images[i].src);
        const prompt = `The attached image is a page of ${n}-string guitar/bass tablature (it may be printed tab, a Guitar Pro / Songsterr screenshot, or ASCII text tab).
Transcribe EVERY tab staff on the page, top to bottom, left to right, into JSON.
- String 1 is the TOP line of each tab staff (highest pitch), string ${n} is the bottom line.
- Split measures at barlines. Each beat is one vertical column of simultaneous notes.
- "fret" is the number written on the line as a string ("0".."24"), or "x" for a dead/muted note. Do NOT output bend target numbers (the "9" in "7b9") as separate notes.
- Playing techniques go on the note they start from, as optional fields (omit when absent):
  "bend": {"type":"bend"|"bendRelease"|"prebend"|"prebendRelease","amount":0.5|1|1.5|2}  (amount in whole tones: "full" = 1, "1/2" = 0.5)
  "vibrato": true (wavy line or ~), "hammer": true (h or p / slur to the NEXT note on that string),
  "slide": "legato"|"shift"|"inBelow"|"inAbove"|"outUp"|"outDown" ("legato"/"shift" = slide from this note to the next),
  "palmMute": true (P.M.), "letRing": true, "harmonic": "N"|"A"|"P"|"T"|"S" (natural <12>, A.H., P.H., T.H., S.H.),
  "ghost": true (number in parentheses), "tie": true (tied from previous note), "tremolo": true, "accent": 1 (>) or 2 (^), "staccato": true.
- If rhythm notation (stems/flags/beams/rests under or above the tab) is visible, give "duration" as 1,2,4,8,16 or 32 plus "dotted"/"triplet" flags and include rest beats with "rest": true. If no rhythm is shown, set "duration" to null.
Return ONLY JSON of this shape:
{"measures":[{"beats":[{"notes":[{"string":1,"fret":"3","hammer":true},{"string":3,"fret":"7","bend":{"type":"bend","amount":1},"vibrato":true}],"duration":8,"dotted":false,"triplet":false,"rest":false}]}]}`;
        const data = await sampleFn.json(prompt, { images: [blob], modelTier: 'complex' });
        const ms = (data && data.measures) || [];
        for (const m of ms) {
          const beats = (m.beats || []).map(bt => {
            const b = newBeat(DURS.includes(+bt.duration) ? +bt.duration : 8);
            b.dot = !!bt.dotted; b.tup = !!bt.triplet; b.rest = !!bt.rest;
            (bt.notes || []).forEach(nt => {
              const s = (+nt.string) - 1; if (!(s >= 0 && s < n)) return;
              b.frets[s] = String(nt.fret).toLowerCase().replace(/[^0-9x]/g, '').slice(0, 2);
              const o = {};
              if (nt.bend && typeof nt.bend === 'object') { const ty = ['bend', 'bendRelease', 'prebend', 'prebendRelease'].includes(nt.bend.type) ? nt.bend.type : 'bend'; const am = Math.round((+nt.bend.amount || 1) * 2) * 50; o.bend = { type: ty, amt: Math.min(200, Math.max(50, am)) }; }
              if (nt.vibrato) o.vib = true; if (nt.hammer) o.hammer = true;
              if (['legato', 'shift', 'inBelow', 'inAbove', 'outUp', 'outDown'].includes(nt.slide)) o.slide = nt.slide;
              if (nt.palmMute) o.pm = true; if (nt.letRing) o.lr = true;
              if (['N', 'A', 'P', 'T', 'S'].includes(nt.harmonic)) o.harm = nt.harmonic;
              if (nt.ghost) o.ghost = true; if (nt.tie) o.tie = true; if (nt.tremolo) o.trem = 32; if (nt.staccato) o.stac = true;
              if (nt.accent === 1 || nt.accent === 2) o.acc = nt.accent; else if (nt.accent === true) o.acc = 1;
              if (Object.keys(o).length) b.fx[s] = o;
            });
            if (!b.frets.some(Boolean)) b.rest = true;
            b._noDur = !DURS.includes(+bt.duration);
            return b;
          });
          if (beats.length) { const mm = { beats }; if (beats.every(b => b._noDur)) fillEven(mm); beats.forEach(b => delete b._noDur); all.push(mm); }
        }
      }
      if (!all.length) throw { code: 'empty' };
      pushUndo(); S.measures = all; S.sel = { a: 0, b: 0 }; render(); save();
      status(() => t('st.aiDone', { m: all.length }));
    } catch (e) {
      const m = ['not_granted', 'rate_limited', 'cancelled', 'empty'].includes(e && e.code) ? t('ai.' + e.code) : null;
      status(m || (t('ai.fail') + (e && e.message ? ': ' + e.message : '')), true);
      if (e && e.code === 'not_granted') $('runAi').hidden = true;
    }
    $('runAi').disabled = false;
  }

  // ---------------- ASCII text tab ----------------
  const isD = ch => ch >= '0' && ch <= '9';
  function tokenizeRow(r) {
    const notes = []; let i = 0, pendingIn = null, ghost = -1, harm = -1, last = null, link = null;
    while (i < r.length) {
      const ch = r[i];
      const deadX = (ch === 'x' || ch === 'X') && !/[a-wyz]/i.test(r[i + 1] || '') && !/[a-wyz]/i.test(r[i - 1] || '');
      if (isD(ch) || deadX) {
        let j = i + 1, text = deadX ? 'x' : ch;
        if (!deadX && isD(r[i + 1]) && +(ch + r[i + 1]) <= 36) { text += r[i + 1]; j++; }
        const note = { col: i, scol: i, len: j - i, text, fx: {} };
        if (ghost >= 0) { note.fx.ghost = true; note.scol = ghost; }
        if (harm >= 0) { note.fx.harm = 'N'; note.scol = harm; }
        if (link && last) { if (link === 'h' || link === 'p') last.fx.hammer = true; else if (link === 's') last.fx.slide = 'shift'; else last.fx.slide = 'legato'; }
        else if (pendingIn) { note.fx.slide = pendingIn.t; note.scol = Math.min(note.scol, pendingIn.c); }
        link = null; pendingIn = null; ghost = -1; harm = -1;
        notes.push(note); last = note; i = j;
        while (i < r.length) { // modifiers written right after the number
          const c = r[i];
          if (c === ')' || c === '>' || c === ']') { i++; continue; }
          if ((c === 'b' || (c === 'p' && r[i + 1] === 'b')) && !deadX) {
            const pre = c === 'p'; i += pre ? 2 : 1;
            let k = i; while (k < r.length && isD(r[k]) && k - i < 2) k++;
            const tgt = k > i ? +r.slice(i, k) : null; i = k;
            const f = +note.text; const amt = tgt != null && tgt > f ? Math.min(200, (tgt - f) * 50) : 100;
            let type = pre ? 'prebend' : 'bend';
            if (r[i] === 'r') { i++; while (i < r.length && isD(r[i])) i++; type = pre ? 'prebendRelease' : 'bendRelease'; }
            note.fx.bend = { type, amt }; continue;
          }
          if (c === '~' || (c === 'v' && !/[a-z]/i.test(r[i + 1] || ''))) { note.fx.vib = true; i++; while (r[i] === '~') i++; continue; }
          break;
        }
        continue;
      }
      if (ch === '(') { ghost = i; i++; continue; }
      if (ch === '<') { harm = i; i++; continue; }
      if ((ch === 'h' || ch === 'p' || ch === 's') && last && last.col + last.len + 2 >= i) { link = ch; i++; continue; }
      if (ch === '/' || ch === '\\') {
        const prevAdj = last && /[0-9)>~]/.test(r[i - 1] || ''); const nextAdj = isD(r[i + 1] || '') || r[i + 1] === '(' || r[i + 1] === '<';
        if (prevAdj && nextAdj) link = ch;
        else if (nextAdj) pendingIn = { t: ch === '/' ? 'inBelow' : 'inAbove', c: i };
        else if (prevAdj) last.fx.slide = ch === '/' ? 'outUp' : 'outDown';
        i++; continue;
      }
      if (ch === '|') link = null;
      i++;
    }
    return notes;
  }
  function parseAscii(text) {
    const n = N();
    const raw = text.replace(/\t/g, '    ').split(/\r?\n/);
    const isTab = l => (l.match(/-/g) || []).length >= 3 && /^\s*[A-Ga-g]?[#b]?\s*[|:]?[-0-9xX|:\s\/\\hpbrsStv~^().*=<>\[\]]+$/.test(l);
    const blocks = []; let cur = [], curStart = 0;
    raw.forEach((l, li) => { if (isTab(l)) { if (!cur.length) curStart = li; cur.push(l); } else { if (cur.length) blocks.push({ lines: cur, start: curStart }); cur = []; } });
    if (cur.length) blocks.push({ lines: cur, start: curStart });
    const out = [];
    for (const blk of blocks) for (let k = 0; k + n <= blk.lines.length; k += n) {
      const rows = blk.lines.slice(k, k + n).map(l => l.replace(/^(\s*)([A-Ga-g][#b]?)(?=\s*[|:\-])/, (m, sp, nm) => sp + ' '.repeat(nm.length)));
      // palm mute / let ring annotation line directly above the staff
      const ann = []; const above = raw[blk.start + k - 1];
      if (above && !isTab(above)) {
        const re = /(P\.?\s?M\.?|let\s*ring|L\.?R\.?)[\s\-.|=_]*/gi; let m;
        while ((m = re.exec(above))) ann.push({ a: m.index, b: m.index + m[0].replace(/\s+$/, '').length, k: /^p/i.test(m[1]) ? 'pm' : 'lr' });
      }
      const W = Math.max(...rows.map(l => l.length));
      const bars = [];
      for (let c = 0; c < W; c++) if (rows.filter(r => r[c] === '|').length >= n - 1) bars.push(c);
      const notes = []; rows.forEach((r, s) => tokenizeRow(r).forEach(nt => notes.push({ ...nt, s })));
      notes.sort((a, b) => a.scol - b.scol || a.s - b.s);
      const beats = [];
      for (const nt of notes) {
        const bt = beats[beats.length - 1];
        const reach = bt ? bt.start + Math.max(...bt.notes.map(x => x.col + x.len - x.scol)) - 1 : -1;
        if (bt && nt.scol <= Math.max(bt.start, reach) && !bt.notes.some(x => x.s === nt.s)) bt.notes.push(nt);
        else beats.push({ start: nt.scol, notes: [nt] });
      }
      let meas = []; let bi = 0; const flush = () => { if (meas.length) out.push({ beats: meas }); meas = []; };
      const events = bars.map(c => ({ c, bar: true })).concat(beats.map(bt => ({ c: bt.start, bt }))).sort((a, b) => a.c - b.c || (a.bar ? -1 : 1));
      for (const ev of events) {
        if (ev.bar) { flush(); continue; }
        const b = newBeat();
        ev.bt.notes.forEach(nt => { b.frets[nt.s] = nt.text; if (Object.keys(nt.fx).length) b.fx[nt.s] = { ...nt.fx }; });
        ann.forEach(an => { if (ev.c >= an.a && ev.c <= an.b) b.frets.forEach((fr, s) => { if (fr !== '') fxOf(b, s)[an.k] = true; }); });
        meas.push(b); bi++;
      }
      flush();
    }
    return out;
  }

  // ---------------- rhythm helpers ----------------
  const PLAIN = [];
  DURS.forEach(d => { PLAIN.push({ dur: d, dot: false, t: WHOLE / d }); if (d < 32) PLAIN.push({ dur: d, dot: true, t: WHOLE / d * 1.5 }); });
  PLAIN.sort((a, b) => b.t - a.t);
  function fillEven(m) {
    const k = m.beats.length; if (!k) return;
    const per = cap() / k;
    let pick = PLAIN.find(p => Math.abs(p.t - per) < 1) || PLAIN.find(p => !p.dot && p.t <= per + 1) || PLAIN[PLAIN.length - 1];
    m.beats.forEach(b => { b.dur = pick.dur; b.dot = pick.dot; b.tup = false; });
  }
  function guessSpacing(m) {
    const bs = m.beats; if (!bs.length || bs.some(b => !b.src)) return false;
    const cx = bs.map(b => (b.src.x0 + b.src.x1) / 2);
    const end = bs[0].src.segX1;
    const gaps = cx.map((x, i) => (i < cx.length - 1 ? cx[i + 1] : end) - x).map(g => Math.max(g, 1));
    const total = gaps.reduce((a, b) => a + b, 0);
    let used = 0;
    bs.forEach((b, i) => {
      const want = cap() * gaps[i] / total;
      let best = PLAIN[0], bd = 1e9;
      for (const p of PLAIN) { const d = Math.abs(Math.log(p.t / want)); if (d < bd) { bd = d; best = p; } }
      if (i === bs.length - 1) { const rem = cap() - used; const ex = PLAIN.find(p => Math.abs(p.t - rem) < 1); if (ex) best = ex; }
      b.dur = best.dur; b.dot = best.dot; b.tup = false; used += best.t;
    });
    return true;
  }

  // ---------------- selection ----------------
  function selRange() { if (!S.sel) return [-1, -2]; return [Math.min(S.sel.a, S.sel.b), Math.max(S.sel.a, S.sel.b)]; }
  function selected() { const F = flat(); const [a, b] = selRange(); return F.slice(a, b + 1); }
  function clampSel() { const L = flat().length; if (!L) { S.sel = null; return; } if (!S.sel) S.sel = { a: 0, b: 0 }; S.sel.a = Math.min(Math.max(0, S.sel.a), L - 1); S.sel.b = Math.min(Math.max(0, S.sel.b), L - 1); }
  function selectedMeasures() { return [...new Set(selected().map(f => f.mi))]; }

  // ---------------- edit ops ----------------
  function applyDur(d) { const sel = selected(); if (!sel.length) return toast(t('toast.pickNote')); pushUndo(); sel.forEach(f => f.b.dur = d); afterEdit(); }
  function toggle(key) { const sel = selected(); if (!sel.length) return toast(t('toast.pickNote')); pushUndo(); const v = !sel.every(f => f.b[key]); sel.forEach(f => f.b[key] = v); afterEdit(); }
  function insertBeat() {
    pushUndo();
    if (!S.measures.length) { S.measures.push({ beats: [newBeat(4)] }); S.sel = { a: 0, b: 0 }; return afterEdit(); }
    const F = flat(); const [, b] = selRange(); const f = F[b] || F[F.length - 1];
    const nb = newBeat(f.b.dur); nb.rest = true; S.measures[f.mi].beats.splice(f.bi + 1, 0, nb);
    S.sel = { a: b + 1, b: b + 1 }; afterEdit();
  }
  function deleteBeats() {
    const sel = selected(); if (!sel.length) return; pushUndo();
    const [a] = selRange();
    sel.slice().reverse().forEach(f => S.measures[f.mi].beats.splice(f.bi, 1));
    S.measures = S.measures.filter(m => m.beats.length);
    S.sel = { a, b: a }; clampSel(); afterEdit();
  }
  function splitMeasure() {
    const F = flat(); const [, b] = selRange(); const f = F[b]; if (!f) return;
    const m = S.measures[f.mi]; if (f.bi >= m.beats.length - 1) return toast(t('toast.notLast'));
    pushUndo(); S.measures.splice(f.mi + 1, 0, { beats: m.beats.splice(f.bi + 1) }); afterEdit();
  }
  function mergeMeasure() {
    const F = flat(); const [, b] = selRange(); const f = F[b]; if (!f || f.mi >= S.measures.length - 1) return toast(t('toast.noNext'));
    pushUndo(); S.measures[f.mi].beats.push(...S.measures[f.mi + 1].beats); S.measures.splice(f.mi + 1, 1); afterEdit();
  }
  function rhythmTool(kind) {
    const ms = selectedMeasures(); if (!ms.length) return toast(t('toast.pickMeasure'));
    pushUndo(); let fail = 0;
    ms.forEach(i => { if (kind === 'even') fillEven(S.measures[i]); else if (!guessSpacing(S.measures[i])) fail++; });
    if (fail) toast(t('toast.noSpacing'));
    afterEdit();
  }
  function afterEdit() { clampSel(); render(); save(); }

  // ---------------- render editor ----------------
  function fmtQ(t) { const q = t / (WHOLE / tsDen()); return Math.abs(q - Math.round(q)) < 0.01 ? String(Math.round(q)) : q.toFixed(2).replace(/0+$/, ''); }
  function render() {
    const box = $('measures'); const n = N(); const [sa, sb] = selRange(); let fi = 0;
    const frag = document.createDocumentFragment();
    if (!S.measures.length) {
      box.innerHTML = `<p class="small" style="margin:6px 2px">${t('ed.empty')}</p>`;
      updateSelInfo(); return;
    }
    S.measures.forEach((m, mi) => {
      const sum = m.beats.reduce((s, b) => s + ticks(b), 0);
      const st = Math.abs(sum - cap()) < 1 ? 'ok' : sum < cap() ? 'under' : 'over';
      const el = document.createElement('div'); el.className = 'measure'; el.dataset.mi = mi;
      el.innerHTML = `<header><b>${mi + 1}</b><span class="pill ${st}" title="${t('ed.sumTitle')}">${fmtQ(sum)}/${tsNum()}${st === 'ok' ? ' ✓' : st === 'under' ? t('ed.under') : t('ed.over')}</span><span class="sp"></span></header><div class="mbody"><div class="mgrid"></div></div>`;
      const grid = el.querySelector('.mgrid');
      m.beats.forEach((b, bi) => {
        const idx = fi++;
        const be = document.createElement('div');
        be.className = 'beat' + (idx >= sa && idx <= sb ? ' sel' : '') + (S.sel && idx === S.sel.b ? ' cur' : '') + (b.rest ? ' rest' : '');
        be.dataset.i = idx;
        for (let s = 0; s < n; s++) {
          const cw = document.createElement('div'); cw.className = 'cw';
          const inp = document.createElement('input'); inp.className = 'cell' + (b.low.includes(s) ? ' low' : ''); inp.value = b.frets[s] || ''; inp.placeholder = ' ';
          inp.maxLength = 2; inp.size = 2; inp.dataset.s = s; inp.setAttribute('aria-label', t('ed.cellAria', { m: mi + 1, b: bi + 1, s: s + 1 })); inp.inputMode = 'numeric';
          if (S.selStr === s && idx === (S.sel && S.sel.b) && S.sel.a === S.sel.b) inp.classList.add('focus-note');
          cw.appendChild(inp);
          const mk = !b.rest && b.frets[s] !== '' ? markOf(idx, b, s) : null;
          if (mk) { if (mk.ghost) inp.classList.add('ghost'); if (mk.short) { const sp = document.createElement('span'); sp.className = 'mk'; sp.textContent = mk.short; cw.appendChild(sp); cw.classList.add('has-mk'); } cw.title = mk.long; }
          be.appendChild(cw);
        }
        const d = document.createElement('div'); d.className = 'd'; d.title = (b.rest ? t('ed.rest') : '') + DUR_NAME[b.dur] + (b.dot ? t('ed.dotted') : '') + (b.tup ? t('ed.triplet') : '');
        d.innerHTML = (b.rest ? restSvg(b.dur) : noteSvg(b.dur)) + (b.dot || b.tup ? `<span class="mod">${b.dot ? '•' : ''}${b.tup ? '3' : ''}</span>` : '');
        be.appendChild(d);
        grid.appendChild(be);
      });
      frag.appendChild(el);
    });
    box.innerHTML = ''; box.appendChild(frag);
    updateSelInfo(); drawPreview();
  }
  function updateSelInfo() {
    const sel = selected();
    $('selInfo').textContent = sel.length ? t('sel.info', { n: sel.length, m: (sel[0].mi + 1) + (sel.length > 1 && sel[sel.length - 1].mi !== sel[0].mi ? '–' + (sel[sel.length - 1].mi + 1) : '') }) : t('sel.none');
    const cur = sel.length === 1 ? sel[0].b : null;
    document.querySelectorAll('.dur').forEach(el => el.classList.toggle('on', !!cur && +el.dataset.d === cur.dur));
    updateFxBar();
  }
  function scrollToCur() { const el = document.querySelector('.beat.cur'); if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

  // editor events
  $('measures').addEventListener('mousedown', e => {
    const be = e.target.closest('.beat'); if (!be) return;
    const i = +be.dataset.i;
    if (e.shiftKey && S.sel) { S.sel.b = i; e.preventDefault(); S.selStr = null; } else { S.sel = { a: i, b: i }; S.selStr = e.target.classList.contains('cell') ? +e.target.dataset.s : null; }
    refreshSel();
    const b = flat()[i]; if (b && b.b.src && b.b.src.img !== S.view && S.images[b.b.src.img]) { S.view = b.b.src.img; renderThumbs(); }
    drawPreview();
  });
  function refreshSel() {
    const [a, b] = selRange();
    document.querySelectorAll('.beat').forEach(el => { const i = +el.dataset.i; el.classList.toggle('sel', i >= a && i <= b); el.classList.toggle('cur', S.sel && i === S.sel.b); });
    updateSelInfo();
  }
  let editSnap = null;
  $('measures').addEventListener('focusin', e => {
    if (!e.target.classList.contains('cell')) return;
    editSnap = JSON.stringify(S.measures);
    const i = +e.target.closest('.beat').dataset.i, st = +e.target.dataset.s;
    if (!S.sel || S.sel.a !== i || S.sel.b !== i || S.selStr !== st) { S.sel = { a: i, b: i }; S.selStr = st; refreshSel(); }
  });
  $('measures').addEventListener('input', e => {
    const inp = e.target; if (!inp.classList.contains('cell')) return;
    const v = inp.value.toLowerCase().replace(/[^0-9x]/g, '').replace(/^x.+/, 'x').replace(/^(\d+)x$/, '$1').slice(0, 2);
    if (v !== inp.value) inp.value = v;
    const f = flat()[+inp.closest('.beat').dataset.i]; const s = +inp.dataset.s;
    if (editSnap) { undoStack.push(editSnap); editSnap = null; }
    f.b.frets[s] = v; f.b.low = f.b.low.filter(x => x !== s); inp.classList.remove('low');
    if (!v && f.b.fx && f.b.fx[s]) { f.b.fx[s] = null; const mk = inp.parentElement.querySelector('.mk'); if (mk) mk.remove(); }
    if (v && f.b.rest) { f.b.rest = false; inp.closest('.beat').classList.remove('rest'); }
    save();
  });
  $('measures').addEventListener('keydown', e => {
    const inp = e.target; if (!inp.classList.contains('cell')) return;
    const be = inp.closest('.beat'); const s = +inp.dataset.s; const i = +be.dataset.i;
    const focusCell = (bi, si) => { const t = document.querySelector(`.beat[data-i="${bi}"] .cell[data-s="${si}"]`); if (t) { S.sel = { a: bi, b: bi }; S.selStr = si; t.focus(); t.select(); refreshSel(); drawPreview(); } };
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const fxKey = { h: () => toggleFx('hammer'), p: () => toggleFx('hammer'), b: () => cycle('bend', BEND_OPTS.slice(0, 6)), v: () => toggleFx('vib'), '~': () => toggleFx('vib'),
      s: () => cycle('slide', SLIDE_OPTS), '/': () => setFx('slide', 'legato'), '\\': () => setFx('slide', 'legato'), m: () => toggleFx('pm'), l: () => toggleFx('lr'), g: () => toggleFx('ghost'), '(': () => toggleFx('ghost'),
      n: () => cycle('harm', HARM_OPTS), t: () => toggleFx('trem'), a: () => toggleFx('acc'), '>': () => toggleFx('acc'), '.': () => toggleFx('stac'), '=': () => toggleFx('tie') }[k];
    if (fxKey && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); if (inp.value === '') { toast(t('toast.typeFretFirst')); return; } S.sel = { a: i, b: i }; S.selStr = s; fxKey(); return; }
    if (e.key === 'ArrowUp' && s > 0) { e.preventDefault(); focusCell(i, s - 1); }
    else if (e.key === 'ArrowDown' && s < N() - 1) { e.preventDefault(); focusCell(i, s + 1); }
    else if (e.key === 'ArrowLeft' && inp.selectionStart === 0) { e.preventDefault(); focusCell(i - 1, s); }
    else if (e.key === 'ArrowRight' && inp.selectionEnd === inp.value.length) { e.preventDefault(); focusCell(i + 1, s); }
    else if (e.key === 'Escape' || e.key === 'Enter') { inp.blur(); }
  });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(t.matches('input,textarea,select') && !t.classList.contains('cell'))) { e.preventDefault(); return undo(); }
    if (t.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { '1': 1, '2': 2, '3': 4, '4': 8, '5': 16, '6': 32 };
    if (map[e.key]) { e.preventDefault(); applyDur(map[e.key]); }
    else if (e.key === '.') { e.preventDefault(); toggle('dot'); }
    else if (e.key.toLowerCase() === 't') { e.preventDefault(); toggle('tup'); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); toggle('rest'); }
    else if ({ h: 1, p: 1, b: 1, v: 1, '~': 1, s: 1, m: 1, l: 1, g: 1, n: 1, a: 1 }[e.key.toLowerCase()]) {
      e.preventDefault(); const k = e.key.toLowerCase();
      ({ h: () => toggleFx('hammer'), p: () => toggleFx('hammer'), b: () => cycle('bend', BEND_OPTS.slice(0, 6)), v: () => toggleFx('vib'), '~': () => toggleFx('vib'), s: () => cycle('slide', SLIDE_OPTS), m: () => toggleFx('pm'), l: () => toggleFx('lr'), g: () => toggleFx('ghost'), n: () => cycle('harm', HARM_OPTS), a: () => toggleFx('acc') })[k]();
    }
    else if (e.key.toLowerCase() === 'i' || e.key === 'Insert') { e.preventDefault(); insertBeat(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (S.sel) { e.preventDefault(); deleteBeats(); } }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && S.sel) {
      e.preventDefault(); const L = flat().length; const nb = Math.min(L - 1, Math.max(0, S.sel.b + (e.key === 'ArrowRight' ? 1 : -1)));
      if (e.shiftKey) S.sel.b = nb; else S.sel = { a: nb, b: nb }; S.selStr = null;
      refreshSel(); drawPreview(); scrollToCur();
    }
  });

  // ---------------- playback ----------------
  let actx = null, playing = null; const bufCache = {};
  function pluck(midi, dead) {
    const key = midi + (dead ? 'x' : ''); if (bufCache[key]) return bufCache[key];
    const sr = actx.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12), len = Math.floor(sr * (dead ? 0.08 : 2.6));
    const buf = actx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const P = Math.max(2, Math.round(sr / f)); const ring = new Float32Array(P);
    for (let i = 0; i < P; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0, decay = dead ? 0.9 : 0.997;
    for (let i = 0; i < len; i++) { const nx = (idx + 1) % P; const v = ring[idx]; ring[idx] = decay * 0.5 * (ring[idx] + ring[nx]); d[i] = v * 0.35; idx = nx; }
    return bufCache[key] = buf;
  }
  const NH_INT = { 12: 12, 24: 24, 7: 19, 19: 19, 5: 24, 4: 28, 9: 28, 16: 28, 3: 31, 2: 36 };
  function play() {
    if (playing) return stop();
    const F = flat(); if (!F.length) return toast(t('toast.nothingToPlay'));
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    actx.resume && actx.resume();
    const tun = tuning(); const bpm = Math.max(20, +$('tempo').value || 90); const qsec = 60 / bpm;
    const start = S.sel ? selRange()[0] : 0;
    let t = actx.currentTime + 0.1; const timers = []; const srcs = []; const act = {};
    const release = (s, at) => { const a = act[s]; if (!a) return; a.g.gain.cancelScheduledValues(at); a.g.gain.setTargetAtTime(0, at, 0.03); try { a.src.stop(at + 0.4); if (a.lfo) a.lfo.stop(at + 0.4); } catch (e) { } delete act[s]; };
    const voice = (midi, dead, at, gain, pm) => {
      const src = actx.createBufferSource(); src.buffer = pluck(midi, dead);
      const g = actx.createGain(); g.gain.setValueAtTime(gain, at);
      let node = src;
      if (pm) { const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; node.connect(lp); node = lp; g.gain.setTargetAtTime(0, at + 0.03, 0.07); }
      node.connect(g).connect(actx.destination); src.start(at); srcs.push(src);
      return { src, g };
    };
    for (let i = start; i < F.length; i++) {
      const b = F[i].b; const dur = ticks(b) / 480 * qsec;
      // end notes whose time is up (unless let ring or waiting for a legato target)
      Object.keys(act).forEach(s => { const a = act[s]; if (!a.lr && !a.link && a.endT <= t + 1e-4) release(s, a.endT); });
      if (b.rest) { Object.keys(act).forEach(s => { if (!act[s].lr) release(s, t); }); }
      else b.frets.forEach((fr, s) => {
        if (fr === '' || fr == null) return;
        const o = fxGet(b, s) || {}; const prev = act[s];
        const dead = fr === 'x'; const fret = dead ? 0 : +fr;
        let midi = tun[s] + fret;
        if (o.harm === 'N') midi = tun[s] + (NH_INT[fret] || 12); else if (o.harm === 'A' || o.harm === 'S') midi += 12; else if (o.harm === 'P') midi += 19; else if (o.harm === 'T') midi += 12;
        if (o.tie && prev) { prev.endT = t + dur; prev.lr = !!o.lr || prev.lr; prev.link = null; return; }
        if (prev && prev.link === 'legato') {
          const ratio = Math.pow(2, (midi - prev.base) / 12), t0 = Math.max(prev.t0, t - Math.min(0.12, (t - prev.t0) * 0.5));
          prev.src.playbackRate.setValueAtTime(prev.rate, t0); prev.src.playbackRate.linearRampToValueAtTime(ratio, t);
          prev.rate = ratio; prev.endT = t + dur; prev.link = o.hammer ? 'hammer' : (o.slide === 'legato' || o.slide === 'shift') ? 'legato' : null; prev.lr = !!o.lr; return;
        }
        let gain = o.ghost ? 0.35 : o.acc === 2 ? 1.6 : o.acc ? 1.3 : 1;
        if (prev && prev.link === 'hammer') gain *= 0.6;
        if (prev && prev.link === 'shift') { const ratio = Math.pow(2, (midi - prev.base) / 12); const t0 = Math.max(prev.t0, t - 0.1); prev.src.playbackRate.setValueAtTime(prev.rate, t0); prev.src.playbackRate.linearRampToValueAtTime(ratio, t); }
        release(s, t);
        if (o.trem && !dead) { // tremolo picking: re-pick every 32nd
          const step = WHOLE / (o.trem || 32) / 480 * qsec;
          for (let k = 0; t + k * step < t + dur - 1e-3; k++) { const v = voice(midi, false, t + k * step, gain * 0.8, o.pm); v.g.gain.setTargetAtTime(0, t + (k + 1) * step, 0.02); }
          return;
        }
        const v = voice(midi, dead, t, gain, o.pm);
        const a = { ...v, base: midi, rate: 1, t0: t, endT: t + dur * (o.stac ? 0.5 : 1), lr: !!o.lr, link: o.hammer ? 'hammer' : (o.slide === 'legato' ? 'legato' : o.slide === 'shift' ? 'shift' : null) };
        const pr = v.src.playbackRate, dt = v.src.detune;
        if (o.slide === 'inBelow' || o.slide === 'inAbove') { pr.setValueAtTime(Math.pow(2, (o.slide === 'inBelow' ? -3 : 3) / 12), t); pr.linearRampToValueAtTime(1, t + Math.min(0.12, dur * 0.4)); }
        if (o.slide === 'outUp' || o.slide === 'outDown') { pr.setValueAtTime(1, t + dur * 0.55); pr.linearRampToValueAtTime(Math.pow(2, (o.slide === 'outUp' ? 5 : -5) / 12), t + dur); a.endT = t + dur; }
        if (o.bend) {
          const c = (o.bend.amt || 100) * 2; // 100 = full step = 200 cents
          const T = o.bend.type;
          if (T === 'bend') { dt.setValueAtTime(0, t); dt.linearRampToValueAtTime(c, t + dur * 0.3); }
          else if (T === 'bendRelease') { dt.setValueAtTime(0, t); dt.linearRampToValueAtTime(c, t + dur * 0.25); dt.setValueAtTime(c, t + dur * 0.5); dt.linearRampToValueAtTime(0, t + dur * 0.75); }
          else if (T === 'prebend') dt.setValueAtTime(c, t);
          else if (T === 'prebendRelease') { dt.setValueAtTime(c, t); dt.setValueAtTime(c, t + dur * 0.2); dt.linearRampToValueAtTime(0, t + dur * 0.55); }
        }
        if (o.vib) { const lfo = actx.createOscillator(); lfo.frequency.value = 5.5; const lg = actx.createGain(); lg.gain.value = 35; lfo.connect(lg).connect(dt); lfo.start(t + Math.min(0.15, dur * 0.2)); a.lfo = lfo; srcs.push(lfo); }
        act[s] = a;
      });
      const delay = (t - actx.currentTime) * 1000;
      timers.push(setTimeout(() => { document.querySelectorAll('.beat.playing').forEach(x => x.classList.remove('playing')); const el = document.querySelector(`.beat[data-i="${i}"]`); if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }, delay));
      t += dur;
    }
    Object.keys(act).forEach(s => release(s, act[s].lr ? t + 1.2 : Math.min(t, act[s].endT)));
    timers.push(setTimeout(stop, (t - actx.currentTime) * 1000 + 600));
    playing = { timers, srcs }; $('play').textContent = t('btn.stop'); $('play').dataset.i18n = 'btn.stop';
  }
  function stop() {
    if (!playing) return; playing.timers.forEach(clearTimeout); playing.srcs.forEach(s => { try { s.stop(); } catch (e) { } });
    playing = null; $('play').textContent = t('btn.play'); $('play').dataset.i18n = 'btn.play'; document.querySelectorAll('.beat.playing').forEach(x => x.classList.remove('playing'));
  }

  // ---------------- export ----------------
  function buildSong() {
    const tun = tuning();
    const measures = S.measures.map(m => ({
      num: tsNum(), den: tsDen(),
      beats: m.beats.map(b => {
        const notes = [];
        b.frets.forEach((fr, s) => {
          if (fr === '' || fr == null) return;
          const o = fxGet(b, s) || {};
          const n = fr === 'x' ? { string: s + 1, fret: 0, type: 'dead' } : { string: s + 1, fret: Math.min(99, +fr), type: o.tie ? 'tie' : 'normal' };
          const fx = {};
          ['vib', 'hammer', 'slide', 'lr', 'pm', 'stac', 'harm', 'ghost', 'trem', 'acc'].forEach(k => { if (o[k]) fx[k] = o[k]; });
          if (o.bend) fx.bend = { type: o.bend.type, amt: o.bend.amt || 100 };
          if (o.harm === 'T') fx.tapFret = Math.min(99, n.fret + 12);
          if (Object.keys(fx).length) n.fx = fx;
          notes.push(n);
        });
        return { dur: b.dur, dotted: b.dot, tuplet: b.tup ? 3 : 0, rest: b.rest || !notes.length, notes: b.rest ? [] : notes };
      }),
    }));
    if (!measures.length) measures.push({ num: tsNum(), den: tsDen(), beats: [] });
    const isBass = N() <= 5 && tun[tun.length - 1] < 35;
    return {
      title: $('title').value.trim(), artist: $('artist').value.trim(), tempo: Math.max(20, Math.min(400, +$('tempo').value || 90)),
      tracks: [{ name: isBass ? 'Bass' : 'Guitar', tuning: tun, instrument: isBass ? 33 : 25, measures }],
    };
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipOne(name, data) {
    const nm = new TextEncoder().encode(name), crc = crc32(data), sz = data.length;
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true);
    const cdOff = 30 + nm.length + sz, cdLen = 46 + nm.length;
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true); end.setUint32(12, cdLen, true); end.setUint32(16, cdOff, true);
    const parts = [new Uint8Array(lh.buffer), nm, data, new Uint8Array(ch.buffer), nm, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
  }
  function baseName() { const t = $('title').value.trim().normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_'); return t || 'tablens_tab'; }
  let downloads = null;
  async function download() {
    const bad = S.measures.filter(m => Math.abs(m.beats.reduce((s, b) => s + ticks(b), 0) - cap()) >= 1).length;
    const data = GP5.write(buildSong());
    const name = baseName();
    if (downloads) {
      try {
        await downloads.save({ filename: name + '.zip', data: zipOne(name + '.gp5', data) });
        toast(t('toast.saved', { name }));
      } catch (e) {
        if (e && e.code === 'declined') toast(t('toast.declined'));
        else if (e && e.code === 'rate_limited') toast(t('toast.saveBusy'));
        else toast(t('toast.saveFail'));
      }
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' })); a.download = name + '.gp5';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    if (bad) setTimeout(() => toast(t('toast.badMeasures', { n: bad })), 2800);
  }
  function asciiTab() {
    const n = N(); const names = tuning().map(m => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12]);
    names[0] = n >= 6 && names[0] === 'E' ? 'e' : names[0];
    const w = Math.max(...names.map(x => x.length));
    const F = flat(); let fi = 0;
    const token = (b, s, idx) => {
      const fr = b.frets[s]; if (b.rest || fr === '' || fr == null) return '';
      const o = fxGet(b, s) || {}; let t = fr === 'x' ? 'x' : String(fr);
      const f = fretNum(fr), nx = fretNum(nextOnString(idx, s));
      if (o.harm === 'N') t = '<' + t + '>';
      if (o.ghost) t = '(' + t + ')';
      if (o.slide === 'inBelow') t = '/' + t; if (o.slide === 'inAbove') t = '\\' + t;
      if (o.bend && f != null) { const tg = f + Math.round((o.bend.amt || 100) / 50); t += (o.bend.type.startsWith('pre') ? 'pb' : 'b') + tg + (o.bend.type.endsWith('Release') ? 'r' + f : ''); }
      if (o.vib) t += '~';
      if (o.slide === 'outUp') t += '/'; if (o.slide === 'outDown') t += '\\';
      if (o.hammer) t += (nx != null && f != null && nx < f) ? 'p' : 'h';
      else if (o.slide === 'legato' || o.slide === 'shift') t += (nx != null && f != null && nx < f) ? '\\' : '/';
      return t;
    };
    const annot = b => { const set = []; b.frets.forEach((fr, s) => { const o = fxGet(b, s); if (!o || b.rest || fr === '') return; if (o.pm) set.push('PM'); if (o.lr) set.push('LR'); if (o.harm && o.harm !== 'N') set.push(o.harm + 'H'); if (o.trem) set.push('tr'); if (o.acc) set.push(o.acc === 2 ? '^' : '>'); if (o.stac) set.push('.'); if (o.tie) set.push('tie'); }); return [...new Set(set)].join(','); };
    const lines = []; const fresh = () => ({ top: ' '.repeat(w + 1), rows: names.map(x => x.padEnd(w) + '|'), any: false });
    let sys = fresh(); let count = 0;
    S.measures.forEach((m, mi) => {
      m.beats.forEach(b => {
        const idx = fi++; const toks = b.frets.map((_, s) => token(b, s, idx)); const an = annot(b);
        const cw = Math.max(1, ...toks.map(x => x.length), an.length);
        const pad = b.dur <= 4 ? 3 : b.dur === 8 ? 2 : 1;
        sys.rows = sys.rows.map((r, s) => r + '-' + toks[s].padEnd(cw, '-') + '-'.repeat(pad));
        sys.top += ' ' + an.padEnd(cw, ' ') + ' '.repeat(pad); if (an) sys.any = true;
      });
      sys.rows = sys.rows.map(r => r + '|'); sys.top += ' '; count++;
      if (count % 4 === 0 || mi === S.measures.length - 1) { if (sys.any) lines.push(sys.top.replace(/\s+$/, '')); lines.push(...sys.rows, ''); sys = fresh(); }
    });
    return lines.join('\n');
  }
  async function copyAscii() {
    const txt = asciiTab(); if (!S.measures.length) return toast(t('toast.noNotes'));
    try { await navigator.clipboard.writeText(txt); toast(t('toast.copied')); }
    catch (e) { $('tabTxt').click(); const ta = $('ascii'); ta.value = txt; ta.focus(); ta.select(); toast(t('toast.copyFail')); }
  }

  // ---------------- draft persistence (this browser only) ----------------
  const KEY = 'tablens-draft-v1';
  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (S.isSample) return;
      try { localStorage.setItem(KEY, JSON.stringify({ measures: S.measures, title: $('title').value, artist: $('artist').value, tempo: $('tempo').value, tsNum: $('tsNum').value, tsDen: $('tsDen').value, n: $('nStrings').value, tuning: $('tuning').value })); } catch (e) { }
    }, 400);
  }
  function restore() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!d || !d.measures || !d.measures.length) return false;
      $('nStrings').value = d.n || 6; fillTunings(); $('tuning').value = d.tuning || 0;
      ['title', 'artist', 'tempo', 'tsNum', 'tsDen'].forEach(k => { if (d[k] != null) $(k).value = d[k]; });
      S.measures = d.measures.map(m => ({ beats: m.beats.map(b => ({ ...b, src: null, low: b.low || [], fx: b.fx || Array(b.frets.length).fill(null) })) }));
      S.sel = { a: 0, b: 0 };
      return true;
    } catch (e) { return false; }
  }

  // ---------------- sample ----------------
  function makeSample() {
    const riff = [ // [measure][beat] = {string: fret}
      [{ 5: 0 }, { 3: 2 }, { 2: 2 }, { 1: 1 }, { 0: 0 }, { 1: 1 }, { 2: 2 }, { 3: 2 }],
      [{ 4: 3 }, { 3: 2 }, { 2: 0 }, { 1: 1 }, { 0: 0 }, { 1: 1 }, { 2: 0 }, { 3: 2 }],
      [{ 5: 3, 0: 3 }, { 3: 0 }, { 2: 0 }, { 1: 0 }, { 0: 3 }, { 1: 0 }, { 2: 0 }, { 3: 0 }],
      [{ 4: 0 }, { 3: 2 }, { 2: 2 }, { 1: 2 }, { 0: 5 }, { 0: 7 }, { 1: 10 }, { 0: 12 }],
    ];
    const W = 1400, sp = 22, x0 = 40, x1 = W - 30, y = 70, H = 260;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = '600 20px Arial, sans-serif'; g.fillText('Example riff', x0, 34);
    g.strokeStyle = '#333'; g.lineWidth = 1.4;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x0, y + k * sp); g.lineTo(x1, y + k * sp); g.stroke(); }
    g.font = 'bold 15px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['T', 'A', 'B'].forEach((ch, i) => g.fillText(ch, x0 + 12, y + sp * (1.5 + i)));
    const mw = (x1 - x0 - 34) / riff.length;
    g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0, y + 5 * sp); g.stroke();
    g.font = '17px Arial, sans-serif';
    riff.forEach((beats, mi) => {
      const mx = x0 + 34 + mi * mw;
      beats.forEach((b, bi) => {
        const bx = mx + (bi + 0.5) * mw / beats.length;
        Object.entries(b).forEach(([s, f]) => { const t = String(f); const tw = g.measureText(t).width; g.fillStyle = '#fff'; g.fillRect(bx - tw / 2 - 3, y + s * sp - 9, tw + 6, 18); g.fillStyle = '#111'; g.fillText(t, bx, y + s * sp + 1); });
        g.fillStyle = '#111'; g.fillRect(bx - 0.75, y + 5 * sp + 12, 1.5, 34);
      });
      g.fillRect(mx + 6, y + 5 * sp + 44, mw - 26, 4);
      g.lineWidth = 2; g.beginPath(); g.moveTo(mx + mw, y); g.lineTo(mx + mw, y + 5 * sp); g.stroke();
    });
    return c;
  }
  function loadSample() {
    const c = makeSample();
    S.images = [{ name: 'Sample', url: c.toDataURL(), src: c, result: null, sample: true }]; S.view = 0; S.isSample = true;
    $('title').value = 'Example riff';
    renderThumbs(); $('runOcr').disabled = false;
    try {
      const r = TabOCR.read(c, { strings: 6, deskew: false }); S.images[0].result = r;
      S.measures = resultToMeasures(r, 0); S.measures.forEach(fillEven); S.sel = S.measures.length ? { a: 0, b: 0 } : null;
    } catch (e) { console.error(e); }
    renderThumbs(); render();
    status(() => t('st.sample'));
  }

  // ---------------- wire up ----------------
  let sensLbl = () => { };
  function init() {
    I18N.set(I18N.lang); I18N.apply();
    fillTunings();
    const db = $('durBtns');
    [[1, '1'], [2, '2'], [4, '3'], [8, '4'], [16, '5'], [32, '6']].forEach(([d, k]) => {
      const b = document.createElement('button'); b.className = 'dur'; b.dataset.d = d; b.dataset.k = k; b.title = DUR_NAME[d] + ` (${k})`; b.setAttribute('aria-label', DUR_NAME[d]);
      b.innerHTML = noteSvg(d) + `<kbd>${k}</kbd>`; b.onclick = () => applyDur(d); db.appendChild(b);
    });
    buildFxBar();
    const markLang = () => document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === I18N.lang));
    markLang();
    document.querySelectorAll('.lang button').forEach(b => b.onclick = () => {
      if (b.dataset.lang === I18N.lang) return;
      I18N.set(b.dataset.lang); I18N.apply(); markLang();
      if (playing) { $('play').textContent = t('btn.stop'); }
      fillTunings(); $('fxBtns').innerHTML = ''; buildFxBar();
      document.querySelectorAll('.dur').forEach(el => { el.title = DUR_NAME[el.dataset.d] + ` (${el.dataset.k})`; el.setAttribute('aria-label', DUR_NAME[el.dataset.d]); });
      sensLbl(); renderThumbs(); render(); drawPreview();
      if (lastStatus) status(...lastStatus);
    });
    $('bDot').onclick = () => toggle('dot'); $('bTrip').onclick = () => toggle('tup'); $('bRest').onclick = () => toggle('rest');
    $('bIns').onclick = insertBeat; $('bDel').onclick = deleteBeats; $('bSplit').onclick = splitMeasure; $('bMerge').onclick = mergeMeasure;
    $('bEven').onclick = () => rhythmTool('even'); $('bSpace').onclick = () => rhythmTool('space');
    $('runOcr').onclick = runOcr; $('runAi').onclick = runAi; $('play').onclick = play; $('dl').onclick = download; $('copyAscii').onclick = copyAscii;
    $('showOverlay').onchange = drawPreview;
    sensLbl = () => { const v = +$('sens').value; $('sensVal').textContent = v === 0 ? t('sens.normal') : v > 0 ? t('sens.more', { v }) : t('sens.less', { v }); };
    $('sens').oninput = sensLbl; sensLbl();
    $('nStrings').onchange = () => {
      fillTunings(); const n = N();
      S.measures.forEach(m => m.beats.forEach(b => { b.frets = Array.from({ length: n }, (_, i) => b.frets[i] || ''); b.fx = Array.from({ length: n }, (_, i) => (b.fx && b.fx[i]) || null); b.low = b.low.filter(s => s < n); }));
      render(); save();
    };
    ['tuning', 'title', 'artist', 'tempo'].forEach(id => $(id).addEventListener('change', save));
    ['tsNum', 'tsDen'].forEach(id => $(id).addEventListener('change', () => { render(); save(); }));
    // tabs
    const setTab = img => { $('tabImg').setAttribute('aria-selected', img); $('tabTxt').setAttribute('aria-selected', !img); $('paneImg').hidden = !img; $('paneTxt').hidden = img; $('runOcr').parentElement.hidden = !img; };
    $('tabImg').onclick = () => setTab(true); $('tabTxt').onclick = () => setTab(false);
    $('parseTxt').onclick = () => {
      const ms = parseAscii($('ascii').value);
      if (!ms.length) { const n = N(); return status(() => t('st.noTxt', { n }), true); }
      pushUndo(); ms.forEach(fillEven); S.measures = ms; S.sel = { a: 0, b: 0 }; S.isSample = false; render(); save();
      status(() => t('st.txtRead', { m: ms.length }));
    };
    // file input / drop / paste
    const drop = $('drop'), file = $('file');
    drop.onclick = () => file.click(); drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
    file.onchange = () => { addFiles(file.files); file.value = ''; };
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    document.addEventListener('paste', e => {
      const files = [...(e.clipboardData && e.clipboardData.files || [])];
      if (files.length) { e.preventDefault(); addFiles(files); return; }
      const txt = e.clipboardData && e.clipboardData.getData('text');
      if (txt && !e.target.matches('input, textarea') && /-{3,}/.test(txt)) { $('tabTxt').click(); $('ascii').value = txt; status(() => t('st.pastedTxt')); }
    });

    if (restore()) { render(); status(() => t('st.restored')); }
    else loadSample();

    if (window.claude && claude.use) {
      claude.use('downloads').then(d => { downloads = d; if (d) { $('dlNote').dataset.i18n = 'dl.zipNote'; $('dlNote').textContent = t('dl.zipNote'); } }).catch(() => { });
      initSample();
    }
  }
  init();
})();
