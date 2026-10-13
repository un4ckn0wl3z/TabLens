"""UI smoke test in both languages (pip install playwright pyguitarpro)."""
import os, re, sys, guitarpro as gp
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = 'file://' + os.path.join(HERE, '..', 'dist', 'index.html')
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    for lang in ['en', 'th']:
        ctx = b.new_context(locale='th-TH' if lang == 'th' else 'en-US', viewport={'width': 1300, 'height': 900}, accept_downloads=True)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(PAGE); pg.wait_for_timeout(1200)
        txt = pg.inner_text('body')
        thai = [w for w in re.findall('[ก-๙]+', txt) if w != 'ไทย']
        print(lang, 'status:', pg.inner_text('#status'))
        if lang == 'en' and thai: ok = False; print('  Thai text left in EN:', thai[:10])
        pg.click('#tabTxt'); pg.fill('#ascii', open(os.path.join(HERE, 'ascii_fx.txt')).read()); pg.click('#parseTxt'); pg.wait_for_timeout(300)
        print('  ', pg.inner_text('#status'))
        pg.click('#tabImg'); pg.set_input_files('#file', [os.path.join(HERE, 'images', 'printed_carlito.png')]); pg.wait_for_timeout(400)
        pg.click('#runOcr'); pg.wait_for_function("!document.getElementById('runOcr').disabled", timeout=20000)
        print('  ', pg.inner_text('#status'))
        pg.click('.beat[data-i="0"] .cell[data-s="1"]'); pg.keyboard.press('b')
        with pg.expect_download() as dl: pg.click('#dl')
        out = os.path.join(HERE, 'out', f'ui_{lang}.gp5'); dl.value.save_as(out)
        s = gp.parse(out); print('   gp5 bars:', len(s.tracks[0].measures))
        # switch language live
        other = 'th' if lang == 'en' else 'en'
        pg.click(f'.lang button[data-lang="{other}"]'); pg.wait_for_timeout(200)
        print('   switched ->', other, '|', pg.inner_text('#s2'), '|', pg.inner_text('#status')[:60])
        if errs: ok = False; print('  errors', errs)
        ctx.close()
    b.close()
print('OK' if ok else 'FAIL'); sys.exit(0 if ok else 1)
