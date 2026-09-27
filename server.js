"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const accounts = require("./accounts");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const W = 720, H = 1080, MATCH_MS = Number(process.env.GAME_MATCH_MS) || 180000;
const walls = [
  [273,217,174,30], [273,815,174,30],
  [207,318,30,103], [483,318,30,103], [207,659,30,105], [483,659,30,105],
  [207,390,96,30], [417,390,96,30], [207,660,96,30], [417,660,96,30],
  [0,452,98,45], [622,452,98,45], [0,585,98,45], [622,585,98,45],
  [69,382,30,116], [621,382,30,116], [69,584,30,116], [621,584,30,116],
  [0,296,98,30], [622,296,98,30], [0,754,98,30], [622,754,98,30],
  [0,0,60,48], [660,0,60,48], [0,1032,60,48], [660,1032,60,48]
];
const waters = [[0,0,93,278],[627,0,93,278],[0,497,93,88],[627,497,93,88],[0,800,93,280],[627,800,93,280]];
const spawnPoints = [[360,965],[360,96],[150,535],[570,535]];
const words = require("./words.json");
const rooms = new Map();
let nextId = 1;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rnd = (a,b) => a + Math.random() * (b-a);
const dist2 = (a,b,c,d) => (a-c)**2 + (b-d)**2;
function blocked(x,y,r=19) {
  if (x < r || y < r || x > W-r || y > H-r) return true;
  return [...walls,...waters].some(([a,b,w,h]) => x+r>a && x-r<a+w && y+r>b && y-r<b+h);
}
function move(p,dx,dy) {
  const len = Math.hypot(dx,dy) || 1, speed = p.speedUntil > Date.now() ? 270 : 225;
  const vx = clamp(dx/len,-1,1)*speed/30, vy = clamp(dy/len,-1,1)*speed/30;
  if (!blocked(p.x+vx,p.y)) p.x += vx;
  if (!blocked(p.x,p.y+vy)) p.y += vy;
}
function publicPlayer(p) {
  return {id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,maxHp:100,ammo:p.ammo,super:p.super,ko:p.ko,deaths:p.deaths,angle:p.angle,shield:p.shield,boost:p.boostUntil>Date.now(),alive:p.alive,color:p.color,respawnAt:p.respawnAt};
}
function send(ws,msg) { if (ws?.readyState===1) ws.send(JSON.stringify(msg)); }
function broadcast(room,msg) { for (const p of room.players.values()) send(p.ws,msg); }
function state(room) {
  return {type:"state",status:room.status,code:room.code,host:room.host,remaining:room.status==="playing"?Math.max(0,Math.ceil((room.endsAt-Date.now())/1000)):room.status==="ended"?0:180,
    players:[...room.players.values()].map(publicPlayer),bullets:room.bullets.map(b=>({x:b.x,y:b.y,color:b.color,super:b.super})),events:room.events.splice(0)};
}
function code() { let c; do { c=Math.random().toString(36).slice(2,6).toUpperCase(); } while (rooms.has(c)); return c; }
function join(ws,room,account) {
  const idx=room.players.size, [x,y]=spawnPoints[idx];
  const p={id:nextId++,ws,accountId:account.id,name:account.name,x,y,hp:100,ammo:3,super:0,ko:0,deaths:0,angle:-Math.PI/2,shield:0,boostUntil:0,speedUntil:0,alive:true,respawnAt:0,lastShot:0,lastReload:Date.now(),lastHurt:0,input:{x:0,y:0,angle:-Math.PI/2,fire:false,super:false},challenge:null,nextChallenge:0,color:["#41d9f5","#fb6b91","#ffc95a","#aa89ff"][idx]};
  room.players.set(p.id,p); ws.room=room.code; ws.playerId=p.id;
  send(ws,{type:"joined",id:p.id,code:room.code,host:room.host});
  broadcast(room,state(room));
}
function makeChallenge(p) {
  const now=Date.now();
  if (now<p.nextChallenge || p.challenge || !p.alive) return;
  const entry=words[Math.floor(Math.random()*words.length)];
  const options=[entry[2]];
  while(options.length<4) {
    const v=words[Math.floor(Math.random()*words.length)][2];
    if(!options.includes(v)) options.push(v);
  }
  options.sort(()=>Math.random()-.5);
  p.challenge={answer:options.indexOf(entry[2]),until:now+14000};
  p.nextChallenge=now+30000;
  send(p.ws,{type:"challenge",term:entry[0],pronunciation:entry[1],options,until:p.challenge.until});
}
function shoot(room,p,superShot=false) {
  const now=Date.now();
  if (!p.alive || now-p.lastShot < (superShot?280:235)) return;
  if (superShot) { if(p.super<100) return; p.super=0; }
  else { if(p.ammo<1) return; p.ammo--; p.lastReload=now; }
  p.lastShot=now;
  const angles=superShot?[-.24,-.12,0,.12,.24]:[0];
  for(const offset of angles) {
    const a=p.angle+offset;
    room.bullets.push({x:p.x+Math.cos(a)*25,y:p.y+Math.sin(a)*25,vx:Math.cos(a)*(superShot?13:12),vy:Math.sin(a)*(superShot?13:12),owner:p.id,damage:superShot?27:(p.boostUntil>now?27:18),life:superShot?45:36,color:p.color,super:superShot});
  }
  room.events.push({type:superShot?"super":"shot",x:p.x,y:p.y,id:p.id});
}
function damage(room,p,b) {
  if(!p.alive) return;
  const attacker=room.players.get(b.owner);
  let amount=b.damage;
  if(p.shield>0) {const used=Math.min(p.shield,amount); p.shield-=used; amount-=used;}
  p.hp=Math.max(0,p.hp-amount); p.lastHurt=Date.now();
  if(attacker && attacker.id!==p.id) attacker.super=clamp(attacker.super+14,0,100);
  room.events.push({type:"hit",x:p.x,y:p.y,id:p.id,damage:amount});
  if(p.hp<=0) {
    p.alive=false; p.deaths++; p.respawnAt=Date.now()+3200;
    if(attacker && attacker.id!==p.id) attacker.ko++;
    room.events.push({type:"ko",name:attacker?.name||"전장",target:p.name,x:p.x,y:p.y});
  }
}
function tick(room) {
  if(room.status!=="playing") return;
  const now=Date.now();
  if(now>=room.endsAt) {
    room.status="ended"; room.bullets=[];
    const standings=[...room.players.values()].sort((a,b)=>b.ko-a.ko||a.deaths-b.deaths);
    standings.forEach((p,i)=>{
      const earned=Math.max(0,30-i*10)+p.ko*5;
      const profile=accounts.award(p.accountId,earned,p.ko,i===0);
      send(p.ws,{type:"result",rank:i+1,earned,profile});
    });
    broadcast(room,state(room)); return;
  }
  for(const p of room.players.values()) {
    if(!p.alive) {
      if(now>=p.respawnAt) { const places=spawnPoints.filter(([x,y])=>[...room.players.values()].every(q=>q.id===p.id||dist2(x,y,q.x,q.y)>150*150)); const [x,y]=(places.length?places:spawnPoints)[Math.floor(Math.random()*(places.length||spawnPoints.length))]; p.x=x;p.y=y;p.hp=100;p.ammo=3;p.shield=20;p.alive=true;p.lastHurt=now;room.events.push({type:"respawn",x,y,id:p.id}); }
      continue;
    }
    move(p,p.input.x,p.input.y);
    p.angle=p.input.angle;
    if(p.input.super) shoot(room,p,true);
    else if(p.input.fire) shoot(room,p,false);
    if(p.ammo<3 && now-p.lastReload>=1600) {p.ammo++;p.lastReload=now;}
    if(now-p.lastHurt>=5000 && p.hp<100) p.hp=Math.min(100,p.hp+.09);
    if(p.challenge && now>p.challenge.until) {p.challenge=null;send(p.ws,{type:"challengeResult",correct:false,expired:true});}
  }
  room.bullets=room.bullets.filter(b=>{
    b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||blocked(b.x,b.y,5)) return false;
    for(const p of room.players.values()) if(p.id!==b.owner&&p.alive&&dist2(b.x,b.y,p.x,p.y)<24*24) {damage(room,p,b);return false;}
    return true;
  });
  room.frame++;
  if(room.frame%2===0) broadcast(room,state(room));
}
async function onMessage(ws,data) {
  let m; try {m=JSON.parse(data);} catch {return;}
  if(!m||typeof m!=="object") return;
  if((m.type==="create"||m.type==="join")&&!ws.room) {
    const account=await accounts.verify(m.token);
    if(!account){send(ws,{type:"error",message:"온라인 대전은 로그인 후 이용할 수 있습니다."});return;}
    if(m.type==="create") {const c=code();const room={code:c,players:new Map(),host:nextId,status:"waiting",bullets:[],events:[],endsAt:0,frame:0};rooms.set(c,room);join(ws,room,account);return;}
    const room=rooms.get(String(m.code||"").toUpperCase());
    if(!room||room.status!=="waiting"||room.players.size>=4){send(ws,{type:"error",message:"참가 가능한 방이 없습니다. 코드를 확인해 주세요."});return;}
    if([...room.players.values()].some(p=>p.accountId===account.id)){send(ws,{type:"error",message:"같은 계정으로 이미 이 방에 참가했습니다."});return;}
    join(ws,room,account);return;
  }
  const room=rooms.get(ws.room), p=room?.players.get(ws.playerId); if(!room||!p)return;
  if(m.type==="start"&&room.host===p.id&&room.players.size>=2&&room.status==="waiting") {room.status="playing";room.endsAt=Date.now()+MATCH_MS;accounts.recordStart([...room.players.values()].map(v=>v.accountId));broadcast(room,state(room));return;}
  if(m.type==="input"&&room.status==="playing") {p.input={x:clamp(Number(m.x)||0,-1,1),y:clamp(Number(m.y)||0,-1,1),angle:Number.isFinite(m.angle)?m.angle:p.angle,fire:!!m.fire,super:!!m.super};return;}
  if(m.type==="challenge"&&room.status==="playing") {makeChallenge(p);return;}
  if(m.type==="answer"&&p.challenge&&room.status==="playing") {
    const correct=Date.now()<=p.challenge.until && Number(m.index)===p.challenge.answer;p.challenge=null;
    let reward="";
    if(correct) {reward=["shield","heal","boost","super"][Math.floor(Math.random()*4)];if(reward==="shield")p.shield=Math.min(70,p.shield+45);if(reward==="heal")p.hp=Math.min(100,p.hp+45);if(reward==="boost")p.boostUntil=Date.now()+10000;if(reward==="super")p.super=Math.min(100,p.super+60);room.events.push({type:"reward",x:p.x,y:p.y,id:p.id,reward});}
    send(ws,{type:"challengeResult",correct,reward});
  }
}
function json(res,status,body){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(body));}
async function handleApi(req,res,pathname){
  if(req.method==="GET"&&pathname==="/api/leaderboard"){json(res,200,{players:accounts.leaderboard()});return;}
  if(req.method==="GET"&&pathname==="/api/me"){
    const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,""),account=await accounts.verify(token);
    json(res,account?200:401,account?{profile:accounts.publicProfile(account)}:{error:"Google 로그인이 필요합니다."});return;
  }
  json(res,404,{error:"찾을 수 없습니다."});
}
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{res.writeHead(400);res.end("Bad request");return;}
  if(pathname.startsWith("/api/")){handleApi(req,res,pathname).catch(()=>json(res,500,{error:"서버 오류"}));return;}
  const requested=pathname==="/"?"game.html":pathname.replace(/^\//,"");
  const target=path.resolve(ROOT,requested);
  if(!target.startsWith(ROOT+path.sep)||!(/^(game\.html|index\.html|dictionary\.html|audio[\\/][\w .’'()-]+\.(mp3|wav|ogg|m4a))$/i).test(requested)) {res.writeHead(404);res.end("Not found");return;}
  fs.stat(target,(err,s)=>{
    if(err||!s.isFile()){res.writeHead(404);res.end("Not found");return;}
    const ext=path.extname(target).toLowerCase();res.writeHead(200,{"Content-Type":({".html":"text/html; charset=utf-8",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"})[ext]||"application/octet-stream","Cache-Control":ext===".html"?"no-cache":"public, max-age=3600"});fs.createReadStream(target).pipe(res);
  });
});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on("connection",ws=>{
  ws.on("message",data=>{onMessage(ws,data).catch(()=>send(ws,{type:"error",message:"인증 처리 중 오류가 발생했습니다."}));});
  ws.on("close",()=>{const room=rooms.get(ws.room);if(!room)return;room.players.delete(ws.playerId);if(room.players.size===0){rooms.delete(room.code);return;}if(room.host===ws.playerId)room.host=room.players.keys().next().value;room.events.push({type:"leave"});broadcast(room,state(room));});
});
setInterval(()=>{for(const room of rooms.values())tick(room);},1000/30);
server.listen(PORT,()=>console.log(`윤건언어 아레나: http://localhost:${PORT}`));
