"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const directory = process.env.GAME_DATA_DIR ? path.resolve(process.env.GAME_DATA_DIR) : path.join(__dirname, "data");
const file = path.join(directory, "accounts.json");
const secretFile = path.join(directory, "auth-secret.key");
fs.mkdirSync(directory, {recursive:true});
const accounts = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,"utf8")) : [];
const secret = fs.existsSync(secretFile) ? fs.readFileSync(secretFile) : crypto.randomBytes(32);
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile,secret,{mode:0o600});

const tiers = [
  {name:"새싹",min:0},
  {name:"탐험가",min:100},
  {name:"전사",min:300},
  {name:"챔피언",min:700},
  {name:"전설",min:1500}
];
function tier(points) {return [...tiers].reverse().find(t=>points>=t.min).name;}
function save() {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(accounts,null,2));
  fs.renameSync(temp,file);
}
function publicProfile(account) {
  const current=[...tiers].reverse().find(t=>account.points>=t.min),index=tiers.indexOf(current),next=tiers[index+1];
  return {id:account.id,name:account.name,points:account.points,tier:current.name,tierStart:current.min,nextTier:next?.name||null,nextAt:next?.min||null,totalKo:account.totalKo,wins:account.wins,matches:account.matches};
}
function normalizeName(name) {return String(name||"").normalize("NFKC").trim();}
function register(name,password) {
  name=normalizeName(name);password=String(password||"");
  if(!/^[\p{L}\p{N}_]{3,16}$/u.test(name)) throw new Error("아이디는 한글·영문·숫자·_로 3~16자여야 합니다.");
  if(password.length<8||password.length>72) throw new Error("비밀번호는 8~72자로 입력해 주세요.");
  if(accounts.some(a=>a.name.toLocaleLowerCase("ko-KR")===name.toLocaleLowerCase("ko-KR"))) throw new Error("이미 사용 중인 아이디입니다.");
  const salt=crypto.randomBytes(16).toString("hex");
  const account={id:crypto.randomBytes(12).toString("hex"),name,salt,hash:crypto.scryptSync(password,salt,64).toString("hex"),points:0,totalKo:0,wins:0,matches:0,createdAt:Date.now()};
  accounts.push(account);save();return {token:issue(account),profile:publicProfile(account)};
}
function login(name,password) {
  const account=accounts.find(a=>a.hash&&a.name.toLocaleLowerCase("ko-KR")===normalizeName(name).toLocaleLowerCase("ko-KR"));
  if(!account) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  const hash=crypto.scryptSync(String(password||""),account.salt,64);
  if(!crypto.timingSafeEqual(hash,Buffer.from(account.hash,"hex"))) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  return {token:issue(account),profile:publicProfile(account)};
}
function getOrCreateFirebase(uid,displayName) {
  if(typeof uid!=="string"||!uid||uid.length>128)throw new Error("Firebase 사용자 ID가 올바르지 않습니다.");
  let account=accounts.find(a=>a.firebaseUid===uid);
  if(account)return account;
  const suggested=normalizeName(displayName).replace(/[^\p{L}\p{N}_]/gu,"").slice(0,12)||`탐험가${uid.slice(0,5)}`;
  let name=suggested,index=2;
  while(accounts.some(a=>a.name.toLocaleLowerCase("ko-KR")===name.toLocaleLowerCase("ko-KR")))name=`${suggested.slice(0,12)}${index++}`;
  account={id:crypto.randomBytes(12).toString("hex"),firebaseUid:uid,name,points:0,totalKo:0,wins:0,matches:0,createdAt:Date.now()};
  accounts.push(account);save();return account;
}
function issue(account) {
  const payload=`${account.id}.${Date.now()+30*24*60*60*1000}`;
  const signature=crypto.createHmac("sha256",secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function verify(token) {
  if(typeof token!=="string"||token.length>200)return null;
  const parts=token.split(".");if(parts.length!==3||!/^\d+$/.test(parts[1]))return null;
  const payload=`${parts[0]}.${parts[1]}`;
  const signature=crypto.createHmac("sha256",secret).update(payload).digest("base64url");
  const a=Buffer.from(parts[2]),b=Buffer.from(signature);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b)||Number(parts[1])<Date.now())return null;
  return accounts.find(account=>account.id===parts[0])||null;
}
function recordStart(ids) {for(const id of ids){const a=accounts.find(v=>v.id===id);if(a)a.matches++;}save();}
function award(id,points,ko,win) {const a=accounts.find(v=>v.id===id);if(!a)return null;a.points+=points;a.totalKo+=ko;if(win)a.wins++;save();return publicProfile(a);}
function leaderboard() {return [...accounts].sort((a,b)=>b.points-a.points||b.wins-a.wins).slice(0,20).map(publicProfile);}

module.exports={register,login,verify,getOrCreateFirebase,publicProfile,recordStart,award,leaderboard};
