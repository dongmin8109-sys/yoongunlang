"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawn}=require("node:child_process");
const WebSocket=require("ws");
const maps=require("./maps");

assert.equal(maps.maps.length,5);
assert.deepEqual(maps.maps.map(m=>m.id),["classic","volcano","ice","jungle","sky"]);
assert.deepEqual(maps.get("classic").spawns,[[360,965],[360,96],[150,535],[570,535]]);
assert.equal(maps.get("classic").walls.length,26);
assert.equal(maps.get("classic").waters.length,6);
for(const map of maps.maps){
  const state=maps.createState(map.id,1000);
  assert.equal(state.mapId,map.id);
  assert.ok(map.walls.length>0&&map.spawns.length===4&&map.palette);
  for(const [x,y] of map.spawns)assert.equal(maps.blocked(map,state,x,y,19),false,`${map.id} 스폰`);
  const [x,y,w,h]=map.walls[0];assert.equal(maps.blocked(map,state,x+w/2,y+h/2,6),true,`${map.id} 벽 충돌`);
  const safe=maps.safePoint(map,state,{x:340,y:520});assert.equal(maps.blocked(map,state,...safe,19),false,`${map.id} 안전 복귀`);
}
const events=[],hits=[];
const api={hit:(p,amount)=>{hits.push(amount);p.hp-=amount;},effect:e=>events.push(e)};
const player={id:1,x:360,y:535,hp:100,alive:true,invulnUntil:0};
let state=maps.createState("volcano",0);maps.tickEnvironment(maps.get("volcano"),state,[player],7001,api);assert.equal(state.warning?.radius,125);
maps.tickEnvironment(maps.get("volcano"),state,[player],9002,api);assert.ok(events.some(e=>e.type==="eruption"));assert.ok(hits.includes(38));
state=maps.createState("ice",0);maps.tickEnvironment(maps.get("ice"),state,[player],7001,api);assert.equal(state.brokenIce.length,1);
state=maps.createState("jungle",0);maps.tickEnvironment(maps.get("jungle"),state,[player],7001,api);assert.equal(state.dynamicWalls[0].kind,"junglePlant");
state=maps.createState("sky",0);maps.tickEnvironment(maps.get("sky"),state,[player],7001,api);assert.equal(state.padsActive,false);
player.x=25;player.y=355;maps.tickEnvironment(maps.get("sky"),state,[player],7002,api);assert.ok(hits.includes(24));assert.equal(maps.blocked(maps.get("sky"),state,player.x,player.y,19),false);
const sliding={x:300,y:500,characterId:"gear",baseSpeed:200,slideVx:0,slideVy:0,rootUntil:0};maps.move(maps.get("ice"),maps.createState("ice"),sliding,1,0,1/30,1000,(p,x,y)=>{p.x=x;p.y=y;});assert.ok(sliding.slideVx>0&&sliding.slideVx<200);
console.log("5개 맵 데이터·기본 맵 보존·스폰·벽·특수 지형·환경 이벤트 검사 통과");

const port=38000+Math.floor(Math.random()*18000),base=`http://127.0.0.1:${port}`,wsUrl=`ws://127.0.0.1:${port}`;
const dir=path.join(os.tmpdir(),`yungeon-maps-test-${process.pid}-${Date.now()}`);
let server;const sockets=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function next(ws,predicate,timeout=3500){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off("message",onMessage);reject(Error("WebSocket 메시지 대기 시간 초과"));},timeout);function onMessage(raw){const data=JSON.parse(raw);if(predicate(data)){clearTimeout(timer);ws.off("message",onMessage);resolve(data);}}ws.on("message",onMessage);});}
async function account(i){const r=await fetch(base+"/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:`map_${process.pid}_${i}`,password:"test-pass-123"})});assert.equal(r.status,200);return(await r.json()).token;}
async function connect(){const ws=await new Promise((resolve,reject)=>{const socket=new WebSocket(wsUrl);socket.once("open",()=>resolve(socket));socket.once("error",reject);});sockets.push(ws);return ws;}
async function join(ws,message){const ready=next(ws,m=>m.type==="joined");ws.send(JSON.stringify(message));return ready;}
async function main(){
  server=spawn(process.execPath,[path.join(__dirname,"server.js")],{cwd:__dirname,env:{...process.env,PORT:String(port),GAME_DATA_DIR:dir,GAME_MATCH_MS:"15000"},stdio:"ignore"});
  let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(base+"/api/leaderboard")).ok;if(ready)break;}catch{}await pause(100);}assert.ok(ready,"서버 시작");
  const tokens=await Promise.all([0,1,2,3,4,5].map(account));const [a,b,c,d,e,f]=await Promise.all([0,1,2,3,4,5].map(connect));
  const first=await join(a,{type:"create",token:tokens[0],characterId:"gear",mapId:"volcano"});assert.equal((await next(a,m=>m.type==="state"&&m.mapId==="volcano")).mapId,"volcano");
  await join(b,{type:"join",code:first.code,token:tokens[1],characterId:"frost"});
  let unauthorized=false;const watch=raw=>{const m=JSON.parse(raw);if(m.type==="state"&&m.mapId==="ice")unauthorized=true;};a.on("message",watch);b.send(JSON.stringify({type:"mapSelect",mapId:"ice"}));await pause(180);a.off("message",watch);assert.equal(unauthorized,false,"일반 참가자 맵 변경 불가");
  const guestState=next(a,m=>m.type==="state"&&m.mapId==="jungle");a.send(JSON.stringify({type:"mapSelect",mapId:"jungle"}));assert.equal((await guestState).mapId,"jungle");
  const synchronized=next(b,m=>m.type==="state"&&m.mapId==="sky");a.send(JSON.stringify({type:"mapSelect",mapId:"sky"}));assert.equal((await synchronized).mapId,"sky");
  const playing=next(b,m=>m.type==="state"&&m.status==="playing");a.send(JSON.stringify({type:"start"}));const started=await playing;assert.equal(started.mapId,"sky");assert.deepEqual(started.players.map(p=>[p.x,p.y]),maps.get("sky").spawns.slice(0,2));
  a.send(JSON.stringify({type:"mapSelect",mapId:"ice"}));await pause(160);const locked=next(a,m=>m.type==="state"&&m.status==="playing");assert.equal((await locked).mapId,"sky");
  const second=await join(c,{type:"create",token:tokens[2],characterId:"earth",mapId:"volcano"});await join(d,{type:"join",code:second.code,token:tokens[3],characterId:"star"});
  const secondStart=next(c,m=>m.type==="state"&&m.status==="playing");c.send(JSON.stringify({type:"start"}));assert.equal((await secondStart).mapId,"volcano");
  const roomOne=next(a,m=>m.type==="state"&&m.status==="playing");assert.equal((await roomOne).mapId,"sky");
  const third=await join(e,{type:"create",token:tokens[4],characterId:"frost",mapId:"random"});await join(f,{type:"join",code:third.code,token:tokens[5],characterId:"wind"});
  const randomStart=next(e,m=>m.type==="state"&&m.status==="playing");e.send(JSON.stringify({type:"start"}));const random=await randomStart;assert.ok(maps.maps.some(map=>map.id===random.mapId));assert.notEqual(random.mapId,"random");
  const atlas=await fetch(base+"/assets/characters/roster-atlas.png");assert.equal(atlas.status,200);assert.match(atlas.headers.get("content-type"),/image\/png/);
  console.log("방장 전용 맵 변경·참가자 동기화·시작 후 잠금·서버 랜덤·방별 독립 맵·이미지 제공 검사 통과");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{for(const ws of sockets)ws.close();if(server&&!server.killed){server.kill();await new Promise(resolve=>server.once("exit",resolve));}const resolved=path.resolve(dir),tempRoot=path.resolve(os.tmpdir());if(resolved.startsWith(tempRoot+path.sep)&&path.basename(resolved).startsWith("yungeon-maps-test-"))fs.rmSync(resolved,{recursive:true,force:true});});
