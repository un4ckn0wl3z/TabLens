"""OCR accuracy benchmark on synthetic tab images (pip install playwright; playwright install chromium)."""
import json, sys, asyncio
from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__))
truth=json.load(open(os.path.join(HERE,'truth.json')))
files=sys.argv[1:] or list(truth)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files'])
    pg=b.new_page(); pg.on('console', lambda m: print('console:', m.text))
    pg.goto('file://'+HERE+'/harness.html')
    for f in files:
        r=pg.evaluate('u=>runOne(u)', 'file://'+HERE+'/images/'+f)
        T=[[{k:str(v) for k,v in bt.items()} for bt in m] for m in truth[f]]
        got=r['ms']
        nT=sum(len(bt) for m in T for bt in m)
        # flatten compare beat sequences
        ft=[bt for m in T for bt in m]; fg=[bt for m in got for bt in m]
        import difflib
        sm=difflib.SequenceMatcher(a=[json.dumps(x,sort_keys=True) for x in ft], b=[json.dumps(x,sort_keys=True) for x in fg])
        ok=sum(bl.size for bl in sm.get_matching_blocks())
        print(f"{f}: measures {len(got)}/{len(T)} beats ok {ok}/{len(ft)} (got {len(fg)}) staves {r['staves']} bars {r['bars']} angle {r['angle']} scale {r['scale']:.2f} t {r['ms_time']:.0f}ms")
        if ok<len(ft):
            for op in sm.get_opcodes():
                if op[0]!='equal': print('  ',op[0], ft[op[1]:op[2]][:6], '->', fg[op[3]:op[4]][:6])
    b.close()
