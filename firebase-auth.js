"use strict";

const crypto = require("node:crypto");
const PROJECT_ID = "yoongunlang";
const CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certificates=null,expiresAt=0,inFlight=null;

async function getCertificates(force=false){
  if(!force&&certificates&&Date.now()<expiresAt)return certificates;
  if(inFlight)return inFlight;
  inFlight=(async()=>{
    const response=await fetch(CERT_URL,{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error("Firebase 공개키를 불러오지 못했습니다.");
    const keys=await response.json();
    if(!keys||typeof keys!=="object")throw new Error("Firebase 공개키 형식이 올바르지 않습니다.");
    const maxAge=Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1])||300;
    certificates=keys;expiresAt=Date.now()+Math.max(60,maxAge)*1000;
    return keys;
  })();
  try{return await inFlight;}finally{inFlight=null;}
}
function decode(part){return JSON.parse(Buffer.from(part,"base64url").toString("utf8"));}
async function verifyFirebaseToken(token){
  if(typeof token!=="string"||token.length>12000)return null;
  const parts=token.split(".");if(parts.length!==3)return null;
  let header,claims;try{header=decode(parts[0]);claims=decode(parts[1]);}catch{return null;}
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=="RS256"||typeof header.kid!=="string"||!header.kid)return null;
  if(claims.aud!==PROJECT_ID||claims.iss!==`https://securetoken.google.com/${PROJECT_ID}`)return null;
  if(typeof claims.sub!=="string"||!claims.sub||claims.sub.length>128)return null;
  if(!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now)return null;
  if(!Number.isFinite(claims.auth_time)||claims.auth_time>now)return null;
  let keys=await getCertificates();
  if(typeof keys[header.kid]!=="string")keys=await getCertificates(true);
  const certificate=keys[header.kid];
  if(typeof certificate!=="string")return null;
  const signature=Buffer.from(parts[2],"base64url");
  const valid=crypto.verify("RSA-SHA256",Buffer.from(`${parts[0]}.${parts[1]}`),certificate,signature);
  return valid?{uid:claims.sub,name:typeof claims.name==="string"?claims.name:""}:null;
}

module.exports={verifyFirebaseToken};
