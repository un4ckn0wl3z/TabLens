"""Build TabLens into single-file pages.

  dist/index.html     standalone page (open directly in a browser / GitHub Pages)
  dist/artifact.html  body-only page for publishing as a claude.ai Artifact
"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
page = (src / 'shell.html').read_text(encoding='utf-8')
for key, name, mod in [('I18N', 'i18n.js', 'I18N'), ('GP5', 'gp5writer.js', 'GP5'), ('OCR', 'tabocr.js', 'TabOCR'), ('APP', 'app.js', None)]:
    code = (src / name).read_text(encoding='utf-8')
    if mod:
        code = code.replace(f"if (typeof module !== 'undefined') module.exports = {mod};", '')
    page = page.replace(f'/*{key}*/', code)
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'artifact.html').write_text(page, encoding='utf-8')
(dist / 'index.html').write_text('<!doctype html>\n<html lang="th"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n'
    + page + '\n</body></html>\n', encoding='utf-8')
print('built', dist / 'index.html', len(page), 'bytes')
