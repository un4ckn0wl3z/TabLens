# TabLens

แปลงรูปแท็บกีตาร์ (สแกน ภาพหน้าจอ หรือแท็บตัวอักษร) เป็นไฟล์ **Guitar Pro 5 (.gp5)** ทั้งหมดทำงานในเบราว์เซอร์ ไม่ต้องติดตั้งอะไร และไม่ส่งรูปออกไปไหน (ยกเว้นเมื่อกด "อ่านด้วย Claude AI")

Turn guitar tab images (scans, screenshots, ASCII tab) into Guitar Pro 5 files, entirely in the browser.

## ใช้งาน

เปิด `dist/index.html` ในเบราว์เซอร์ (หรือเปิดผ่าน GitHub Pages)

1. **นำเข้าแท็บ** — ลาก/วาง/Ctrl+V รูปแท็บ (หลายหน้าได้) หรือวางแท็บข้อความ เลือกจำนวนสาย (4–7) และจูนสาย
2. **ตรวจตัวเลขและใส่จังหวะ** — ตัวเลขที่ไม่มั่นใจจะขีดเส้นใต้สีเหลือง แก้ได้ในช่อง เลือกโน้ตแล้วกำหนดค่าโน้ต (คีย์ `1`–`6`, `.` ประจุด, `T` สามพวง, `R` ตัวหยุด) มีตัวช่วย "แบ่งเท่ากัน" และ "เดาจากระยะห่าง"
3. **เทคนิค** — bend (½, full, 1½, 2, release, prebend), vibrato, hammer-on/pull-off, slide (legato, shift, in/out), palm mute, let ring, harmonic (NH/AH/PH/TH/SH), ghost, tie, tremolo picking, accent, staccato
4. **ฟังและส่งออก** — เล่นเสียงตัวอย่าง (รวม bend/slide/vibrato), ดาวน์โหลด `.gp5`, คัดลอกเป็นแท็บข้อความ

ไฟล์ .gp5 เปิดได้ใน Guitar Pro 5–8, TuxGuitar, MuseScore

## การอ่านอัตโนมัติ

| แหล่ง | ตัวเลข/ห้อง | เทคนิค |
|---|---|---|
| แท็บข้อความ (วาง) | ✓ | `5h7` `7p5` `5/7` `/5` `5\` `7b9` `8b10r8` `7~` `(5)` `<12>` และบรรทัด `PM----` / `let ring---` |
| รูปแท็บข้อความ | ✓ | h p b r / \ ( ) |
| รูปแท็บพิมพ์ (Guitar Pro / หนังสือ) | ✓ | ยังไม่อ่านลูกศร bend / เส้น vibrato — ใช้ "อ่านด้วย Claude AI" หรือใส่เอง |

OCR เขียนเองทั้งหมด (ไม่ใช้ Tesseract): หาเส้นสายด้วย row projection, แก้ภาพเอียง, ลบเส้นสาย, แยก connected components แล้วจำแนกตัวเลขด้วย template matching จากฟอนต์ที่เรนเดอร์ในเบราว์เซอร์

## โครงสร้าง

```
src/shell.html     HTML + CSS
src/app.js         UI, editor, rhythm, techniques, playback, export
src/tabocr.js      image → staves / barlines / fret numbers
src/gp5writer.js   Guitar Pro 5 binary writer (port of PyGuitarPro's write path)
tools/build.py     builds dist/index.html (standalone) and dist/artifact.html
tests/             GP5 byte-compare tests and OCR benchmark on synthetic images
```

## Build & test

```bash
python3 tools/build.py                 # -> dist/index.html
pip install pyguitarpro && bash tests/test_gp5.sh   # JS writer == PyGuitarPro, byte for byte
pip install playwright && python3 tests/ocr_benchmark.py
```

## ข้อจำกัด

- ชื่อเพลงต้องเป็นอักษรละติน (GP5 ไม่รองรับ Unicode — ภาษาไทยจะกลายเป็น `?`)
- ภาพถ่ายเอียงมากหรือเบลอ อ่านได้ไม่ดี — ครอปให้เหลือเฉพาะแท็บ หรือใช้ Claude AI
- ใช้ track เดียว, voice เดียว, time signature เดียวทั้งเพลง
