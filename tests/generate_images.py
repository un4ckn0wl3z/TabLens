"""Generates the synthetic test images in tests/images and tests/truth.json."""
import os; os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)),"images"),exist_ok=True); os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),"images"))
import random, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
random.seed(3)
def rand_song(nmeas=8):
    ms=[]
    for m in range(nmeas):
        beats=[]
        for b in range(random.choice([4,6,8])):
            k=random.choice([1,1,1,2,3]) if random.random()<0.3 else 1
            strs=random.sample(range(6),k)
            beats.append({s:(random.choice(['x']) if random.random()<0.04 else random.choice([0,1,2,3,4,5,7,8,9,10,12,15,17,24] if True else [])) for s in strs})
        ms.append(beats)
    return ms

def printed(ms, font, fname, per_line=4, notation=True, size=(1600,None), fs=26, sp=24, rot=0, noise=False, gray_lines=False):
    W=size[0]; lines=(len(ms)+per_line-1)//per_line
    H=60+lines*(sp*5+ (sp*4+60 if notation else 0) + 110)
    im=Image.new('L',(W,H),255); d=ImageDraw.Draw(im); f=ImageFont.truetype(font,fs)
    y=50; lc = 150 if gray_lines else 0
    for li in range(lines):
        if notation:
            for k in range(5): d.line([(40,y+k*12),(W-40,y+k*12)],fill=0,width=1)
            y+=48+60
        x0,x1=40,W-40
        for k in range(6): d.line([(x0,y+k*sp),(x1,y+k*sp)],fill=lc,width=2 if not gray_lines else 1)
        d.text((x0+6,y+sp*1.5),'T',font=f,fill=0,anchor='mm'); d.text((x0+6,y+sp*2.5),'A',font=f,fill=0,anchor='mm'); d.text((x0+6,y+sp*3.5),'B',font=f,fill=0,anchor='mm')
        chunk=ms[li*per_line:(li+1)*per_line]
        mw=(x1-x0-40)/per_line
        d.line([(x0,y),(x0,y+5*sp)],fill=0,width=2)
        for mi,beats in enumerate(chunk):
            mx=x0+40+mi*mw
            for bi,b in enumerate(beats):
                bx=mx+ (bi+0.5)*mw/len(beats)
                for s,v in b.items():
                    t=str(v); bb=d.textbbox((bx,y+s*sp),t,font=f,anchor='mm')
                    d.rectangle([bb[0]-2,y+s*sp-sp*0.4,bb[2]+2,y+s*sp+sp*0.4],fill=255)
                    d.text((bx,y+s*sp),t,font=f,fill=0,anchor='mm')
                d.line([(bx,y+5*sp+8),(bx,y+5*sp+40)],fill=0,width=2) # rhythm stem
            d.line([(mx+mw,y),(mx+mw,y+5*sp)],fill=0,width=2)
        y+=5*sp+110
    if rot: im=im.rotate(rot,expand=True,fillcolor=255,resample=Image.BICUBIC)
    if noise:
        im=im.filter(ImageFilter.GaussianBlur(0.8))
        px=im.load()
        for i in range(20000):
            x=random.randrange(im.width); yy=random.randrange(im.height); px[x,yy]=max(0,px[x,yy]-random.randint(0,60))
    im.save(fname)

def ascii_tab(ms, fname, per_line=3, font='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', fs=16, dark=False):
    names=['e','B','G','D','A','E']; out=[]
    for li in range(0,len(ms),per_line):
        rows=[n+'|' for n in names]
        for beats in ms[li:li+per_line]:
            for r in range(6): rows[r]+='-'
            for b in beats:
                w=max([len(str(v)) for v in b.values()]+[1])
                for r in range(6):
                    t=str(b.get(r,'')); rows[r]+=t+'-'*(w-len(t))+'--'
            for r in range(6): rows[r]+='|'
        out+=rows+['']
    text='\n'.join(out)
    f=ImageFont.truetype(font,fs)
    bb=ImageDraw.Draw(Image.new('L',(10,10))).multiline_textbbox((0,0),text,font=f)
    im=Image.new('L',(bb[2]+40,bb[3]+40),30 if dark else 255)
    ImageDraw.Draw(im).multiline_text((20,20),text,font=f,fill=220 if dark else 0,spacing=4)
    im.save(fname); return text

truth={}
ms=rand_song(8); truth['printed_carlito.png']=ms; printed(ms,'/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf','printed_carlito.png')
ms=rand_song(8); truth['printed_inter_rot.png']=ms; printed(ms,'/usr/share/fonts/opentype/inter/Inter-Regular.otf','printed_inter_rot.png',rot=1.5,noise=True,fs=22)
ms=rand_song(8); truth['printed_charter_gray.png']=ms; printed(ms,'/usr/share/fonts/X11/Type1/c0648bt_.pfb','printed_charter_gray.png',notation=False,gray_lines=True,fs=24,sp=20)
ms=rand_song(6); truth['ascii_dejavu.png']=ms; t=ascii_tab(ms,'ascii_dejavu.png'); open('../ascii_dejavu.txt','w').write(t)
ms=rand_song(6); truth['ascii_courier_dark.png']=ms; ascii_tab(ms,'ascii_courier_dark.png',font='/usr/share/fonts/X11/Type1/c0419bt_.pfb',fs=18,dark=True)
ms=rand_song(6); truth['ascii_small.png']=ms; ascii_tab(ms,'ascii_small.png',font='/usr/share/fonts/truetype/freefont/FreeMono.ttf',fs=12)
json.dump({k:[[{str(s):v for s,v in b.items()} for b in m] for m in v] for k,v in truth.items()},open('../truth.json','w'))
