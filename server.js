"use strict";

const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {WebSocketServer}=require("ws");
const accounts=require("./accounts");
const {verifyFirebaseToken}=require("./firebase-auth");
const characters=require("./characters");
const combat=require("./combat-rules");
const maps=require("./maps");
const words=require("./words.json");

const PORT=Number(process.env.PORT)||3000;
const ROOT=__dirname,W=720,H=1080,TICK_RATE=30;
const MATCH_MS=Number(process.env.GAME_MATCH_MS)||180000;
const rooms=new Map(),attempts=new Map();
let nextId=1;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const distance=(a,b,c,d)=>Math.hypot(a-c,b-d);

function blocked(room,x,y,r=19){return maps.blocked(maps.get(room.mapId),room.mapState,x,y,r);}
function moveTo(room,player,x,y){if(!blocked(room,x,y,19)){player.x=x;player.y=y;return true;}return false;}
function move(room,player,dx,dy,now){maps.move(maps.get(room.mapId),room.mapState,player,dx,dy,1/TICK_RATE,now,(p,x,y)=>moveTo(room,p,x,y));}
function publicPlayer(p){
  return {id:p.id,name:p.name,characterId:p.characterId,x:p.x,y:p.y,hp:p.hp,maxHp:combat.getMaxHp(p),ammo:p.ammo,super:p.super,ko:p.ko,deaths:p.deaths,angle:p.angle,shieldHits:p.shieldHits,alive:p.alive,respawnAt:p.respawnAt,invulnUntil:p.invulnUntil,skillReadyAt:p.skillReadyAt,jump:p.jump,form:p.form,downedUntil:p.downedUntil,reviveCharges:p.reviveCharges,charge:p.charge,chillStacks:p.chillStacks,poisonStacks:p.poisonStacks,vibrationStacks:p.vibrationStacks,dodgeCharges:p.dodgeCharges,stealthUntil:p.stealthUntil,burnUntil:p.burnUntil,poisonUntil:p.poisonUntil,wetUntil:p.wetUntil,slowUntil:p.slowUntil,rootUntil:p.rootUntil,bonusDamageUntil:p.bonusDamageUntil,fastFireUntil:p.fastFireUntil,speedBuffUntil:p.speedBuffUntil,color:p.color};
}
function send(ws,message){if(ws?.readyState===1)ws.send(JSON.stringify(message));}
function broadcast(room,message){for(const p of room.players.values())send(p.ws,message);}
function snapshot(room){
  return {type:"state",status:room.status,code:room.code,host:room.host,mapId:room.mapId,mapState:maps.publicState(room.mapState),remaining:room.status==="playing"?Math.max(0,Math.ceil((room.endsAt-Date.now())/1000)):room.status==="ended"?0:180,players:[...room.players.values()].map(publicPlayer),bullets:room.bullets.map(({x,y,size,color,superShot})=>({x,y,size,color,superShot})),fields:room.fields.map(({x,y,radius,until,color,type,growAt,owner})=>({x,y,radius,until,color,type,growAt,owner})),events:room.events.splice(0)};
}
function code(){let value;do{value=Math.random().toString(36).slice(2,6).toUpperCase();}while(rooms.has(value));return value;}
function makePlayer(ws,room,account,characterId){
  const used=new Set([...room.players.values()].map(p=>p.slot));let slot=0;while(used.has(slot))slot++;
  const [x,y]=maps.get(room.mapId).spawns[slot],character=combat.getCharacter(characterId);
  const player={id:nextId++,ws,accountId:account.id,name:account.name,characterId:character.id,slot,color:character.color,x,y,hp:character.hp,ammo:3,super:0,ko:0,deaths:0,angle:-Math.PI/2,shieldHits:0,alive:true,respawnAt:0,invulnUntil:0,skillReadyAt:0,lastShot:0,lastReload:Date.now(),lastHurt:0,bonusDamageUntil:0,fastFireUntil:0,speedBuffUntil:0,stealthUntil:0,burnUntil:0,poisonUntil:0,slowUntil:0,rootUntil:0,jump:null,input:{x:0,y:0,angle:-Math.PI/2,fire:false,super:false},challenge:null,nextChallenge:0};
  combat.initFighter(player,Date.now());player.invulnUntil=0;
  room.players.set(player.id,player);ws.room=room.code;ws.playerId=player.id;
  send(ws,{type:"joined",id:player.id,code:room.code,host:room.host,characterId:character.id});
  broadcast(room,snapshot(room));
}
function damage(room,target,amount,ownerId){
  const now=Date.now();
  if(!target.alive||target.jump||target.downedUntil>now||target.invulnUntil>now)return false;
  if(target.dodgeCharges>0){target.dodgeCharges--;room.events.push({type:"dodge",x:target.x,y:target.y,id:target.id});return false;}
  if(target.shieldHits>0){target.shieldHits--;room.events.push({type:"shieldHit",x:target.x,y:target.y,id:target.id,shieldHits:target.shieldHits});return false;}
  target.hp=Math.max(0,target.hp-amount);target.lastHurt=now;
  const attacker=room.players.get(ownerId);
  if(attacker&&attacker.id!==target.id)attacker.super=clamp(attacker.super+14,0,100);
  room.events.push({type:"hit",x:target.x,y:target.y,id:target.id,damage:amount});
  if(target.hp===0){if(combat.resolveLethal(world(room),target,now))return true;target.alive=false;target.deaths++;target.respawnAt=now+5000;target.jump=null;if(attacker&&attacker.id!==target.id)attacker.ko++;room.events.push({type:"ko",x:target.x,y:target.y,name:attacker?.name||"전장",target:target.name});}
  return true;
}
function world(room){return{
  fields:room.fields,
  now:()=>Date.now(),players:()=>[...room.players.values()],
  hit:(target,amount,ownerId)=>damage(room,target,amount,ownerId),
  canStand:(x,y,r=19)=>!blocked(room,x,y,r),moveTo:(p,x,y)=>moveTo(room,p,x,y),
  push:(p,dx,dy)=>{const steps=6,resist=p.characterId==="gear"&&p.form==="mech"?.45:1;for(let i=0;i<steps;i++){moveTo(room,p,p.x+dx*resist/steps,p.y);moveTo(room,p,p.x,p.y+dy*resist/steps);}},
  addObstacle:(rect,until,kind)=>{room.mapState.dynamicWalls.push({rect,until,kind});room.events.push({type:"obstacle",rect,until,kind});},
  ignitePlants:(x,y,radius,now)=>{if(room.mapId!=="jungle")return;const ignited=room.mapState.dynamicWalls.filter(v=>v.kind==="junglePlant"&&Math.hypot(v.rect[0]+v.rect[2]/2-x,v.rect[1]+v.rect[3]/2-y)<radius);for(const plant of ignited){plant.until=now;room.fields.push({type:"fire",x:plant.rect[0]+25,y:plant.rect[1]+25,radius:55,owner:0,color:"#ff714e",until:now+2600,nextTick:now+450,interval:650,damage:6,status:"burn"});room.events.push({type:"plantBurn",x:plant.rect[0]+25,y:plant.rect[1]+25});}},
  shot:(p,angle,options)=>{
    const speed=options.speed||700,range=options.range||560,size=options.size||8;
    room.bullets.push({x:p.x+Math.cos(angle)*27,y:p.y+Math.sin(angle)*27,vx:Math.cos(angle)*speed/TICK_RATE,vy:Math.sin(angle)*speed/TICK_RATE,life:range/speed*TICK_RATE,owner:p.id,damage:options.damage||18,size,status:options.status||null,splash:options.splash||0,knockback:options.knockback||0,source:options.source||p.characterId,color:options.color||p.color,superShot:options.damage>=35});
  },
  effect:event=>room.events.push(event)
};}
function makeChallenge(player){
  const now=Date.now();if(!player.alive||player.challenge||now<player.nextChallenge)return;
  const entry=words[Math.floor(Math.random()*words.length)],options=[entry[2]];
  while(options.length<4){const value=words[Math.floor(Math.random()*words.length)][2];if(!options.includes(value))options.push(value);}
  options.sort(()=>Math.random()-.5);player.challenge={answer:options.indexOf(entry[2]),until:now+14000};player.nextChallenge=now+30000;
  send(player.ws,{type:"challenge",term:entry[0],pronunciation:entry[1],options,until:player.challenge.until});
}
function respawn(room,p,now){
  const spawns=maps.get(room.mapId).spawns;
  const free=spawns.filter(([x,y])=>[...room.players.values()].every(other=>other.id===p.id||distance(x,y,other.x,other.y)>145));
  const [x,y]=(free.length?free:spawns)[Math.floor(Math.random()*(free.length||spawns.length))];
  p.x=x;p.y=y;p.ammo=3;p.alive=true;p.skillReadyAt=0;p.lastHurt=now;p.envDamageAt=0;p.fallReadyAt=0;p.padReadyAt=0;p.portalReadyAt=0;combat.initFighter(p,now);
  room.events.push({type:"respawn",x,y,id:p.id,invulnUntil:p.invulnUntil});
}
function endMatch(room){
  room.status="ended";room.bullets=[];room.fields=[];
  const standings=[...room.players.values()].sort((a,b)=>b.ko-a.ko||a.deaths-b.deaths);
  standings.forEach((p,i)=>{const earned=Math.max(0,30-i*10)+p.ko*5,profile=accounts.award(p.accountId,earned,p.ko,i===0);send(p.ws,{type:"result",rank:i+1,earned,profile});});
  broadcast(room,snapshot(room));
}
function tick(room){
  if(room.status!=="playing")return;
  const now=Date.now();if(now>=room.endsAt){endMatch(room);return;}
  const arena=world(room);
  for(const p of room.players.values()){
    if(!p.alive){if(now>=p.respawnAt)respawn(room,p,now);continue;}
    p.angle=p.input.angle;
    move(room,p,p.input.x,p.input.y,now);
    if(p.input.super&&p.characterId!=="jumper")combat.useSuper(arena,p,now,null);
    else if(p.input.fire)combat.fireBasic(arena,p,now);
    if(p.ammo<3&&now-p.lastReload>=1600){p.ammo++;p.lastReload=now;}
    if(now-p.lastHurt>=5000&&p.hp<combat.getMaxHp(p))p.hp=Math.min(combat.getMaxHp(p),p.hp+.1);
    if(p.challenge&&now>p.challenge.until){p.challenge=null;send(p.ws,{type:"challengeResult",correct:false,expired:true});}
  }
  combat.tick(arena,now);
  maps.tickEnvironment(maps.get(room.mapId),room.mapState,[...room.players.values()],now,arena);
  room.bullets=room.bullets.filter(b=>{
    b.x+=b.vx;b.y+=b.vy;b.life--;
    maps.projectileTerrain(maps.get(room.mapId),room.mapState,b,now,event=>room.events.push(event));
    if(b.life<=0||blocked(room,b.x,b.y,Math.min(b.size,6)))return false;
    for(const p of room.players.values())if(p.id!==b.owner&&p.alive&&distance(b.x,b.y,p.x,p.y)<19+b.size){combat.projectileImpact(arena,b,p,now);return false;}
    return true;
  });
  room.frame++;if(room.frame%2===0)broadcast(room,snapshot(room));
}
async function authenticate(token){
  const local=accounts.verify(token);if(local)return local;
  try{const verified=await verifyFirebaseToken(token);return verified?accounts.getOrCreateFirebase(verified.uid,verified.name):null;}catch{return null;}
}
async function onMessage(ws,raw){
  let message;try{message=JSON.parse(raw);}catch{return;}
  if(!message||typeof message!=="object")return;
  if((message.type==="create"||message.type==="join")&&!ws.room){
    if(ws.pendingAuth)return;ws.pendingAuth=true;
    try{
      const account=await authenticate(message.token);
      if(!account){send(ws,{type:"error",message:"온라인 대전은 로그인 후 이용할 수 있습니다."});return;}
      if(message.type==="create"){
        const requested=maps.selectable.some(map=>map.id===message.mapId)?message.mapId:"classic";
        const room={code:code(),players:new Map(),host:nextId,status:"waiting",mapId:requested,mapState:maps.createState(requested),bullets:[],fields:[],events:[],endsAt:0,frame:0};rooms.set(room.code,room);makePlayer(ws,room,account,message.characterId);return;
      }
      const room=rooms.get(String(message.code||"").toUpperCase());
      if(!room||room.status!=="waiting"||room.players.size>=4){send(ws,{type:"error",message:"참가 가능한 방이 없습니다. 코드를 확인해 주세요."});return;}
      if([...room.players.values()].some(p=>p.accountId===account.id)){send(ws,{type:"error",message:"같은 계정으로 이미 이 방에 참가했습니다."});return;}
      makePlayer(ws,room,account,message.characterId);
    }finally{ws.pendingAuth=false;}
    return;
  }
  const room=rooms.get(ws.room),player=room?.players.get(ws.playerId);if(!room||!player)return;
  if(message.type==="mapSelect"&&room.host===player.id&&room.status==="waiting"){
    if(maps.selectable.some(map=>map.id===message.mapId)){
      room.mapId=message.mapId;room.mapState=maps.createState(message.mapId);broadcast(room,snapshot(room));
    }
    return;
  }
  if(message.type==="start"&&room.host===player.id&&room.players.size>=2&&room.status==="waiting"){
    const now=Date.now();room.mapId=room.mapId==="random"?maps.maps[Math.floor(Math.random()*maps.maps.length)].id:room.mapId;room.mapState=maps.createState(room.mapId,now);room.status="playing";room.endsAt=now+MATCH_MS;
    const spawns=maps.get(room.mapId).spawns;
    for(const fighter of room.players.values()){
      [fighter.x,fighter.y]=spawns[fighter.slot];combat.initFighter(fighter,now);fighter.invulnUntil=now+3000;fighter.lastHurt=now;
    }
    accounts.recordStart([...room.players.values()].map(p=>p.accountId));broadcast(room,snapshot(room));return;
  }
  if(message.type==="input"&&room.status==="playing"){
    player.input={x:clamp(Number(message.x)||0,-1,1),y:clamp(Number(message.y)||0,-1,1),angle:Number.isFinite(message.angle)?message.angle:player.angle,fire:!!message.fire,super:!!message.super};return;
  }
  if(message.type==="skill"&&room.status==="playing"){
    const result=combat.useSkill(world(room),player,Date.now());send(ws,{type:"abilityResult",kind:"skill",...result});return;
  }
  if(message.type==="super"&&room.status==="playing"){
    const target=Number.isFinite(message.x)&&Number.isFinite(message.y)?{x:message.x,y:message.y}:null;
    const result=combat.useSuper(world(room),player,Date.now(),target);send(ws,{type:"abilityResult",kind:"super",...result});return;
  }
  if(message.type==="challenge"&&room.status==="playing"){makeChallenge(player);return;}
  if(message.type==="answer"&&room.status==="playing"&&player.challenge){
    const correct=Date.now()<=player.challenge.until&&Number(message.index)===player.challenge.answer;player.challenge=null;
    let reward="";
    if(correct){reward=["shield","heal","boost","super"][Math.floor(Math.random()*4)];if(reward==="shield")player.shieldHits=2;if(reward==="heal")player.hp=Math.min(combat.getMaxHp(player),player.hp+45);if(reward==="boost")player.bonusDamageUntil=Date.now()+10000;if(reward==="super")player.super=Math.min(100,player.super+60);room.events.push({type:"reward",x:player.x,y:player.y,id:player.id,reward});}
    send(ws,{type:"challengeResult",correct,reward});
  }
}
function json(res,status,body){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(body));}
async function api(req,res,pathname){
  if(req.method==="GET"&&pathname==="/api/leaderboard"){json(res,200,{players:accounts.leaderboard()});return;}
  if(req.method==="GET"&&pathname==="/api/me"){
    const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    const account=await authenticate(token);json(res,account?200:401,account?{profile:accounts.publicProfile(account)}:{error:"로그인이 필요합니다."});return;
  }
  if(req.method==="POST"&&(pathname==="/api/register"||pathname==="/api/login")){
    const ip=req.socket.remoteAddress||"unknown",now=Date.now(),entry=attempts.get(ip)||{count:0,reset:now+600000};
    if(now>entry.reset){entry.count=0;entry.reset=now+600000;}
    if(entry.count>=15){json(res,429,{error:"잠시 후 다시 시도해 주세요."});return;}
    let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>4096){json(res,413,{error:"입력 내용이 너무 깁니다."});return;}}
    try{const body=JSON.parse(raw),result=pathname==="/api/register"?accounts.register(body.name,body.password):accounts.login(body.name,body.password);entry.count=0;attempts.set(ip,entry);json(res,200,result);}catch(error){entry.count++;attempts.set(ip,entry);json(res,400,{error:error instanceof SyntaxError?"입력 형식을 확인해 주세요.":error.message});}
    return;
  }
  json(res,404,{error:"찾을 수 없습니다."});
}
const served=new Set(["game.html","index.html","dictionary.html","characters.js","combat-rules.js","maps.js","sound.js","game-client.js","assets/characters/roster-atlas.png"]);
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{res.writeHead(400);res.end("Bad request");return;}
  if(pathname.startsWith("/api/")){api(req,res,pathname).catch(()=>json(res,500,{error:"서버 오류"}));return;}
  const requested=pathname==="/"?"game.html":pathname.replace(/^\//,"");
  if(!served.has(requested)){res.writeHead(404);res.end("Not found");return;}
  const target=path.join(ROOT,requested);
  fs.stat(target,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end("Not found");return;}
    res.writeHead(200,{"Content-Type":requested.endsWith(".html")?"text/html; charset=utf-8":requested.endsWith(".png")?"image/png":"text/javascript; charset=utf-8","Cache-Control":"no-cache"});fs.createReadStream(target).pipe(res);
  });
});
const wss=new WebSocketServer({server,maxPayload:16384});
wss.on("connection",ws=>{
  ws.on("message",raw=>onMessage(ws,raw).catch(()=>send(ws,{type:"error",message:"요청을 처리하지 못했습니다."})));
  ws.on("close",()=>{const room=rooms.get(ws.room);if(!room)return;room.players.delete(ws.playerId);if(room.players.size===0){rooms.delete(room.code);return;}if(room.host===ws.playerId)room.host=room.players.keys().next().value;room.events.push({type:"leave"});broadcast(room,snapshot(room));});
});
setInterval(()=>{for(const room of rooms.values())tick(room);},1000/TICK_RATE);
server.listen(PORT,()=>console.log(`윤건언어 아레나: http://localhost:${PORT}`));
