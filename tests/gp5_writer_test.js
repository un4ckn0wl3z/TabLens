const GP5=require('../src/gp5writer.js');const fs=require('fs');
const song={title:'Test',artist:'Me',tempo:100,tracks:[{name:'Guitar',tuning:[64,59,55,50,45,40],measures:[
{num:4,den:4,beats:[{dur:4,notes:[{string:1,fret:0},{string:2,fret:3}]},{dur:8,dotted:true,notes:[{string:6,fret:12}]},{dur:16,notes:[{string:3,fret:5,type:'dead'}]},{dur:2,rest:true}]},
{num:4,den:4,beats:[{dur:8,tuplet:3,notes:[{string:5,fret:2}]},{dur:8,tuplet:3,notes:[{string:5,fret:2,type:'tie'}]},{dur:8,tuplet:3,notes:[{string:4,fret:7}]},{dur:1,rest:true}]}]}]};
fs.writeFileSync(__dirname+'/out/js.gp5',GP5.write(song));
