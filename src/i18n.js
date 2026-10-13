// UI strings (Thai / English). t(key, vars) replaces {name} placeholders.
const I18N = (() => {
  const D = {
    th: {
      'app.tagline': 'แปลงรูปแท็บกีตาร์ (สแกน ภาพหน้าจอ หรือแท็บตัวอักษร) เป็นไฟล์ Guitar Pro (.gp5) — อ่านตัวเลขเฟรตให้อัตโนมัติ แล้วคุณกำหนดจังหวะเองก่อนส่งออก',
      's1.title': 'นำเข้าแท็บ', 's1.hint': 'ภาพตรง คมชัด ได้ผลดีที่สุด · วางรูปด้วย Ctrl+V ได้',
      'tab.img': 'จากรูปภาพ', 'tab.txt': 'จากข้อความ',
      'drop.aria': 'เลือกรูปแท็บ', 'drop.title': 'ลากรูปมาวาง หรือคลิกเพื่อเลือก', 'drop.sub': 'PNG / JPG หลายหน้าได้ เรียงตามลำดับ',
      'btn.parseTxt': 'อ่านแท็บข้อความ',
      'f.strings': 'จำนวนสาย', 'opt.s6': '6 สาย (กีตาร์)', 'opt.s7': '7 สาย', 'opt.s4': '4 สาย (เบส / อูคูเลเล่)', 'opt.s5': '5 สาย (เบส)',
      'f.tuning': 'จูนสาย', 'f.sens': 'ความไวการอ่านหมึก', 'f.deskew': 'แก้ภาพเอียงอัตโนมัติ',
      'sens.normal': '(ปกติ)', 'sens.more': '(+{v} อ่านหมึกจางได้มากขึ้น)', 'sens.less': '({v} ตัดหมึกจางทิ้ง)',
      'btn.runOcr': 'อ่านแท็บจากรูป', 'btn.runAi': 'อ่านด้วย Claude AI', 'btn.runAi.title': 'ส่งรูปให้ Claude อ่าน ใช้โควตา Claude ของคุณ',
      'prev.title': 'ตัวอย่างผลการอ่าน', 'prev.overlay': 'แสดงกรอบที่อ่านได้', 'prev.empty': 'ยังไม่มีรูป', 'prev.rotated': 'หมุนแก้ {a}°',
      'lg.lines': 'เส้นสาย', 'lg.ok': 'ตัวเลขที่มั่นใจ', 'lg.check': 'ควรตรวจ', 'lg.bar': 'เส้นกั้นห้อง',
      's2.title': 'ตรวจตัวเลข และใส่จังหวะ', 's2.hint': 'คลิกเลือกโน้ต (Shift เลือกช่วง) แล้วกดค่าจังหวะ · แก้ตัวเลขได้ในช่องโดยตรง',
      'f.title': 'ชื่อเพลง', 'f.artist': 'ศิลปิน', 'f.tempo': 'Tempo (BPM)', 'f.tsNum': 'ตัวบน', 'f.tsDen': 'ตัวล่าง',
      'btn.dot': 'จุด', 'btn.dot.title': 'ประจุด (.)', 'btn.trip': '3 พวง', 'btn.trip.title': 'สามพวง (T)', 'btn.rest': 'ตัวหยุด', 'btn.rest.title': 'ตัวหยุด (R)',
      'btn.ins': '+ แทรก', 'btn.ins.title': 'แทรกจังหวะว่างหลังตัวที่เลือก (I)', 'btn.del': 'ลบ', 'btn.del.title': 'ลบจังหวะที่เลือก (Delete)',
      'btn.split': 'ตัดห้อง', 'btn.split.title': 'ตัดห้องใหม่หลังโน้ตที่เลือก', 'btn.merge': 'รวมห้อง', 'btn.merge.title': 'รวมห้องนี้กับห้องถัดไป',
      'btn.even': 'แบ่งเท่ากัน', 'btn.even.title': 'แบ่งจังหวะเท่ากันในห้องที่เลือก', 'btn.space': 'เดาจากระยะห่าง', 'btn.space.title': 'เดาจากระยะห่างของตัวเลขในรูป',
      'fx.label': 'เทคนิค', 'fx.clear': 'ล้างเทคนิค', 'fx.clear.title': 'ลบเทคนิคทั้งหมดของโน้ตที่เลือก',
      'help.keys': 'คีย์ลัด: <kbd>1</kbd>ตัวกลม <kbd>2</kbd>ตัวขาว <kbd>3</kbd>ตัวดำ <kbd>4</kbd>เขบ็ต 1 ชั้น <kbd>5</kbd>2 ชั้น <kbd>6</kbd>3 ชั้น · <kbd>.</kbd>จุด <kbd>T</kbd>3 พวง <kbd>R</kbd>ตัวหยุด · <kbd>←</kbd><kbd>→</kbd>เลื่อน <kbd>I</kbd>แทรก <kbd>Del</kbd>ลบ · พิมพ์ <kbd>x</kbd> ในช่องเพื่อเป็น dead note<br>เทคนิค (คลิกตัวเลขก่อน แล้วกด): <kbd>H</kbd>/<kbd>P</kbd> hammer/pull <kbd>B</kbd> bend <kbd>V</kbd> vibrato <kbd>S</kbd> slide <kbd>M</kbd> palm mute <kbd>L</kbd> let ring <kbd>G</kbd> ghost <kbd>N</kbd> harmonic <kbd>A</kbd> accent · ขณะพิมพ์ในช่องเพิ่ม <kbd>T</kbd> tremolo <kbd>.</kbd> staccato <kbd>=</kbd> tie <kbd>/</kbd> slide <kbd>~</kbd> vibrato · ใส่หลายโน้ตพร้อมกัน: เลือกหลายจังหวะแล้วกดปุ่มเทคนิค',
      's3.title': 'ฟังและส่งออก', 'btn.play': '▶ ฟัง', 'btn.stop': '■ หยุด', 'btn.dl': 'ดาวน์โหลด .gp5', 'btn.copy': 'คัดลอกเป็นแท็บข้อความ',
      's3.note': 'ไฟล์เป็นรูปแบบ Guitar Pro 5 เปิดได้ใน Guitar Pro 5–8, TuxGuitar, MuseScore และ Songsterr · ชื่อเพลงภาษาไทยจะถูกแทนด้วย ? เพราะรูปแบบ GP5 รองรับเฉพาะอักษรละติน',
      'dl.zipNote': 'ไฟล์จะถูกบีบเป็น .zip (มี .gp5 อยู่ข้างใน)',
      'dur.1': 'ตัวกลม', 'dur.2': 'ตัวขาว', 'dur.4': 'ตัวดำ', 'dur.8': 'เขบ็ต 1 ชั้น', 'dur.16': 'เขบ็ต 2 ชั้น', 'dur.32': 'เขบ็ต 3 ชั้น',
      'tun.bass': 'เบส EADG', 'tun.bassDropD': 'เบส Drop D', 'tun.uke': 'อูคูเลเล่ GCEA', 'tun.bass5': 'เบส 5 สาย BEADG',
      'bend.none': 'Bend —', 'bend.50': 'Bend ½', 'bend.100': 'Bend เต็ม (Full)', 'bend.150': 'Bend 1½', 'bend.200': 'Bend 2 เสียง',
      'bendR.50': 'Bend ½ แล้วปล่อย', 'bendR.100': 'Bend เต็ม แล้วปล่อย', 'pre.50': 'Prebend ½', 'pre.100': 'Prebend เต็ม', 'preR.100': 'Prebend แล้วปล่อย',
      'slide.none': 'Slide —', 'slide.legato': 'Slide ไปโน้ตถัดไป', 'slide.shift': 'Shift slide (ดีดซ้ำ)', 'slide.inBelow': 'Slide in จากล่าง', 'slide.inAbove': 'Slide in จากบน', 'slide.outUp': 'Slide out ขึ้น', 'slide.outDown': 'Slide out ลง',
      'harm.none': 'Harmonic —',
      'tg.hammer': 'Hammer-on / Pull-off ไปโน้ตถัดไป', 'tg.tie': 'Tie ต่อเสียงจากโน้ตก่อนหน้า', 'tg.acc': 'Accent (กดซ้ำเป็น heavy accent ^)',
      'fx.target.none': 'เลือกโน้ตก่อน', 'fx.target.one': 'โน้ตสาย {s} เฟรต {f}', 'fx.target.many': '{n} โน้ต',
      'toast.undoEmpty': 'ไม่มีอะไรให้ย้อนกลับ', 'toast.pickFretNote': 'เลือกโน้ตที่มีตัวเลขก่อน — คลิกที่ตัวเลขเพื่อเลือกเฉพาะโน้ตนั้น', 'toast.pickFretShort': 'เลือกโน้ตที่มีตัวเลขก่อน',
      'toast.pickNote': 'เลือกโน้ตก่อน', 'toast.notLast': 'เลือกโน้ตที่ไม่ใช่ตัวสุดท้ายของห้อง', 'toast.noNext': 'ไม่มีห้องถัดไปให้รวม', 'toast.pickMeasure': 'เลือกโน้ตในห้องที่ต้องการก่อน',
      'toast.noSpacing': 'ห้องที่ไม่ได้มาจากรูปเดาจากระยะห่างไม่ได้', 'toast.typeFretFirst': 'พิมพ์ตัวเลขเฟรตก่อน แล้วค่อยกดตัวอักษรเทคนิค', 'toast.nothingToPlay': 'ยังไม่มีโน้ตให้ฟัง',
      'toast.saved': 'บันทึกแล้ว — แตกไฟล์ zip เพื่อได้ {name}.gp5', 'toast.declined': 'ยกเลิกการบันทึก', 'toast.saveBusy': 'มีหน้าต่างบันทึกเปิดอยู่แล้ว', 'toast.saveFail': 'บันทึกไฟล์ไม่ได้ในมุมมองนี้',
      'toast.badMeasures': 'หมายเหตุ: มี {n} ห้องที่จังหวะไม่ครบ/เกิน Guitar Pro จะแสดงเป็นห้องไม่สมบูรณ์', 'toast.noNotes': 'ยังไม่มีโน้ต', 'toast.copied': 'คัดลอกแท็บข้อความแล้ว',
      'toast.copyFail': 'คัดลอกอัตโนมัติไม่ได้ — เลือกข้อความในช่องแล้วกด Ctrl+C',
      'img.pasted': 'รูปที่วาง', 'img.sample': 'แท็บตัวอย่าง', 'img.notRead': 'ยังไม่ได้อ่าน', 'img.info': '{st} บรรทัด · {m} ห้อง', 'img.remove': 'นำรูปออก',
      'st.added': 'เพิ่มรูปแล้ว {n} รูป — กด “อ่านแท็บจากรูป”', 'st.openFail': 'เปิดไฟล์รูปนี้ไม่ได้: {name}', 'st.reading': 'กำลังอ่านรูป {i}/{n}…',
      'st.noStaff': 'ไม่พบบรรทัดแท็บ {n} เส้นในรูป — ลองปรับความไว ครอปให้เหลือเฉพาะแท็บ หรือใช้ “อ่านด้วย Claude AI”',
      'st.read': 'อ่านได้ {m} ห้อง {n} ตัวเลข', 'st.readLow': ' · {n} ตัวควรตรวจ (ขีดเส้นใต้สีเหลือง)', 'st.readTail': ' · จังหวะเริ่มต้นแบ่งเท่ากันไว้ให้แล้ว',
      'st.ocrFail': 'อ่านรูปไม่สำเร็จ: {msg}', 'st.aiReading': 'Claude กำลังอ่านรูป {i}/{n}… (อาจใช้เวลา 30–90 วินาที)', 'st.aiDone': 'Claude อ่านได้ {m} ห้อง · ตรวจตัวเลขและจังหวะอีกครั้งก่อนส่งออก',
      'ai.not_granted': 'ไม่ได้อนุญาตให้ใช้ Claude', 'ai.rate_limited': 'ใช้งานถี่เกินไป ลองใหม่อีกสักครู่', 'ai.cancelled': 'ยกเลิกแล้ว', 'ai.empty': 'Claude ไม่พบแท็บในรูป', 'ai.fail': 'Claude อ่านไม่สำเร็จ',
      'st.sample': 'นี่คือแท็บตัวอย่างที่อ่านให้ดูแล้ว — เพิ่มรูปของคุณเพื่อเริ่มงานจริง', 'st.noTxt': 'ไม่พบแท็บ {n} บรรทัดในข้อความ — ตรวจว่าแต่ละสายขึ้นบรรทัดใหม่และใช้ขีด -',
      'st.txtRead': 'อ่านได้ {m} ห้อง จากแท็บข้อความ', 'st.pastedTxt': 'วางแท็บข้อความแล้ว — กด “อ่านแท็บข้อความ”', 'st.restored': 'กู้คืนงานล่าสุดจากเบราว์เซอร์นี้แล้ว · เพิ่มรูปใหม่เพื่อเริ่มงานใหม่',
      'ed.empty': 'ยังไม่มีโน้ต — อ่านแท็บจากรูปหรือข้อความด้านบน หรือกด “+ แทรก” เพื่อเริ่มเขียนเอง',
      'ed.sumTitle': 'ผลรวมจังหวะในห้อง', 'ed.under': ' ขาด', 'ed.over': ' เกิน', 'ed.cellAria': 'ห้อง {m} จังหวะ {b} สาย {s}',
      'ed.rest': 'ตัวหยุด ', 'ed.dotted': ' ประจุด', 'ed.triplet': ' สามพวง',
      'sel.info': 'เลือก {n} จังหวะ · ห้อง {m}', 'sel.none': 'ยังไม่ได้เลือก',
    },
    en: {
      'app.tagline': 'Turn guitar tab images (scans, screenshots or ASCII tab) into Guitar Pro (.gp5) files — fret numbers are read automatically, then you set the rhythm before exporting.',
      's1.title': 'Import tab', 's1.hint': 'Straight, sharp images work best · paste with Ctrl+V',
      'tab.img': 'From image', 'tab.txt': 'From text',
      'drop.aria': 'Choose tab images', 'drop.title': 'Drop images here or click to choose', 'drop.sub': 'PNG / JPG, multiple pages in order',
      'btn.parseTxt': 'Read text tab',
      'f.strings': 'Strings', 'opt.s6': '6 strings (guitar)', 'opt.s7': '7 strings', 'opt.s4': '4 strings (bass / ukulele)', 'opt.s5': '5 strings (bass)',
      'f.tuning': 'Tuning', 'f.sens': 'Ink sensitivity', 'f.deskew': 'Straighten tilted images',
      'sens.normal': '(normal)', 'sens.more': '(+{v} picks up fainter ink)', 'sens.less': '({v} ignores faint ink)',
      'btn.runOcr': 'Read tab from image', 'btn.runAi': 'Read with Claude AI', 'btn.runAi.title': 'Send the images to Claude to read; uses your Claude usage',
      'prev.title': 'Recognition preview', 'prev.overlay': 'Show detected boxes', 'prev.empty': 'No image yet', 'prev.rotated': 'rotated {a}°',
      'lg.lines': 'String lines', 'lg.ok': 'Confident number', 'lg.check': 'Please check', 'lg.bar': 'Barline',
      's2.title': 'Check numbers and set rhythm', 's2.hint': 'Click a note (Shift for a range), then pick a duration · edit numbers directly in the cells',
      'f.title': 'Title', 'f.artist': 'Artist', 'f.tempo': 'Tempo (BPM)', 'f.tsNum': 'Beats', 'f.tsDen': 'Beat unit',
      'btn.dot': 'Dot', 'btn.dot.title': 'Dotted (.)', 'btn.trip': 'Triplet', 'btn.trip.title': 'Triplet (T)', 'btn.rest': 'Rest', 'btn.rest.title': 'Rest (R)',
      'btn.ins': '+ Insert', 'btn.ins.title': 'Insert an empty beat after the selection (I)', 'btn.del': 'Delete', 'btn.del.title': 'Delete selected beats (Delete)',
      'btn.split': 'Split bar', 'btn.split.title': 'Start a new bar after the selected note', 'btn.merge': 'Merge bars', 'btn.merge.title': 'Merge this bar with the next one',
      'btn.even': 'Even split', 'btn.even.title': 'Give every beat in the selected bars the same length', 'btn.space': 'Guess from spacing', 'btn.space.title': 'Guess durations from how far apart the numbers are in the image',
      'fx.label': 'Techniques', 'fx.clear': 'Clear techniques', 'fx.clear.title': 'Remove all techniques from the selected notes',
      'help.keys': 'Shortcuts: <kbd>1</kbd>whole <kbd>2</kbd>half <kbd>3</kbd>quarter <kbd>4</kbd>8th <kbd>5</kbd>16th <kbd>6</kbd>32nd · <kbd>.</kbd>dot <kbd>T</kbd>triplet <kbd>R</kbd>rest · <kbd>←</kbd><kbd>→</kbd>move <kbd>I</kbd>insert <kbd>Del</kbd>delete · type <kbd>x</kbd> in a cell for a dead note<br>Techniques (click a number first, then press): <kbd>H</kbd>/<kbd>P</kbd> hammer/pull <kbd>B</kbd> bend <kbd>V</kbd> vibrato <kbd>S</kbd> slide <kbd>M</kbd> palm mute <kbd>L</kbd> let ring <kbd>G</kbd> ghost <kbd>N</kbd> harmonic <kbd>A</kbd> accent · while typing in a cell also <kbd>T</kbd> tremolo <kbd>.</kbd> staccato <kbd>=</kbd> tie <kbd>/</kbd> slide <kbd>~</kbd> vibrato · several notes at once: select several beats, then press a technique button',
      's3.title': 'Listen and export', 'btn.play': '▶ Play', 'btn.stop': '■ Stop', 'btn.dl': 'Download .gp5', 'btn.copy': 'Copy as text tab',
      's3.note': 'The file is Guitar Pro 5 format and opens in Guitar Pro 5–8, TuxGuitar, MuseScore and Songsterr · non-Latin characters in the title become ? because GP5 only supports Latin text.',
      'dl.zipNote': 'The file is delivered as a .zip with the .gp5 inside',
      'dur.1': 'Whole', 'dur.2': 'Half', 'dur.4': 'Quarter', 'dur.8': 'Eighth', 'dur.16': 'Sixteenth', 'dur.32': 'Thirty-second',
      'tun.bass': 'Bass EADG', 'tun.bassDropD': 'Bass Drop D', 'tun.uke': 'Ukulele GCEA', 'tun.bass5': '5-string bass BEADG',
      'bend.none': 'Bend —', 'bend.50': 'Bend ½', 'bend.100': 'Bend full', 'bend.150': 'Bend 1½', 'bend.200': 'Bend 2 tones',
      'bendR.50': 'Bend ½ & release', 'bendR.100': 'Bend full & release', 'pre.50': 'Prebend ½', 'pre.100': 'Prebend full', 'preR.100': 'Prebend & release',
      'slide.none': 'Slide —', 'slide.legato': 'Slide to next note', 'slide.shift': 'Shift slide (re-pick)', 'slide.inBelow': 'Slide in from below', 'slide.inAbove': 'Slide in from above', 'slide.outUp': 'Slide out upwards', 'slide.outDown': 'Slide out downwards',
      'harm.none': 'Harmonic —',
      'tg.hammer': 'Hammer-on / pull-off to the next note', 'tg.tie': 'Tie from the previous note', 'tg.acc': 'Accent (press again for heavy accent ^)',
      'fx.target.none': 'Select a note first', 'fx.target.one': 'String {s}, fret {f}', 'fx.target.many': '{n} notes',
      'toast.undoEmpty': 'Nothing to undo', 'toast.pickFretNote': 'Select a note with a number first — click a number to target just that note', 'toast.pickFretShort': 'Select a note with a number first',
      'toast.pickNote': 'Select a note first', 'toast.notLast': 'Pick a note that is not the last one in its bar', 'toast.noNext': 'There is no next bar to merge', 'toast.pickMeasure': 'Select a note in the bars you want first',
      'toast.noSpacing': 'Bars that did not come from an image cannot be guessed from spacing', 'toast.typeFretFirst': 'Type a fret number first, then the technique letter', 'toast.nothingToPlay': 'No notes to play yet',
      'toast.saved': 'Saved — unzip it to get {name}.gp5', 'toast.declined': 'Save cancelled', 'toast.saveBusy': 'A save dialog is already open', 'toast.saveFail': 'Saving files is not available in this view',
      'toast.badMeasures': 'Note: {n} bars are short or over-full; Guitar Pro will show them as incomplete', 'toast.noNotes': 'No notes yet', 'toast.copied': 'Text tab copied',
      'toast.copyFail': 'Could not copy automatically — select the text in the box and press Ctrl+C',
      'img.pasted': 'Pasted image', 'img.sample': 'Sample tab', 'img.notRead': 'Not read yet', 'img.info': '{st} systems · {m} bars', 'img.remove': 'Remove image',
      'st.added': 'Added {n} image(s) — press “Read tab from image”', 'st.openFail': 'Could not open this image: {name}', 'st.reading': 'Reading image {i}/{n}…',
      'st.noStaff': 'No {n}-line tab staff found — try the sensitivity slider, crop to just the tab, or use “Read with Claude AI”',
      'st.read': 'Read {m} bars, {n} numbers', 'st.readLow': ' · {n} to check (yellow underline)', 'st.readTail': ' · rhythm pre-filled with even durations',
      'st.ocrFail': 'Reading failed: {msg}', 'st.aiReading': 'Claude is reading image {i}/{n}… (may take 30–90 seconds)', 'st.aiDone': 'Claude read {m} bars · check numbers and rhythm before exporting',
      'ai.not_granted': 'Claude access was not allowed', 'ai.rate_limited': 'Too many requests, try again shortly', 'ai.cancelled': 'Cancelled', 'ai.empty': 'Claude found no tab in the image', 'ai.fail': 'Claude could not read the image',
      'st.sample': 'This is a sample tab, already read — add your own images to start', 'st.noTxt': 'No {n}-line tab found in the text — put each string on its own line and use dashes',
      'st.txtRead': 'Read {m} bars from text tab', 'st.pastedTxt': 'Text tab pasted — press “Read text tab”', 'st.restored': 'Restored your last work from this browser · add images to start something new',
      'ed.empty': 'No notes yet — read a tab from an image or text above, or press “+ Insert” to write your own',
      'ed.sumTitle': 'Total duration in this bar', 'ed.under': ' short', 'ed.over': ' over', 'ed.cellAria': 'Bar {m} beat {b} string {s}',
      'ed.rest': 'Rest ', 'ed.dotted': ' dotted', 'ed.triplet': ' triplet',
      'sel.info': '{n} beat(s) selected · bar {m}', 'sel.none': 'Nothing selected',
    },
  };
  let lang = 'th';
  try { lang = localStorage.getItem('tablens-lang') || ((navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en'); } catch (e) { lang = (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en'; }
  if (!D[lang]) lang = 'en';
  function t(key, vars) {
    let s = (D[lang] && D[lang][key]) ?? D.en[key] ?? D.th[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
    return s;
  }
  function set(l) { lang = D[l] ? l : 'en'; try { localStorage.setItem('tablens-lang', lang); } catch (e) { } document.documentElement.lang = lang; }
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  }
  return { t, set, apply, get lang() { return lang; }, langs: Object.keys(D) };
})();
if (typeof module !== 'undefined') module.exports = I18N;
