"""Regenerates the README screenshots in docs/screenshots (pip install playwright)."""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'index.html')
OUT = os.path.join(ROOT, 'docs', 'screenshots'); os.makedirs(OUT, exist_ok=True)
T = os.path.join(ROOT, 'tests')

def edit_view(pg, name):
    a = pg.evaluate("(()=>{const t=document.getElementById('toolbar').getBoundingClientRect(), m=document.getElementById('measures').getBoundingClientRect(), s=document.getElementById('s2').closest('section').getBoundingClientRect();return [s.left+scrollX, s.top+scrollY, s.width, m.bottom-s.top]})()")
    pg.screenshot(path=os.path.join(OUT, name), full_page=True, clip={'x': a[0]-8, 'y': a[1]-8, 'width': a[2]+16, 'height': a[3]+24})

with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    for lang in ['en', 'th']:
        ctx = b.new_context(locale='en-US' if lang == 'en' else 'th-TH', viewport={'width': 1280, 'height': 860}, device_scale_factor=1.5, accept_downloads=True)
        pg = ctx.new_page(); pg.goto(PAGE); pg.wait_for_timeout(1500)
        pg.screenshot(path=os.path.join(OUT, f'overview-{lang}.png'))
        if lang == 'en':
            # image OCR on a tilted, noisy page
            pg.set_input_files('#file', [os.path.join(T, 'images', 'printed_inter_rot.png')]); pg.wait_for_timeout(400)
            pg.click('#runOcr'); pg.wait_for_function("!document.getElementById('runOcr').disabled", timeout=20000)
            pg.click('.beat[data-i="2"] .d')
            sec = "document.getElementById('s1').closest('section')"
            r = pg.evaluate(f"(()=>{{const r={sec}.getBoundingClientRect();return [r.left+scrollX,r.top+scrollY,r.width,r.height]}})()")
            pg.screenshot(path=os.path.join(OUT, 'import-ocr.png'), full_page=True, clip={'x': r[0]-8, 'y': r[1]-8, 'width': r[2]+16, 'height': r[3]+16})
            # techniques from a text tab
            pg.click('#tabTxt'); pg.fill('#ascii', open(os.path.join(T, 'ascii_fx.txt')).read()); pg.click('#parseTxt'); pg.wait_for_timeout(300)
            pg.fill('#title', 'Technique demo')
            pg.click('.beat[data-i="5"] .cell[data-s="2"]'); pg.keyboard.press('v'); pg.wait_for_timeout(150)
            pg.click('.beat[data-i="5"] .cell[data-s="2"]'); pg.wait_for_timeout(150)
            edit_view(pg, 'editor-techniques.png')
        ctx.close()
    ctx = b.new_context(locale='en-US', viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme='dark')
    pg = ctx.new_page(); pg.goto(PAGE); pg.wait_for_timeout(1500)
    pg.screenshot(path=os.path.join(OUT, 'mobile-dark.png'))
    ctx.close(); b.close()
print('screenshots ->', OUT)
