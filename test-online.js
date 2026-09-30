"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawn} = require("node:child_process");
const WebSocket = require("ws");
const dictionary = new Map(require("./words.json").map(([term,,meaning])=>[term,meaning]));
const port = 35000 + Math.floor(Math.random()*20000);
const HTTP = `http://127.0.0.1:${port}`, WS = `ws://127.0.0.1:${port}`;
const testDir = path.join(os.tmpdir(),`yungeon-arena-test-${process.pid}-${Date.now()}`);
let server;

async function startServer() {
  server=spawn(process.execPath,[path.join(__dirname,"server.js")],{cwd:__dirname,env:{...process.env,PORT:String(port),GAME_MATCH_MS:"30000",GAME_DATA_DIR:testDir},stdio:"ignore"});
  for(let i=0;i<60;i++) {
    try{const r=await fetch(`${HTTP}/api/leaderboard`);if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("테스트 서버가 시작되지 않았습니다.");
}
async function api(route,method="GET",body,token) {
  const response=await fetch(`${HTTP}${route}`,{method,headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,...await response.json()};
}
function connect() {return new Promise((resolve,reject)=>{const ws=new WebSocket(WS);ws.once("open",()=>resolve(ws));ws.once("error",reject);});}
function waitFor(ws,predicate,timeout=4000) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off("message",onMessage);reject(new Error(`메시지 대기 시간 초과 (server=${server.exitCode}/${server.signalCode}, ws=${ws.readyState})`));},timeout);
    function onMessage(raw){let message;try{message=JSON.parse(raw);}catch{return;}if(predicate(message)){clearTimeout(timer);ws.off("message",onMessage);resolve(message);}}
    ws.on("message",onMessage);
  });
}
function send(ws,message){ws.send(JSON.stringify(message));}

async function main(){
  await startServer();
  const names=[0,1,2,3].map(i=>`t_${process.pid}_${i}`);
  const identities=[];
  for(const name of names) {
    const r=await api("/api/register","POST",{name,password:"test-pass-123"});
    assert.equal(r.status,200);assert.equal(r.profile.points,0);identities.push(r);
  }
  const sockets=await Promise.all(names.map(()=>connect()));
  const [a,b,c,d]=sockets;
  try{
    const joinedA=waitFor(a,m=>m.type==="joined");send(a,{type:"create",token:identities[0].token,characterId:"gear"});const room=await joinedA;
    assert.match(room.code,/^[A-Z0-9]{4}$/);
    const joinedB=waitFor(b,m=>m.type==="joined");send(b,{type:"join",code:room.code,token:identities[1].token,characterId:"flame"});await joinedB;
    const joinedC=waitFor(c,m=>m.type==="joined");send(c,{type:"join",code:room.code,token:identities[2].token,characterId:"sniper"});const third=await joinedC;
    const joinedD=waitFor(d,m=>m.type==="joined");send(d,{type:"join",code:room.code,token:identities[3].token,characterId:"healer"});const fourth=await joinedD;
    const started=waitFor(a,m=>m.type==="state"&&m.status==="playing");send(a,{type:"start"});const opening=await started;assert.equal(opening.players.length,4);
    assert.ok(opening.players.every(p=>p.invulnUntil>Date.now()+2500));console.log("시작 및 3초 무적 확인");
    const skillWait=waitFor(a,m=>m.type==="abilityResult"&&m.kind==="skill");send(a,{type:"skill"});assert.equal((await skillWait).ok,true);
    const shieldWait=waitFor(a,m=>m.type==="state"&&m.players.some(p=>p.id===room.id&&p.shieldHits===2));await shieldWait;console.log("스킬 방어막 확인");
    const moving=waitFor(a,m=>m.type==="state"&&m.players.some(p=>p.id===room.id&&p.y<960));send(a,{type:"input",x:0,y:-1,angle:-Math.PI/2,fire:true,super:false});const moved=await moving;
    assert.ok(moved.players.find(p=>p.id===room.id).ammo<3);console.log("이동과 발사 확인");
    const challengeWait=waitFor(a,m=>m.type==="challenge");send(a,{type:"challenge"});const question=await challengeWait;
    const answerWait=waitFor(a,m=>m.type==="challengeResult");send(a,{type:"answer",index:question.options.indexOf(dictionary.get(question.term))});assert.equal((await answerWait).correct,true);console.log("미션 확인");
    const hurtWait=waitFor(c,m=>m.type==="state"&&m.players.some(p=>p.id===fourth.id&&p.hp<100),10000);send(c,{type:"input",x:0,y:0,angle:0,fire:true});await hurtWait;console.log("피격 확인");
    const knocked=waitFor(c,m=>m.type==="state"&&m.players.some(p=>p.id===fourth.id&&!p.alive),20000);const koState=await knocked;
    assert.ok(koState.players.find(p=>p.id===third.id).ko>=1);
    console.log("KO 확인");
    const koPlayer=koState.players.find(p=>p.id===fourth.id);assert.ok(koPlayer.respawnAt>Date.now()+4000);
    const revived=waitFor(c,m=>m.type==="state"&&m.players.some(p=>p.id===fourth.id&&p.alive&&p.deaths>=1),7000);const respawnState=await revived;
    assert.ok(respawnState.players.find(p=>p.id===fourth.id).invulnUntil>Date.now()+2500);
    console.log("5초 부활과 3초 무적 확인");
    const resultWait=waitFor(c,m=>m.type==="result",30000);const result=await resultWait;
    assert.ok(result.earned>=35);assert.equal(result.profile.wins,1);assert.equal(result.profile.matches,1);
    const profile=await api("/api/me","GET",null,identities[2].token);
    assert.equal(profile.profile.points,result.profile.points);
    console.log(`온라인 통합 검사 통과: 방 ${room.code}, 4인 참가, 전투·KO·부활, 미션, 누적 점수`);
  } finally {for(const ws of sockets)ws.close();}
  server.kill();await new Promise(resolve=>server.once("exit",resolve));
  await startServer();
  const login=await api("/api/login","POST",{name:names[2],password:"test-pass-123"});
  assert.equal(login.status,200);assert.ok(login.profile.points>=35);assert.equal(login.profile.wins,1);
  console.log(`재시작 후 로그인 기록 유지 확인: ${login.profile.points} P · ${login.profile.tier}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(server&&!server.killed){server.kill();await new Promise(resolve=>server.once("exit",resolve));}
  const resolved=path.resolve(testDir),tempRoot=path.resolve(os.tmpdir());
  if(resolved.startsWith(tempRoot+path.sep)&&path.basename(resolved).startsWith("yungeon-arena-test-"))fs.rmSync(resolved,{recursive:true,force:true});
});
