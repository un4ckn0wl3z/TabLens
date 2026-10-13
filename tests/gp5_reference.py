import guitarpro as gp, sys
song = gp.Song()
song.title='Test'; song.artist='Me'; song.tempo=100
song.version = 'FICHIER GUITAR PRO v5.00'
track = song.tracks[0]; track.name='Guitar'
track.channel.channel=0; track.channel.effectChannel=1
# 2 measures
h2 = gp.MeasureHeader(number=2, start=song.measureHeaders[0].start+3840)
song.addMeasureHeader(h2)
track.measures.append(gp.Measure(track, h2))
def beat(voice, dur, notes, rest=False, dotted=False, tup=None):
    b = gp.Beat(voice)
    b.duration = gp.Duration(value=dur, isDotted=dotted)
    if tup: b.duration.tuplet = gp.Tuplet(tup, 2)
    b.status = gp.BeatStatus.rest if rest else gp.BeatStatus.normal
    for s,f,t in notes:
        n = gp.Note(b, value=f, string=s, type=t); b.notes.append(n)
    voice.beats.append(b)
v = track.measures[0].voices[0]
beat(v,4,[(1,0,gp.NoteType.normal),(2,3,gp.NoteType.normal)])
beat(v,8,[(6,12,gp.NoteType.normal)],dotted=True)
beat(v,16,[(3,5,gp.NoteType.dead)])
beat(v,2,[],rest=True)
v2 = track.measures[1].voices[0]
beat(v2,8,[(5,2,gp.NoteType.normal)],tup=3)
beat(v2,8,[(5,2,gp.NoteType.tie)],tup=3)
beat(v2,8,[(4,7,gp.NoteType.normal)],tup=3)
beat(v2,1,[],rest=True)
import os; gp.write(song, os.path.join(os.path.dirname(__file__),'out','ref.gp5'), version=(5,0,0))
