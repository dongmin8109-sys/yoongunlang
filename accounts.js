"use strict";
const fs=require("node:fs"),path=require("node:path");
const {initializeApp,applicationDefault,getApps}=require("firebase-admin/app");
const {getAuth}=require("firebase-admin/auth");

if(!getApps().length) initializeApp({credential:applicationDefault(),projectId:"yoongunlang"});

const DIR=process.env.GAME_DATA_DIR||path.join(__dirname,"data"),FILE=path.join(DIR,"accounts.json");
fs.mkdirSync(DIR,{recursive:true});
let db={};try{db=JSON.parse(fs.readFileSync(FILE,"utf8"))}catch{}
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2)+"\n");
const tiers=[["새싹",0],["탐험가",100],["전사",300],["챔피언",700],["전설",1500]];
function tierInfo(p){let i=0;for(let n=0;n<tiers.length;n++)if(p>=tiers[n][1])i=n;return{tier:tiers[i][0],tierStart:tiers[i][1],nextTier:tiers[i+1]?.[0]||null,nextAt:tiers[i+1]?.[1]||tiers[i][1]}}
function publicProfile(a){return{id:a.id,name:a.name,points:a.points||0,wins:a.wins||0,matches:a.matches||0,totalKo:a.totalKo||0,...tierInfo(a.points||0)}}
async function verify(token){
  if(!token)return null;
  try{
    const d=await getAuth().verifyIdToken(String(token));
    const id=d.uid,name=String(d.name||d.email?.split("@")[0]||"윤건전사").slice(0,16);
    if(!db[id])db[id]={id,name,points:0,wins:0,matches:0,totalKo:0};
    else db[id].name=name;
    save();return db[id];
  }catch{return null}
}
function award(id,earned,ko,won){const a=db[id];if(!a)return null;a.points=(a.points||0)+Math.max(0,Number(earned)||0);a.totalKo=(a.totalKo||0)+Math.max(0,Number(ko)||0);if(won)a.wins=(a.wins||0)+1;save();return publicProfile(a)}
function recordStart(ids){for(const id of ids||[])if(db[id])db[id].matches=(db[id].matches||0)+1;save()}
function leaderboard(){return Object.values(db).map(publicProfile).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.totalKo-a.totalKo).slice(0,100)}
module.exports={verify,award,recordStart,leaderboard,publicProfile};
