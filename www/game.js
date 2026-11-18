/*
 * ブロッコリー・サバイバー
 * 畑を守る害虫ローグライト（Claude のチャットで作ったものを取り込み）
 */
"use strict";
// ================= 基本 =================
const $=s=>document.querySelector(s);
const cv=$('#c'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,SAT=0,SAB=0;
const saT=document.createElement('div');saT.style.cssText='position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';document.body.appendChild(saT);
const saB=document.createElement('div');saB.style.cssText='position:fixed;bottom:0;left:0;width:1px;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';document.body.appendChild(saB);
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;
 cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);
 SAT=saT.getBoundingClientRect().height||0;SAB=saB.getBoundingClientRect().height||0;}
addEventListener('resize',resize);resize();
const rand=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;
const fmt=s=>{s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function show(id){$('#'+id).classList.add('show');}
function hide(id){$('#'+id).classList.remove('show');}
function vib(ms){try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}}

// ================= セーブ =================
const SKEY='broccoli_survivor_v1';
const save={fert:0,best:0,clears:0,chars:['broc'],sel:'broc',sfx:true,up:{hp:0,dmg:0,spd:0,magnet:0,reroll:0}};
try{const s=JSON.parse(localStorage.getItem(SKEY));if(s){const up=Object.assign({},save.up,s.up||{});Object.assign(save,s);save.up=up;}}catch(e){}
function persist(){try{localStorage.setItem(SKEY,JSON.stringify(save))}catch(e){}}

// ================= 効果音 =================
let AC=null,lastPop=0,lastPick=0;
function initAudio(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){}}
function sfx(type){if(!save.sfx||!AC)return;try{const n=AC.currentTime;
 if(type==='pop'){if(n-lastPop<0.06)return;lastPop=n;}
 if(type==='pick'){if(n-lastPick<0.04)return;lastPick=n;}
 const P={pop:['square',520,180,.07,.04],hurt:['sawtooth',220,70,.22,.12],lvl:['triangle',440,990,.3,.12],pick:['sine',900,1400,.05,.03],boom:['sawtooth',140,40,.3,.08],win:['triangle',523,1046,.6,.14]}[type];
 const o=AC.createOscillator(),g=AC.createGain();o.type=P[0];o.frequency.setValueAtTime(P[1],n);o.frequency.exponentialRampToValueAtTime(P[2],n+P[3]);
 g.gain.setValueAtTime(P[4],n);g.gain.exponentialRampToValueAtTime(0.0001,n+P[3]);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+P[3]+.02);}catch(e){}}

// ================= データ =================
const CHARS=[
 {id:'broc',name:'ブロッコリー',desc:'バランス型。タネ・ショットで開始。',weapon:'seed',hp:100,spd:1,cost:0},
 {id:'roma',name:'ロマネスコ',desc:'フラクタルの戦士。回転フローレットで開始。足が速い。',weapon:'orbit',hp:85,spd:1.12,cost:80},
 {id:'cauli',name:'カリフラワー',desc:'白くてタフ。ドレッシング・オーラで開始。HP高め。',weapon:'aura',hp:140,spd:.92,cost:150},
];
const WDEF={
 seed:{name:'タネ・ショット',icon:'🌱'},
 orbit:{name:'回転フローレット',icon:'🥦'},
 aura:{name:'ドレッシング・オーラ',icon:'🫧'},
 bomb:{name:'房バクダン',icon:'💣'},
 leaf:{name:'葉っぱブーメラン',icon:'🍃'},
};
const WMAX=6;
const WS={
 seed:l=>({cd:[.6,.52,.5,.42,.4,.32][l-1],n:[1,1,2,2,3,4][l-1],dmg:[11,14,14,17,18,22][l-1],pierce:l>=5?2:1}),
 orbit:l=>({n:[1,2,2,3,4,5][l-1],dmg:[8,9,13,14,16,20][l-1],R:[58,60,70,72,76,80][l-1],sp:l>=6?4.3:3.2}),
 aura:l=>({R:[55,65,75,85,95,110][l-1],dmg:[4,6,8,10,12,15][l-1],slow:[.75,.72,.68,.62,.6,.55][l-1]}),
 bomb:l=>({cd:[3,2.8,2.6,2.4,2,1.8][l-1],n:[1,1,1,2,2,3][l-1],dmg:[25,30,40,45,55,65][l-1],R:[55,68,72,78,85,95][l-1]}),
 leaf:l=>({cd:[2,1.8,1.7,1.5,1.4,1.2][l-1],n:[1,1,2,2,3,4][l-1],dmg:[14,20,22,24,28,34][l-1],sp:[430,450,460,520,540,560][l-1]}),
};
const WDESC={
 seed:['近くの敵にタネを連射','ダメージ↑ 連射↑','タネ+1','ダメージ↑ 連射↑','タネ+1 貫通+1','タネ+1 大幅強化'],
 orbit:['まわりを回るフローレットで攻撃','フローレット+1','ダメージ↑ 範囲↑','フローレット+1','フローレット+1','フローレット+1 回転↑'],
 aura:['近くの敵にダメージ＆減速','範囲↑ ダメージ↑','範囲↑ ダメージ↑','範囲↑ 減速↑','範囲↑ ダメージ↑','最大強化'],
 bomb:['敵の群れに房バクダンを投げる','爆発範囲↑','ダメージ↑','2個投げる','クールダウン↓','3個投げる'],
 leaf:['敵を貫通する葉っぱブーメラン','ダメージ↑','葉っぱ+1','スピード↑','葉っぱ+1','葉っぱ+1 ダメージ↑'],
};
const PDEF={
 hp:{name:'たっぷりの水',icon:'💧',max:5,desc:'最大HP+20（その分回復）'},
 spd:{name:'しなやかな茎',icon:'💨',max:5,desc:'移動速度+10%'},
 dmg:{name:'有機肥料',icon:'🧪',max:5,desc:'すべてのダメージ+12%'},
 cd:{name:'光合成',icon:'☀️',max:5,desc:'クールダウン-8%'},
 magnet:{name:'ミツバチの友',icon:'🐝',max:5,desc:'光の粒の吸い寄せ範囲+30%'},
 regen:{name:'朝露',icon:'🌙',max:5,desc:'毎秒HPが0.4回復'},
 armor:{name:'かたい茎',icon:'🛡️',max:5,desc:'受けるダメージ-1'},
};
const UPG={
 hp:{name:'丈夫な根',icon:'🌳',desc:'最大HP+10',max:5,base:15},
 dmg:{name:'栄養たっぷり',icon:'🧪',desc:'ダメージ+5%',max:5,base:20},
 spd:{name:'すばやい足',icon:'💨',desc:'移動速度+4%',max:5,base:15},
 magnet:{name:'甘い香り',icon:'🐝',desc:'吸い寄せ範囲+15%',max:3,base:20},
 reroll:{name:'種の袋',icon:'🎲',desc:'レベルアップ時のリロール+1',max:3,base:30},
};
const ETYPES={
 aphid:{r:9,hp:8,spd:72,dmg:6,xp:1,col:'#c3e24c'},
 cater:{r:12,hp:26,spd:52,dmg:10,xp:2,col:'#86cc45'},
 beetle:{r:11,hp:20,spd:85,dmg:8,xp:2,col:'#2f9f94'},
 slug:{r:16,hp:70,spd:32,dmg:14,xp:4,col:'#c99d72'},
 boss:{r:42,hp:2000,spd:48,dmg:25,xp:60,col:'#8a5a2b'},
};

// ================= 状態 =================
let state='title',G=null,P=null;
const xpNeed=l=>Math.floor(3+l*2+l*l*0.18);

function recalc(init){
 const ch=G.ch,p=G.p,u=save.up,old=P.maxHp||0;
 P.maxHp=ch.hp+u.hp*10+(p.hp||0)*20;
 P.spd=150*ch.spd*(1+.04*u.spd)*(1+.1*(p.spd||0));
 P.dmgMul=(1+.05*u.dmg)*(1+.12*(p.dmg||0));
 P.cdMul=Math.pow(.92,p.cd||0);
 P.magnet=85*(1+.15*u.magnet)*(1+.3*(p.magnet||0));
 P.regen=.4*(p.regen||0);
 P.armor=p.armor||0;
 if(!init&&P.maxHp>old)P.hp+=P.maxHp-old;
}

function startRun(){
 initAudio();
 const ch=CHARS.find(c=>c.id===save.sel)||CHARS[0];
 G={time:0,ch,en:[],bul:[],gems:[],items:[],parts:[],txt:[],fx:[],orb:[],w:{},p:{},kills:0,spawnT:0,pendingLv:0,
  rerolls:save.up.reroll,nid:1,ev:{},shake:0,banner:null,boss:null,endT:-1,win:false};
 P={x:0,y:0,r:16,hp:0,maxHp:0,lvl:1,xp:0,next:xpNeed(1),invT:0,face:0,moving:false};
 G.w[ch.weapon]={lv:1,t:.3,tick:0};
 recalc(true);P.hp=P.maxHp;
 ['title','shop','over','pause','lvup'].forEach(hide);
 $('#pbtn').style.display='block';
 joy.active=false;state='play';last=performance.now();
}

// ================= 入力 =================
const joy={active:false,id:null,ox:0,oy:0,x:0,y:0};
const keys={};
// タッチとマウスをまとめて Pointer Events で扱う（最初に触れた1本の指／マウスでスティック操作）
cv.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='play'||joy.active)return;
 joy.active=true;joy.id=e.pointerId;joy.ox=joy.x=e.clientX;joy.oy=joy.y=e.clientY;
 try{cv.setPointerCapture(e.pointerId);}catch(err){}});
addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY;}});
const pend=e=>{if(e.pointerId===joy.id){joy.active=false;joy.id=null;}};
addEventListener('pointerup',pend);addEventListener('pointercancel',pend);
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Escape'&&state==='play')pauseGame();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pauseGame();});

// ================= 空間グリッド =================
const CELL=64,grid=new Map();
const gk=(x,y)=>x*100003+y;
function buildGrid(){grid.clear();for(const e of G.en){if(e.dead)continue;const k=gk(Math.floor(e.x/CELL),Math.floor(e.y/CELL));let a=grid.get(k);if(!a){a=[];grid.set(k,a);}a.push(e);}}
function query(x,y,r){const out=[];r+=44;const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),y0=Math.floor((y-r)/CELL),y1=Math.floor((y+r)/CELL);
 for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){const a=grid.get(gk(cx,cy));if(a)for(const e of a)if(!e.dead)out.push(e);}return out;}

// ================= 敵 =================
function spawnR(){return Math.hypot(W,H)/2+50;}
function spawnEnemy(type,x,y){
 const d=ETYPES[type],sc=type==='boss'?1:1+G.time/110;
 if(x==null){const a=Math.random()*TAU,R=spawnR();x=P.x+Math.cos(a)*R;y=P.y+Math.sin(a)*R;}
 const e={id:G.nid++,type,x,y,r:d.r,hp:d.hp*sc,spd:d.spd*rand(.9,1.1),dmg:d.dmg*(1+G.time/300),xp:d.xp,col:d.col,
  ang:0,flash:0,oh:0,kx:0,ky:0,slow:1,st:rand(1,3),dash:0,warn:0,dang:0};
 e.maxHp=e.hp;G.en.push(e);return e;
}
function makeElite(e){e.r*=1.7;e.hp*=12;e.maxHp=e.hp;e.xp*=6;e.elite=true;e.spd*=1.1;}

function spawner(dt){
 const t=G.time;
 if(t>=100&&!G.ev.e1){G.ev.e1=1;makeElite(spawnEnemy('slug'));banner('強いナメクジが来た！');}
 if(t>=190&&!G.ev.e2){G.ev.e2=1;makeElite(spawnEnemy('cater'));makeElite(spawnEnemy('beetle'));banner('強敵が2体！');}
 for(const s of [55,125,175]){if(t>=s&&!G.ev['s'+s]){G.ev['s'+s]=1;const n=18,R=spawnR()*.85,ty=s>150?'beetle':'aphid';
  for(let i=0;i<n;i++){const a=i/n*TAU;spawnEnemy(ty,P.x+Math.cos(a)*R,P.y+Math.sin(a)*R);}banner('囲まれた！');}}
 if(t>=240&&!G.ev.boss){G.ev.boss=1;const e=spawnEnemy('boss');e.maxHp=e.hp;G.boss=e;banner('👑 ヨトウムシ王 出現！',3);vib([60,40,60]);}
 G.spawnT-=dt;
 if(G.spawnT<=0){
  let rate=.9+t/24;if(G.boss)rate*=.45;
  G.spawnT=1/rate;
  if(G.en.length>=230)return;
  const r=Math.random();let ty='aphid';
  if(t<30)ty='aphid';
  else if(t<75)ty=r<.7?'aphid':'cater';
  else if(t<130)ty=r<.45?'aphid':r<.75?'cater':'beetle';
  else ty=r<.35?'aphid':r<.6?'cater':r<.8?'beetle':'slug';
  spawnEnemy(ty);
 }
}

function damageEnemy(e,d,nx,ny,kb){
 if(e.dead)return;d*=P.dmgMul*rand(.9,1.1);e.hp-=d;e.flash=.08;
 const k=e.type==='boss'?.08:e.elite?.3:1;e.kx+=nx*kb*k;e.ky+=ny*kb*k;
 if(G.txt.length<70)G.txt.push({x:e.x+rand(-6,6),y:e.y-e.r,v:Math.max(1,Math.round(d)),life:.6});
 if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
 e.dead=true;G.kills++;sfx('pop');
 for(let i=0;i<(e.boss||e.type==='boss'?40:6);i++)addPart(e.x,e.y,e.col,rand(60,200),rand(2,4));
 if(G.gems.length>350){G.gems[Math.floor(Math.random()*G.gems.length)].v+=e.xp;}
 else G.gems.push({x:e.x,y:e.y,v:e.xp,mag:false,sp:0});
 if(Math.random()<.012)G.items.push({x:e.x,y:e.y,kind:'heal',mag:false,sp:0});
 if(e.elite)G.items.push({x:e.x,y:e.y,kind:'chest',mag:false,sp:0});
 if(e.type==='boss'){G.boss=null;G.win=true;G.endT=2;banner('収穫成功！ 🎉',3);sfx('win');vib([80,50,120]);
  for(const o of G.en)if(!o.dead&&o!==e){o.dead=true;addPart(o.x,o.y,o.col,120,3);}}
}
function addPart(x,y,col,sp,r){if(G.parts.length>320)return;const a=Math.random()*TAU;G.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.45,max:.45,col,r});}
function banner(txt,d){G.banner={txt,t:d||2.2};}

// ================= 武器 =================
function nearestEnemy(maxD){let best=null,bd=maxD*maxD;for(const e of G.en){if(e.dead)continue;const dx=e.x-P.x,dy=e.y-P.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=e;}}return best;}
function updateWeapons(dt){
 G.orb.length=0;
 for(const k in G.w){
  const w=G.w[k],s=WS[k](w.lv);
  if(k==='seed'){w.t-=dt;if(w.t<=0){const bs=G.boss,tg=(bs&&Math.random()<.5&&Math.hypot(bs.x-P.x,bs.y-P.y)<430)?bs:nearestEnemy(430);
   if(tg){const a=Math.atan2(tg.y-P.y,tg.x-P.x);for(let i=0;i<s.n;i++){const aa=a+(i-(s.n-1)/2)*.14;
     G.bul.push({k:'seed',x:P.x,y:P.y,vx:Math.cos(aa)*400,vy:Math.sin(aa)*400,r:5,dmg:s.dmg,pierce:s.pierce,life:1.3,hit:new Set()});}
    w.t=s.cd*P.cdMul;}else w.t=.1;}}
  else if(k==='orbit'){w.t=(w.t||0)+dt*s.sp;
   for(let i=0;i<s.n;i++){const a=w.t+i/s.n*TAU,x=P.x+Math.cos(a)*s.R,y=P.y+Math.sin(a)*s.R;G.orb.push({x,y,a});
    for(const e of query(x,y,12)){if(e.oh>0)continue;const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<(e.r+11)**2){e.oh=.35;const d=Math.hypot(e.x-P.x,e.y-P.y)||1;damageEnemy(e,s.dmg,(e.x-P.x)/d,(e.y-P.y)/d,220);}}}}
  else if(k==='aura'){w.tick-=dt;const hit=w.tick<=0;if(hit)w.tick=.45;w.R=s.R;
   for(const e of query(P.x,P.y,s.R)){const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy);if(d<s.R+e.r){e.slow=Math.min(e.slow,s.slow);if(hit)damageEnemy(e,s.dmg,dx/(d||1),dy/(d||1),60);}}}
  else if(k==='bomb'){w.t-=dt;if(w.t<=0){const c=G.en.filter(e=>!e.dead&&Math.abs(e.x-P.x)<W/2+20&&Math.abs(e.y-P.y)<H/2+20);
   if(c.length){for(let i=0;i<s.n;i++){const tg=c[Math.floor(Math.random()*c.length)];
     G.bul.push({k:'bomb',sx:P.x,sy:P.y,tx:tg.x+rand(-15,15),ty:tg.y+rand(-15,15),t:-i*.12,dur:.55,R:s.R,dmg:s.dmg,x:P.x,y:P.y});}
    w.t=s.cd*P.cdMul;}else w.t=.2;}}
  else if(k==='leaf'){w.t-=dt;if(w.t<=0){const tg=nearestEnemy(500);const base=tg?Math.atan2(tg.y-P.y,tg.x-P.x):P.face;
   for(let i=0;i<s.n;i++){const a=base+i/s.n*TAU;G.bul.push({k:'leaf',x:P.x,y:P.y,dx:Math.cos(a),dy:Math.sin(a),sp:s.sp,dmg:s.dmg,t:0,rot:0,ret:false,hm:new Map()});}
   w.t=s.cd*P.cdMul;}}
 }
}
function updateBullets(dt){
 for(const b of G.bul){
  if(b.k==='seed'){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0){b.dead=true;continue;}
   for(const e of query(b.x,b.y,b.r)){if(b.hit.has(e.id))continue;const dx=e.x-b.x,dy=e.y-b.y;
    if(dx*dx+dy*dy<(e.r+b.r)**2){b.hit.add(e.id);damageEnemy(e,b.dmg,b.vx/400,b.vy/400,90);if(--b.pierce<=0){b.dead=true;break;}}}}
  else if(b.k==='leaf'){b.t+=dt;b.rot+=dt*16;b.sp-=760*dt;
   if(b.sp>0){b.x+=b.dx*b.sp*dt;b.y+=b.dy*b.sp*dt;}
   else{const dx=P.x-b.x,dy=P.y-b.y,d=Math.hypot(dx,dy)||1,v=Math.min(650,-b.sp+80);b.x+=dx/d*v*dt;b.y+=dy/d*v*dt;if(d<22||b.t>4){b.dead=true;continue;}}
   for(const e of query(b.x,b.y,12)){const lt=b.hm.get(e.id);if(lt!=null&&G.time-lt<.4)continue;const dx=e.x-b.x,dy=e.y-b.y;
    if(dx*dx+dy*dy<(e.r+12)**2){b.hm.set(e.id,G.time);const d=Math.hypot(dx,dy)||1;damageEnemy(e,b.dmg,dx/d,dy/d,140);}}}
  else if(b.k==='bomb'){b.t+=dt;if(b.t<0){b.x=P.x;b.y=P.y;b.sx=P.x;b.sy=P.y;continue;}const f=Math.min(1,b.t/b.dur);
   b.x=b.sx+(b.tx-b.sx)*f;b.y=b.sy+(b.ty-b.sy)*f-Math.sin(Math.PI*f)*70;
   if(f>=1){b.dead=true;sfx('boom');G.shake=Math.max(G.shake,4);G.fx.push({x:b.tx,y:b.ty,R:b.R,life:.35,max:.35});
    for(let i=0;i<14;i++)addPart(b.tx,b.ty,i%2?'#7ccf4a':'#ffe066',rand(80,260),rand(2,5));
    for(const e of query(b.tx,b.ty,b.R)){const dx=e.x-b.tx,dy=e.y-b.ty,d=Math.hypot(dx,dy);if(d<b.R+e.r)damageEnemy(e,b.dmg,dx/(d||1),dy/(d||1),260);}}}
 }
 G.bul=G.bul.filter(b=>!b.dead);
}

// ================= 更新 =================
function update(dt){
 G.time+=dt;
 // 入力
 let ix=0,iy=0;
 if(joy.active){let dx=joy.x-joy.ox,dy=joy.y-joy.oy,l=Math.hypot(dx,dy);
  if(l>60){joy.ox=joy.x-dx/l*60;joy.oy=joy.y-dy/l*60;dx=joy.x-joy.ox;dy=joy.y-joy.oy;l=60;}
  if(l>6){const m=Math.min(1,l/45);ix=dx/l*m;iy=dy/l*m;}}
 if(keys['a']||keys['arrowleft'])ix-=1;if(keys['d']||keys['arrowright'])ix+=1;
 if(keys['w']||keys['arrowup'])iy-=1;if(keys['s']||keys['arrowdown'])iy+=1;
 const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;}
 P.moving=il>.05;if(P.moving)P.face=Math.atan2(iy,ix);
 P.x+=ix*P.spd*dt;P.y+=iy*P.spd*dt;
 if(P.invT>0)P.invT-=dt;
 if(P.regen>0&&P.hp>0)P.hp=Math.min(P.maxHp,P.hp+P.regen*dt);

 if(!G.win)spawner(dt);
 // 敵の移動
 const kd=Math.pow(.0005,dt),far=spawnR()*1.6;
 for(const e of G.en){
  if(e.dead)continue;
  let dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;
  if(d>far&&!e.elite&&e.type!=='boss'){const a=Math.random()*TAU,R=spawnR();e.x=P.x+Math.cos(a)*R;e.y=P.y+Math.sin(a)*R;continue;}
  e.ang=Math.atan2(dy,dx);let sp=e.spd*e.slow,ang=e.ang;e.slow=1;
  if(e.type==='beetle'){e.st-=dt;if(e.st<=0){e.dash=.45;e.st=rand(2,3.2);}if(e.dash>0){e.dash-=dt;sp*=2.8;}}
  if(e.type==='boss'){e.st-=dt;
   if(e.warn>0){e.warn-=dt;sp=0;if(e.warn<=0){e.dash=.9;e.dang=e.ang;}}
   else if(e.dash>0){e.dash-=dt;sp=e.spd*4.6;ang=e.dang;}
   else if(e.st<=0){e.warn=.7;e.st=4.5;for(let i=0;i<5;i++)spawnEnemy('aphid',e.x+rand(-70,70),e.y+rand(-70,70));}}
  e.x+=(Math.cos(ang)*sp+e.kx)*dt;e.y+=(Math.sin(ang)*sp+e.ky)*dt;e.kx*=kd;e.ky*=kd;
  if(e.flash>0)e.flash-=dt;if(e.oh>0)e.oh-=dt;
  // 接触
  if(d<P.r+e.r*.85&&P.invT<=0&&P.hp>0&&!G.win){
   P.hp-=Math.max(1,e.dmg-P.armor);P.invT=.5;G.shake=7;sfx('hurt');vib(35);
   for(let i=0;i<6;i++)addPart(P.x,P.y,'#e2533a',150,3);
  }
 }
 buildGrid();
 // 押し合い
 for(const e of G.en){if(e.dead)continue;for(const o of query(e.x,e.y,e.r)){if(o.id<=e.id)continue;
  const dx=o.x-e.x,dy=o.y-e.y,m=e.r+o.r,d2=dx*dx+dy*dy;if(d2<m*m&&d2>.01){const d=Math.sqrt(d2),p=(m-d)*.5,nx=dx/d,ny=dy/d,wt=o.r/(e.r+o.r);
   e.x-=nx*p*wt;e.y-=ny*p*wt;o.x+=nx*p*(1-wt);o.y+=ny*p*(1-wt);}}}
 updateWeapons(dt);
 updateBullets(dt);
 G.en=G.en.filter(e=>!e.dead);
 // 光の粒
 const mg=P.magnet;
 for(const g of G.gems){const dx=P.x-g.x,dy=P.y-g.y,d=Math.hypot(dx,dy);
  if(!g.mag&&d<mg)g.mag=true;
  if(g.mag||G.win){g.sp=Math.min(900,g.sp+1400*dt);g.x+=dx/(d||1)*g.sp*dt;g.y+=dy/(d||1)*g.sp*dt;
   if(d<P.r+8){g.dead=true;addXp(g.v);sfx('pick');}}}
 G.gems=G.gems.filter(g=>!g.dead);
 for(const it of G.items){const dx=P.x-it.x,dy=P.y-it.y,d=Math.hypot(dx,dy);
  if(!it.mag&&d<mg)it.mag=true;
  if(it.mag){it.sp=Math.min(700,it.sp+1000*dt);it.x+=dx/(d||1)*it.sp*dt;it.y+=dy/(d||1)*it.sp*dt;}
  if(d<P.r+12){it.dead=true;
   if(it.kind==='heal'){P.hp=Math.min(P.maxHp,P.hp+25);G.txt.push({x:P.x,y:P.y-24,v:'+25',life:.9,col:'#7fd3ff'});sfx('pick');}
   else{G.pendingLv++;banner('宝箱！ ボーナス強化');sfx('lvl');}}}
 G.items=G.items.filter(i=>!i.dead);
 // 演出
 for(const p of G.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;p.life-=dt;}
 G.parts=G.parts.filter(p=>p.life>0);
 for(const t of G.txt){t.y-=40*dt;t.life-=dt;}G.txt=G.txt.filter(t=>t.life>0);
 for(const f of G.fx)f.life-=dt;G.fx=G.fx.filter(f=>f.life>0);
 if(G.banner){G.banner.t-=dt;if(G.banner.t<=0)G.banner=null;}
 G.shake=Math.max(0,G.shake-dt*30);

 if(P.hp<=0){P.hp=0;gameOver(false);return;}
 if(G.win){G.endT-=dt;if(G.endT<=0){gameOver(true);return;}}
 if(G.pendingLv>0)openLevelUp();
}
function addXp(v){P.xp+=v;while(P.xp>=P.next){P.xp-=P.next;P.lvl++;P.next=xpNeed(P.lvl);G.pendingLv++;}}

// ================= レベルアップ =================
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildChoices(){
 const o=[],wc=Object.keys(G.w).length,pc=Object.keys(G.p).length;
 for(const k in WDEF){const c=G.w[k];if(c){if(c.lv<WMAX)o.push({kind:'w',k,lv:c.lv+1,wt:1.4});}else if(wc<4)o.push({kind:'w',k,lv:1,wt:1});}
 for(const k in PDEF){const c=G.p[k]||0;if(c){if(c<PDEF[k].max)o.push({kind:'p',k,lv:c+1,wt:1.1});}else if(pc<5)o.push({kind:'p',k,lv:1,wt:.9});}
 const pick=[];
 while(pick.length<3&&o.length){let tot=o.reduce((s,x)=>s+x.wt,0),r=Math.random()*tot,i=0;for(;i<o.length;i++){r-=o[i].wt;if(r<=0)break;}pick.push(o.splice(Math.min(i,o.length-1),1)[0]);}
 if(!pick.length)pick.push({kind:'heal'},{kind:'fert'});
 return pick;
}
function openLevelUp(){
 G.pendingLv--;state='levelup';joy.active=false;joy.id=null;sfx('lvl');
 G.choices=buildChoices();renderChoices();show('lvup');
}
function renderChoices(){
 const box=$('#choices');box.innerHTML='';box.style.pointerEvents='none';
 G.choices.forEach((o,i)=>{
  let ic,nm,lv,ds;
  if(o.kind==='w'){ic=WDEF[o.k].icon;nm=WDEF[o.k].name;lv=o.lv===1?'<span class="lv new">NEW</span>':`<span class="lv">Lv${o.lv}</span>`;ds=WDESC[o.k][o.lv-1];}
  else if(o.kind==='p'){ic=PDEF[o.k].icon;nm=PDEF[o.k].name;lv=o.lv===1?'<span class="lv new">NEW</span>':`<span class="lv">Lv${o.lv}</span>`;ds=PDEF[o.k].desc;}
  else if(o.kind==='heal'){ic='🍅';nm='完熟トマト';lv='';ds='HPを50回復';}
  else{ic='🌾';nm='肥料のふくろ';lv='';ds='ラン終了時の肥料+10';}
  const b=document.createElement('button');b.className='card';b.style.animationDelay=(i*.06)+'s';
  b.innerHTML=`<div class="ic">${ic}</div><div><div class="nm">${nm}${lv}</div><div class="ds">${ds}</div></div>`;
  b.onclick=()=>choose(o);box.appendChild(b);
 });
 setTimeout(()=>box.style.pointerEvents='',350);
 const rb=$('#reroll');rb.style.display=G.rerolls>0?'':'none';rb.textContent=`🎲 リロール（残り${G.rerolls}）`;
}
function choose(o){
 if(state!=='levelup')return;
 if(o.kind==='w'){if(G.w[o.k])G.w[o.k].lv=o.lv;else G.w[o.k]={lv:1,t:.2,tick:0};}
 else if(o.kind==='p'){G.p[o.k]=o.lv;recalc(false);}
 else if(o.kind==='heal')P.hp=Math.min(P.maxHp,P.hp+50);
 else G.bonusFert=(G.bonusFert||0)+10;
 hide('lvup');state='play';last=performance.now();
 if(G.pendingLv>0)openLevelUp();
}
$('#reroll').onclick=()=>{if(G&&G.rerolls>0&&state==='levelup'){G.rerolls--;G.choices=buildChoices();renderChoices();}};

// ================= ポーズ・終了 =================
function statsHTML(){
 const ws=Object.keys(G.w).map(k=>`${WDEF[k].icon}${G.w[k].lv}`).join(' ');
 const ps=Object.keys(G.p).map(k=>`${PDEF[k].icon}${G.p[k]}`).join(' ');
 return `⏱ 時間 <b>${fmt(G.time)}</b><br>⭐ レベル <b>${P.lvl}</b>　🐛 撃破 <b>${G.kills}</b><br>${ws}<br>${ps}`;
}
function pauseGame(){if(state!=='play')return;state='pause';joy.active=false;joy.id=null;$('#pstats').innerHTML=statsHTML();updSfxBtn();show('pause');}
function updSfxBtn(){$('#sfxBtn').textContent='🔊 効果音: '+(save.sfx?'ON':'OFF');}
$('#pbtn').onclick=pauseGame;
$('#resume').onclick=()=>{hide('pause');state='play';last=performance.now();};
$('#sfxBtn').onclick=()=>{save.sfx=!save.sfx;persist();updSfxBtn();initAudio();};
$('#giveup').onclick=()=>{hide('pause');gameOver(false);};
function gameOver(win){
 state='over';$('#pbtn').style.display='none';
 const f=Math.floor(G.kills/8+G.time/6+(win?60:0)+(G.bonusFert||0));
 save.fert+=f;save.best=Math.max(save.best||0,G.time);if(win)save.clears=(save.clears||0)+1;persist();
 $('#overTitle').textContent=win?'🎉 収穫成功！':'しおれてしまった…';
 $('#ostats').innerHTML=statsHTML()+`<br>🌾 獲得した肥料 <b>+${f}</b>`;
 setTimeout(()=>show('over'),win?0:500);
}
$('#retry').onclick=()=>startRun();
$('#toTitle').onclick=()=>{hide('over');G=null;state='title';renderTitle();show('title');};

// ================= タイトル・ショップ =================
function renderTitle(){
 $('#fert').textContent=save.fert;
 $('#best').textContent=save.best?`ベスト ${fmt(save.best)}`+(save.clears?` ・ クリア ${save.clears}回`:''):'';
 const box=$('#chars');box.innerHTML='';
 CHARS.forEach(ch=>{
  const owned=save.chars.includes(ch.id);
  const b=document.createElement('button');b.className='ch'+(save.sel===ch.id?' sel':'')+(owned?'':' lock');
  const c2=document.createElement('canvas');c2.width=120;c2.height=120;c2.style.width='60px';c2.style.height='60px';
  drawBroc(c2.getContext('2d'),60,64,34,ch.id,0,null);b.appendChild(c2);
  const tx=document.createElement('div');tx.className='cht';
  tx.innerHTML=`<b>${ch.name}</b><small>${ch.desc}</small>`+(owned?'':`<span class="cost">🌾 ${ch.cost} で解放</span>`);
  b.appendChild(tx);
  b.onclick=()=>{
   if(owned){save.sel=ch.id;persist();renderTitle();}
   else if(save.fert>=ch.cost){save.fert-=ch.cost;save.chars.push(ch.id);save.sel=ch.id;persist();renderTitle();}
   else{b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}
  };
  box.appendChild(b);
 });
}
function renderShop(){
 $('#fert2').textContent=save.fert;const box=$('#shopList');box.innerHTML='';
 for(const k in UPG){const u=UPG[k],lv=save.up[k]||0,max=lv>=u.max,cost=u.base*(lv+1);
  const d=document.createElement('div');d.className='shop';
  d.innerHTML=`<div class="ic">${u.icon}</div><div class="t"><b>${u.name}</b><small>${u.desc}</small><div class="dots">${'●'.repeat(lv)}${'○'.repeat(u.max-lv)}</div></div>`;
  const b=document.createElement('button');b.className='btn small'+(max||save.fert<cost?' alt':'');b.textContent=max?'MAX':`🌾${cost}`;
  b.onclick=()=>{if(max)return;if(save.fert<cost){d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');return;}
   save.fert-=cost;save.up[k]=lv+1;persist();renderShop();};
  d.appendChild(b);box.appendChild(d);}
}
$('#startBtn').onclick=startRun;
$('#shopBtn').onclick=()=>{renderShop();hide('title');show('shop');};
$('#shopBack').onclick=()=>{hide('shop');renderTitle();show('title');};

// ================= 描画 =================
const PAL={broc:['#1f5e27','#2f8a37','#56b44d'],roma:['#5f9426','#8cc63f','#c2e874'],cauli:['#cfc6a3','#f4efdc','#fffef6']};
const FL=[[-.62,-.35,.46],[.62,-.35,.46],[-.32,-.74,.48],[.32,-.74,.48],[0,-.46,.55],[-.5,0,.4],[.5,0,.4],[0,-.06,.45]];
function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function drawBroc(c,x,y,s,ch,t,look){
 c.save();c.translate(x,y);
 const sq=1+Math.sin(t*12)*.04;c.scale(1/sq,sq);
 if(ch==='cauli'){c.fillStyle='#4f9a3e';for(const sx of[-1,1]){c.save();c.rotate(sx*.6);c.beginPath();c.ellipse(sx*s*.55,s*.35,s*.28,s*.6,0,0,TAU);c.fill();c.restore();}}
 c.fillStyle=ch==='cauli'?'#d4e6ad':'#a6d86e';
 c.beginPath();c.moveTo(-s*.32,-s*.1);c.lineTo(s*.32,-s*.1);c.lineTo(s*.22,s*.95);c.quadraticCurveTo(0,s*1.08,-s*.22,s*.95);c.closePath();c.fill();
 c.strokeStyle='rgba(60,110,30,.35)';c.lineWidth=s*.06;c.beginPath();c.moveTo(0,s*.1);c.lineTo(0,s*.85);c.stroke();
 const p=PAL[ch];
 c.fillStyle=p[0];for(const f of FL)circ(c,f[0]*s,f[1]*s,f[2]*s+s*.08);
 c.fillStyle=p[1];for(const f of FL)circ(c,f[0]*s,f[1]*s,f[2]*s);
 c.fillStyle=p[2];
 if(ch==='roma'){for(const f of FL){const fx=f[0]*s,fy=f[1]*s,fr=f[2]*s;c.beginPath();c.moveTo(fx-fr*.6,fy+fr*.35);c.lineTo(fx,fy-fr*.8);c.lineTo(fx+fr*.6,fy+fr*.35);c.closePath();c.fill();}}
 else for(const f of FL)circ(c,f[0]*s-f[2]*s*.25,f[1]*s-f[2]*s*.25,f[2]*s*.42);
 const lx=look==null?0:Math.cos(look)*s*.06,ly=look==null?0:Math.sin(look)*s*.06;
 c.fillStyle='rgba(255,120,140,.45)';circ(c,-s*.38,-s*.14,s*.09);circ(c,s*.38,-s*.14,s*.09);
 c.fillStyle='#fff';circ(c,-s*.2,-s*.32,s*.14);circ(c,s*.2,-s*.32,s*.14);
 c.fillStyle='#1a1a1a';circ(c,-s*.2+lx,-s*.32+ly,s*.075);circ(c,s*.2+lx,-s*.32+ly,s*.075);
 c.strokeStyle='#1a1a1a';c.lineWidth=Math.max(1.2,s*.06);c.lineCap='round';c.beginPath();c.arc(0,-s*.16,s*.1,.15*Math.PI,.85*Math.PI);c.stroke();
 c.restore();
}
function drawEnemy(c,e,t){
 c.save();c.translate(e.x,e.y);
 if(e.elite||e.type==='boss'){c.fillStyle=e.type==='boss'&&e.warn>0?`rgba(255,60,40,${.35+.3*Math.sin(t*40)})`:'rgba(255,90,60,.22)';circ(c,0,0,e.r*1.35);}
 c.rotate(e.ang);
 const fl=e.flash>0,r=e.r,col=fl?'#fff':e.col;
 c.lineCap='round';
 if(e.type==='aphid'){
  c.strokeStyle='#4d5a1c';c.lineWidth=1.5;for(const s of[-1,1])for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*r*.4,0);c.lineTo(i*r*.5+Math.sin(t*20+i)*2,s*r*1.15);c.stroke();}
  c.fillStyle=col;c.beginPath();c.ellipse(0,0,r*1.1,r*.85,0,0,TAU);c.fill();
  c.fillStyle='#222';circ(c,r*.7,-r*.35,r*.18);circ(c,r*.7,r*.35,r*.18);
 }else if(e.type==='cater'||e.type==='boss'){
  const n=e.type==='boss'?5:4;
  for(let i=n-1;i>=0;i--){const sx=-i*r*.85,sy=Math.sin(t*8-i)*r*.15,rr=r*(i===0?1:.92-.06*i);
   c.fillStyle=fl?'#fff':(i%2?shade(e.col,-18):e.col);circ(c,sx,sy,rr);}
  c.fillStyle='#fff';circ(c,r*.45,-r*.35,r*.24);circ(c,r*.45,r*.35,r*.24);
  c.fillStyle='#111';circ(c,r*.55,-r*.35,r*.12);circ(c,r*.55,r*.35,r*.12);
 }else if(e.type==='beetle'){
  c.strokeStyle='#123';c.lineWidth=2;for(const s of[-1,1])for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*r*.5,0);c.lineTo(i*r*.7,s*r*1.25);c.stroke();}
  c.fillStyle=fl?'#fff':'#1d3b3a';circ(c,r*.95,0,r*.45);
  c.fillStyle=col;c.beginPath();c.ellipse(0,0,r*1.15,r,0,0,TAU);c.fill();
  c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=1.5;c.beginPath();c.moveTo(-r*1.1,0);c.lineTo(r*.6,0);c.stroke();
  c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-r*.2,-r*.45,r*.5,r*.2,0,0,TAU);c.fill();
 }else if(e.type==='slug'){
  c.strokeStyle=fl?'#fff':shade(e.col,-30);c.lineWidth=2;
  for(const s of[-1,1]){c.beginPath();c.moveTo(r*.9,s*r*.2);c.lineTo(r*1.55,s*r*.45);c.stroke();c.fillStyle='#222';circ(c,r*1.55,s*r*.45,2.5);}
  c.fillStyle=col;c.beginPath();c.ellipse(0,0,r*1.4,r*.75,0,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.ellipse(-r*.2,-r*.25,r*.8,r*.2,0,0,TAU);c.fill();
 }
 c.restore();
 if(e.type==='boss'){c.font=`${Math.round(e.r*.9)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('👑',e.x,e.y-e.r-8);}
}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
 r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));return `rgb(${r},${g},${b})`;}
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function drawGround(c,cx,cy){
 const T=360;
 for(let gx=Math.floor(cx/T);gx<=Math.floor((cx+W)/T);gx++)for(let gy=Math.floor(cy/T);gy<=Math.floor((cy+H)/T);gy++){
  c.fillStyle=(gx+gy)&1?'#2b4224':'#2e4627';c.fillRect(gx*T,gy*T,T,T);}
 const S=70;
 for(let gx=Math.floor(cx/S)-1;gx<=Math.floor((cx+W)/S)+1;gx++)for(let gy=Math.floor(cy/S)-1;gy<=Math.floor((cy+H)/S)+1;gy++){
  const h=hash(gx,gy),h2=hash(gy+7,gx-3),x=gx*S+h2*S,y=gy*S+hash(gx+1,gy+9)*S;
  if(h<.38){c.strokeStyle='#4f7a3a';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(x-4,y);c.lineTo(x-6,y-8);c.moveTo(x,y);c.lineTo(x,y-11);c.moveTo(x+4,y);c.lineTo(x+7,y-7);c.stroke();}
  else if(h<.48){c.fillStyle='#4a4436';c.beginPath();c.ellipse(x,y,5,3.5,0,0,TAU);c.fill();}
  else if(h<.53){c.fillStyle=h2<.5?'#f5f0d8':'#f3d34a';for(let i=0;i<5;i++)circ(c,x+Math.cos(i/5*TAU)*3,y+Math.sin(i/5*TAU)*3,2);c.fillStyle='#e8a83a';circ(c,x,y,1.6);}
 }
}
let titleT=0;
function render(now,dt){
 const t=now/1000;
 ctx.setTransform(DPR,0,0,DPR,0,0);
 if(!G){titleT+=dt;const cx=titleT*25,cy=titleT*12;ctx.save();ctx.translate(-cx,-cy);drawGround(ctx,cx,cy);ctx.restore();return;}
 const sx=G.shake?rand(-G.shake,G.shake):0,sy=G.shake?rand(-G.shake,G.shake):0;
 const camX=P.x-W/2+sx,camY=P.y-H/2+sy;
 ctx.save();ctx.translate(-camX,-camY);
 drawGround(ctx,camX,camY);
 // オーラ
 if(G.w.aura){const R=WS.aura(G.w.aura.lv).R;const gr=ctx.createRadialGradient(P.x,P.y,R*.2,P.x,P.y,R);
  gr.addColorStop(0,'rgba(255,245,200,.05)');gr.addColorStop(1,'rgba(255,240,180,.22)');ctx.fillStyle=gr;circ(ctx,P.x,P.y,R);
  ctx.strokeStyle='rgba(255,245,200,.45)';ctx.lineWidth=2;ctx.setLineDash([8,10]);ctx.lineDashOffset=-t*30;ctx.beginPath();ctx.arc(P.x,P.y,R,0,TAU);ctx.stroke();ctx.setLineDash([]);}
 // アイテム
 for(const g of G.gems){const s=g.v>=10?7:g.v>=3?5.5:4;ctx.fillStyle=g.v>=10?'rgba(255,120,200,.3)':g.v>=3?'rgba(255,170,60,.3)':'rgba(255,230,90,.3)';circ(ctx,g.x,g.y,s*1.9);
  ctx.fillStyle=g.v>=10?'#ff8fd0':g.v>=3?'#ffb347':'#ffe45c';ctx.beginPath();ctx.moveTo(g.x,g.y-s*1.3);ctx.lineTo(g.x+s,g.y);ctx.lineTo(g.x,g.y+s*1.3);ctx.lineTo(g.x-s,g.y);ctx.closePath();ctx.fill();}
 for(const it of G.items){const b=Math.sin(t*5)*3;
  if(it.kind==='heal'){ctx.fillStyle='#5ec8ff';ctx.beginPath();ctx.moveTo(it.x,it.y-12+b);ctx.quadraticCurveTo(it.x+9,it.y+b,it.x,it.y+8+b);ctx.quadraticCurveTo(it.x-9,it.y+b,it.x,it.y-12+b);ctx.fill();ctx.fillStyle='#fff';circ(ctx,it.x-2,it.y+1+b,2);}
  else{ctx.fillStyle='rgba(255,220,80,.35)';circ(ctx,it.x,it.y+b,20);ctx.fillStyle='#8b5a2b';ctx.fillRect(it.x-12,it.y-9+b,24,18);ctx.fillStyle='#ffd34a';ctx.fillRect(it.x-12,it.y-3+b,24,4);ctx.fillRect(it.x-2,it.y-9+b,4,18);}}
 // 敵
 for(const e of G.en)drawEnemy(ctx,e,t);
 // 弾
 for(const b of G.bul){
  if(b.k==='seed'){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle='#ead594';ctx.beginPath();ctx.ellipse(0,0,6,3.8,0,0,TAU);ctx.fill();ctx.fillStyle='#b89a50';ctx.beginPath();ctx.ellipse(-2,0,2.5,2,0,0,TAU);ctx.fill();ctx.restore();}
  else if(b.k==='leaf'){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);ctx.fillStyle='#62d24a';ctx.beginPath();ctx.ellipse(0,0,13,6,0,0,TAU);ctx.fill();ctx.strokeStyle='#2f7d32';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();ctx.restore();}
  else if(b.k==='bomb'&&b.t>=0){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(b.tx,b.ty,10,5,0,0,TAU);ctx.fill();
   ctx.fillStyle='#2a6b2e';circ(ctx,b.x,b.y,8);ctx.fillStyle='#4aa548';circ(ctx,b.x-2,b.y-2,4);ctx.fillStyle='#ffdd55';circ(ctx,b.x+4,b.y-8,2+Math.random()*1.5);}
 }
 for(const f of G.fx){const k=1-f.life/f.max;ctx.strokeStyle=`rgba(255,230,120,${1-k})`;ctx.lineWidth=6*(1-k)+1;ctx.beginPath();ctx.arc(f.x,f.y,f.R*(.4+.6*k),0,TAU);ctx.stroke();
  ctx.fillStyle=`rgba(180,240,120,${.25*(1-k)})`;circ(ctx,f.x,f.y,f.R*(.4+.6*k));}
 // 回転フローレット
 for(const o of G.orb){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a*2);ctx.fillStyle='#1f5e27';for(let i=0;i<4;i++)circ(ctx,Math.cos(i/4*TAU)*5,Math.sin(i/4*TAU)*5,6.5);
  ctx.fillStyle='#3f9a3f';for(let i=0;i<4;i++)circ(ctx,Math.cos(i/4*TAU)*5,Math.sin(i/4*TAU)*5,5.2);ctx.fillStyle='#6cc25e';circ(ctx,0,0,3.5);ctx.restore();}
 // プレイヤー
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(P.x,P.y+P.r*1.05,P.r*.9,P.r*.35,0,0,TAU);ctx.fill();
 if(!(P.invT>0&&Math.floor(t*20)%2))drawBroc(ctx,P.x,P.y-2,P.r,G.ch.id,P.moving?t:t*.25,P.moving?P.face:null);
 const hbw=34;ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(P.x-hbw/2,P.y+P.r+10,hbw,4);ctx.fillStyle=P.hp/P.maxHp>.3?'#7ee05a':'#ff5a4a';ctx.fillRect(P.x-hbw/2,P.y+P.r+10,hbw*Math.max(0,Math.min(1,P.hp/P.maxHp)),4);
 // パーティクル・数字
 for(const p of G.parts){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.col;circ(ctx,p.x,p.y,p.r);}ctx.globalAlpha=1;
 ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';
 for(const tx of G.txt){ctx.globalAlpha=Math.min(1,tx.life*3);ctx.strokeText(tx.v,tx.x,tx.y);ctx.fillStyle=tx.col||'#fff';ctx.fillText(tx.v,tx.x,tx.y);}ctx.globalAlpha=1;
 ctx.restore();
 drawHUD(t);
 // ジョイスティック
 if(joy.active&&state==='play'){ctx.fillStyle='rgba(255,255,255,.12)';circ(ctx,joy.ox,joy.oy,52);ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,52,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(180,240,120,.55)';circ(ctx,joy.x,joy.y,24);}
}
function drawHUD(t){
 const top=SAT;
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,top,W,9);
 ctx.fillStyle='#ffe45c';ctx.fillRect(0,top,W*Math.min(1,P.xp/P.next),9);
 ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.6)';
 const txt=(s,x,y,al,f,col)=>{ctx.font=f;ctx.textAlign=al;ctx.strokeText(s,x,y);ctx.fillStyle=col||'#fff';ctx.fillText(s,x,y);};
 txt(fmt(G.time),W/2,top+34,'center','bold 24px sans-serif');
 txt('Lv '+P.lvl,12,top+28,'left','bold 18px sans-serif','#ffe45c');
 txt('🐛 '+G.kills,W-62,top+34,'right','bold 16px sans-serif');
 // HP
 const bw=Math.min(140,W*.33);ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(12,top+42,bw,10);
 ctx.fillStyle=P.hp/P.maxHp>.3?'#7ee05a':'#ff5a4a';ctx.fillRect(12,top+42,bw*Math.max(0,Math.min(1,P.hp/P.maxHp)),10);
 txt(Math.ceil(P.hp)+'/'+P.maxHp,12,top+62,'left','bold 11px sans-serif');
 // 所持
 ctx.font='15px sans-serif';let x=14;
 for(const k in G.w){ctx.textAlign='left';ctx.fillText(WDEF[k].icon,x,top+82);txt(G.w[k].lv,x+17,top+88,'left','bold 10px sans-serif','#ffe45c');ctx.font='15px sans-serif';x+=30;}
 x=14;for(const k in G.p){ctx.textAlign='left';ctx.fillText(PDEF[k].icon,x,top+104);txt(G.p[k],x+17,top+110,'left','bold 10px sans-serif','#9fe3ff');ctx.font='15px sans-serif';x+=30;}
 // ボスHP
 if(G.boss){const bw2=W*.8,bx=(W-bw2)/2,by=H-SAB-34;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(bx,by,bw2,12);
  ctx.fillStyle='#e2533a';ctx.fillRect(bx,by,bw2*Math.max(0,G.boss.hp/G.boss.maxHp),12);txt('👑 ヨトウムシ王',W/2,by-12,'center','bold 14px sans-serif');}
 else if(G.time<240&&G.time>200){txt('ボスまで '+fmt(240-G.time),W/2,H-SAB-30,'center','bold 15px sans-serif','#ffb3a6');}
 if(G.banner){ctx.globalAlpha=Math.min(1,G.banner.t*2);txt(G.banner.txt,W/2,H*.3,'center','bold 26px sans-serif','#ffe066');ctx.globalAlpha=1;}
 if(G.time<5){ctx.globalAlpha=Math.min(1,(5-G.time));txt('画面をドラッグして移動！ 攻撃は自動',W/2,H*.72,'center','bold 16px sans-serif');ctx.globalAlpha=1;}
}

// ================= ループ =================
let last=performance.now();
function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(state==='play'&&G)update(dt);
 render(now,dt);
 requestAnimationFrame(loop);
}
renderTitle();
requestAnimationFrame(loop);
