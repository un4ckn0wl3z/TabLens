const GP5=require('../src/gp5writer.js');const fs=require('fs');
const N=(string,fret,fx,type)=>({string,fret,fx,type});
const beats=[N(3,7,{bend:{type:'bend',amt:100}}),N(3,7,{bend:{type:'bendRelease',amt:50},vib:true}),N(2,5,{hammer:true}),N(2,7,{slide:'legato'}),
N(6,0,{pm:true,stac:true}),N(1,12,{harm:'N',lr:true}),N(4,5,{harm:'A'}),N(5,3,{trem:32,acc:1}),N(5,3,{ghost:true,acc:2,harm:'P'}),N(4,2,{slide:'outDown'})].map(n=>({dur:16,notes:[n]}));
beats.push({dur:4,dotted:true,notes:[{string:5,fret:0,type:'tie'}]});
fs.writeFileSync(__dirname+'/out/js_fx.gp5',GP5.write({title:'FX',tempo:100,tracks:[{name:'Guitar',tuning:[64,59,55,50,45,40],measures:[{num:4,den:4,beats}]}]}));
