import guitarpro as gp
song=gp.Song(); song.title='FX'; song.tempo=100; song.version='FICHIER GUITAR PRO v5.00'
tr=song.tracks[0]; tr.name='Guitar'; tr.channel.channel=0; tr.channel.effectChannel=1
v=tr.measures[0].voices[0]
def bend(t,val):
    P={'bend':[(0,0),(15,val),(60,val)],'bendRelease':[(0,0),(12,val),(24,val),(36,0),(60,0)],'prebend':[(0,val),(60,val)],'prebendRelease':[(0,val),(15,val),(30,0),(60,0)]}[t]
    T={'bend':1,'bendRelease':2,'prebend':4,'prebendRelease':5}[t]
    # write raw: position*60/12 and value*25/1 -> give points pre-divided
    return gp.BendEffect(type=gp.BendType(T), value=val, points=[gp.BendPoint(position=p*12/60, value=q/25) for p,q in P])
specs=[
 (3,7,dict(bend=bend('bend',100))),
 (3,7,dict(bend=bend('bendRelease',50),vibrato=True)),
 (2,5,dict(hammer=True)),
 (2,7,dict(slides=[gp.SlideType.legatoSlideTo])),
 (6,0,dict(palmMute=True,staccato=True)),
 (1,12,dict(harmonic=gp.NaturalHarmonic(),letRing=True)),
 (4,5,dict(harmonic=gp.ArtificialHarmonic(pitch=gp.PitchClass((50+5)%12),octave=gp.Octave.ottava))),
 (5,3,dict(tremoloPicking=gp.TremoloPickingEffect(duration=gp.Duration(32)), accentuatedNote=True)),
 (5,3,dict(ghostNote=True, heavyAccentuatedNote=True, harmonic=gp.PinchHarmonic())),
 (4,2,dict(slides=[gp.SlideType.outDownwards])),
]
for s,f,fx in specs:
    b=gp.Beat(v); b.duration=gp.Duration(value=16); b.status=gp.BeatStatus.normal
    n=gp.Note(b,value=f,string=s,type=gp.NoteType.normal)
    for k,val in fx.items(): setattr(n.effect,k,val)
    b.notes.append(n); v.beats.append(b)
b=gp.Beat(v); b.duration=gp.Duration(value=4,isDotted=True); b.status=gp.BeatStatus.normal
b.notes.append(gp.Note(b,value=0,string=5,type=gp.NoteType.tie)); v.beats.append(b)
import os; gp.write(song,os.path.join(os.path.dirname(__file__),'out','ref_fx.gp5'),version=(5,0,0))
