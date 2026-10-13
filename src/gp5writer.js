// Minimal Guitar Pro 5 (.gp5, v5.00) writer. Port of the PyGuitarPro write path.
const GP5 = (() => {
  class W {
    constructor() { this.buf = new Uint8Array(1 << 16); this.n = 0; }
    ensure(k) { if (this.n + k > this.buf.length) { const b = new Uint8Array(Math.max(this.buf.length * 2, this.n + k)); b.set(this.buf); this.buf = b; } }
    u8(v) { this.ensure(1); this.buf[this.n++] = v & 255; }
    i8(v) { this.u8(v < 0 ? 256 + v : v); }
    bool(v) { this.u8(v ? 1 : 0); }
    i16(v) { this.ensure(2); new DataView(this.buf.buffer).setInt16(this.n, v, true); this.n += 2; }
    i32(v) { this.ensure(4); new DataView(this.buf.buffer).setInt32(this.n, v, true); this.n += 4; }
    f64(v) { this.ensure(8); new DataView(this.buf.buffer).setFloat64(this.n, v, true); this.n += 8; }
    pad(k) { for (let i = 0; i < k; i++) this.u8(0); }
    bytes(s) { // latin1-ish; non-latin chars become '?'
      const out = []; for (const ch of s) { const c = ch.codePointAt(0); out.push(c < 256 ? c : 63); } return out; }
    byteSizeString(s, count) { const b = this.bytes(s).slice(0, count); this.u8(b.length); for (let i = 0; i < count; i++) this.u8(i < b.length ? b[i] : 0); }
    intSizeString(s) { const b = this.bytes(s); this.i32(b.length); b.forEach(x => this.u8(x)); }
    intByteSizeString(s) { const b = this.bytes(s).slice(0, 255); this.i32(b.length + 1); this.u8(b.length); b.forEach(x => this.u8(x)); }
    result() { return this.buf.slice(0, this.n); }
  }
  const DUR_CODE = { 1: -2, 2: -1, 4: 0, 8: 1, 16: 2, 32: 3, 64: 4 };
  const NOTE_TYPE = { normal: 1, tie: 2, dead: 3 };

  function write(song) {
    const w = new W();
    w.byteSizeString('FICHIER GUITAR PRO v5.00', 30);
    // info
    [song.title || '', song.subtitle || '', song.artist || '', song.album || '', song.words || '', song.music || '', song.copyright || '', song.tab || '', song.instructions || ''].forEach(s => w.intByteSizeString(s));
    w.i32(0); // notice lines
    // lyrics
    w.i32(0); for (let i = 0; i < 5; i++) { w.i32(1); w.intSizeString(''); }
    // page setup
    w.i32(210); w.i32(297); w.i32(10); w.i32(10); w.i32(15); w.i32(10); w.i32(100);
    w.u8(0xff); w.u8(0x01);
    ['%title%', '%subtitle%', '%artist%', '%album%', 'Words by %words%', 'Music by %music%', 'Words & Music by %WORDSMUSIC%',
      'Copyright %copyright%', 'All Rights Reserved - International Copyright Secured', 'Page %N%/%P%'].forEach(s => w.intByteSizeString(s));
    w.intByteSizeString(song.tempoName || 'Moderate');
    w.i32(song.tempo || 120);
    w.i8(0); w.i32(0); // key, octave
    // midi channels
    const tracks = song.tracks;
    const fromShort = d => Math.min(Math.max((d >> 3) - 1, -128), 127) + 1;
    for (let ch = 0; ch < 64; ch++) {
      let t = tracks.findIndex((tr, i) => ch === 2 * i || ch === 2 * i + 1);
      const perc = ch % 16 === 9;
      const instr = t >= 0 ? (tracks[t].instrument ?? 25) : (perc ? 0 : 25);
      if (perc && instr === 0) w.i32(-1); else w.i32(instr);
      [104, 64, 0, 0, 0, 0].forEach(v => w.i8(fromShort(v)));
      w.pad(2);
    }
    for (let i = 0; i < 19; i++) w.i16(-1); // directions
    w.i32(0); // master reverb
    const measures = tracks[0].measures;
    w.i32(measures.length); w.i32(tracks.length);
    // measure headers
    let prev = null;
    measures.forEach((m, idx) => {
      let flags = 0;
      if (!prev) flags |= 0x43;
      else { if (m.num !== prev.num) flags |= 0x01; if (m.den !== prev.den) flags |= 0x02; }
      if (m.repeatOpen) flags |= 0x04;
      if (m.repeatClose > 0) flags |= 0x08;
      if (m.marker) flags |= 0x20;
      if (prev) w.pad(1);
      w.u8(flags);
      if (flags & 0x01) w.i8(m.num);
      if (flags & 0x02) w.i8(m.den);
      if (flags & 0x08) w.i8(m.repeatClose);
      if (flags & 0x20) { w.intByteSizeString(m.marker); w.u8(255); w.u8(0); w.u8(0); w.pad(1); }
      if (flags & 0x40) { w.i8(0); w.i8(0); }
      if (flags & 0x03) { [2, 2, 2, 2].forEach(b => w.u8(b)); }
      w.pad(1); // no repeat alternative
      w.u8(0); // triplet feel
      prev = m;
    });
    // tracks
    tracks.forEach((tr, i) => {
      w.pad(1);
      w.u8(0x08); // visible
      w.byteSizeString(tr.name || 'Guitar', 40);
      const strings = tr.tuning; // MIDI values, string 1 (highest) first
      w.i32(strings.length);
      for (let s = 0; s < 7; s++) w.i32(s < strings.length ? strings[s] : 0);
      w.i32(1); w.i32(2 * i + 1); w.i32(2 * i + 2); // port, channel+1, effect channel+1
      w.i32(tr.fretCount || 24); w.i32(tr.capo || 0);
      w.u8(255); w.u8(0); w.u8(0); w.pad(1); // color
      w.i16(0x0043); // tablature + notation + diagram list
      w.u8(0); w.u8(0); w.u8(0); // auto accentuation, bank, humanize
      const ct = strings[strings.length - 1] < 35 ? 12 : 0; w.i32(ct); w.i32(ct);
      w.i32(100); w.pad(12);
      w.i32(-1); w.i32(-1); w.i32(-1); w.i16(-1); w.pad(1); // RSE instrument (5.00)
    });
    w.pad(2);
    // measures (timewise)
    for (let mi = 0; mi < measures.length; mi++) {
      tracks.forEach(tr => {
        const m = tr.measures[mi];
        const beats = m.beats && m.beats.length ? m.beats : [{ dur: 1, rest: true, notes: [] }];
        // voice 1
        w.i32(beats.length);
        beats.forEach(b => writeBeat(w, b, tr.tuning));
        // voice 2 (empty)
        w.i32(0);
        w.u8(0); // line break
      });
    }
    return w.result();
  }

  function writeBeat(w, b, tuning) {
    const notes = b.rest ? [] : (b.notes || []);
    let flags = 0;
    if (b.dotted) flags |= 0x01;
    if (b.text) flags |= 0x04;
    if (b.tuplet && b.tuplet > 1) flags |= 0x20;
    const isRest = b.rest || notes.length === 0;
    if (isRest) flags |= 0x40;
    w.i8(flags);
    if (flags & 0x40) w.u8(2); // rest
    w.i8(DUR_CODE[b.dur] ?? 0);
    if (flags & 0x20) w.i32(b.tuplet);
    if (flags & 0x04) w.intByteSizeString(b.text);
    // notes
    let sf = 0; notes.forEach(n => sf |= 1 << (7 - n.string));
    w.u8(sf);
    [...notes].sort((a, c) => a.string - c.string).forEach(n => {
      const fx = n.fx || {};
      const eff = hasNoteFx(fx);
      let nf = 0x20;
      if (fx.acc === 2) nf |= 0x02;
      if (fx.ghost) nf |= 0x04;
      if (eff) nf |= 0x08;
      if (fx.acc === 1) nf |= 0x40;
      w.u8(nf);
      w.u8(NOTE_TYPE[n.type || 'normal']);
      w.i8(n.type === 'tie' ? 0 : n.fret);
      w.u8(0); // flags2
      if (eff) writeNoteFx(w, fx, (tuning[n.string - 1] || 0) + (n.fret || 0));
    });
    w.i16(0); // beat flags2
  }
  const BEND_TYPE = { bend: 1, bendRelease: 2, bendReleaseBend: 3, prebend: 4, prebendRelease: 5 };
  function bendPoints(type, v) {
    switch (type) {
      case 'bendRelease': return [[0, 0], [12, v], [24, v], [36, 0], [60, 0]];
      case 'bendReleaseBend': return [[0, 0], [10, v], [20, v], [30, 0], [40, 0], [50, v], [60, v]];
      case 'prebend': return [[0, v], [60, v]];
      case 'prebendRelease': return [[0, v], [15, v], [30, 0], [60, 0]];
      default: return [[0, 0], [15, v], [60, v]];
    }
  }
  const SLIDE_BIT = { shift: 0x01, legato: 0x02, outDown: 0x04, outUp: 0x08, inBelow: 0x10, inAbove: 0x20 };
  const HARM = { N: 1, A: 2, T: 3, P: 4, S: 5 };
  function hasNoteFx(fx) { return !!(fx.bend || fx.hammer || fx.lr || fx.stac || fx.pm || fx.trem || fx.slide || fx.harm || fx.vib); }
  function writeNoteFx(w, fx, realValue) {
    let f1 = 0, f2 = 0;
    if (fx.bend) f1 |= 0x01;
    if (fx.hammer) f1 |= 0x02;
    if (fx.lr) f1 |= 0x08;
    if (fx.stac) f2 |= 0x01;
    if (fx.pm) f2 |= 0x02;
    if (fx.trem) f2 |= 0x04;
    if (fx.slide) f2 |= 0x08;
    if (fx.harm) f2 |= 0x10;
    if (fx.vib) f2 |= 0x40;
    w.i8(f1); w.i8(f2);
    if (f1 & 0x01) {
      const v = Math.round(fx.bend.amt || 100), pts = bendPoints(fx.bend.type, v);
      w.i8(BEND_TYPE[fx.bend.type] || 1); w.i32(v); w.i32(pts.length);
      pts.forEach(([pos, val]) => { w.i32(pos); w.i32(val); w.bool(false); });
    }
    if (f2 & 0x04) w.i8({ 8: 1, 16: 2, 32: 3 }[fx.trem] || 3);
    if (f2 & 0x08) w.u8(SLIDE_BIT[fx.slide] || 1);
    if (f2 & 0x10) {
      const t = HARM[fx.harm] || 1; w.i8(t);
      if (t === 2) { const pc = ((realValue % 12) + 12) % 12; const sharp = [1, 3, 6, 8, 10].includes(pc); w.u8(sharp ? pc - 1 : pc); w.i8(sharp ? 1 : 0); w.u8(1); }
      else if (t === 3) w.u8(Math.min(99, (fx.tapFret != null ? fx.tapFret : 12)));
    }
  }
  return { write };
})();
if (typeof module !== 'undefined') module.exports = GP5;
