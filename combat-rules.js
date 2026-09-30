"use strict";

const roster = typeof module !== "undefined" && module.exports ? require("./characters") : window.YungeonCharacters;
const byId = new Map(roster.map(character => [character.id,character]));
const TAU = Math.PI*2;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const getCharacter = id => byId.get(id) || roster[0];

function applyStatus(player,status,now,owner) {
  if(status==="burn") {player.burnUntil=Math.max(player.burnUntil||0,now+3000);player.nextBurn=now+600;player.burnOwner=owner;}
  if(status==="poison") {player.poisonUntil=Math.max(player.poisonUntil||0,now+4000);player.nextPoison=now+700;player.poisonOwner=owner;}
  if(status==="slow") player.slowUntil=Math.max(player.slowUntil||0,now+2600);
  if(status==="root") player.rootUntil=Math.max(player.rootUntil||0,now+1300);
}
function hit(world,target,damage,owner,status,now) {
  if(world.hit(target,damage,owner)) {if(status)applyStatus(target,status,now,owner);return true;}
  return false;
}
function blast(world,owner,x,y,radius,damage,status,knockback=0,now=world.now()) {
  world.effect({type:"blast",x,y,radius,color:getCharacter(owner.characterId).color});
  for(const target of world.players()) {
    if(target.id===owner.id||!target.alive)continue;
    const dx=target.x-x,dy=target.y-y,distance=Math.hypot(dx,dy);
    if(distance>radius+19)continue;
    hit(world,target,damage,owner.id,status,now);
    if(knockback&&distance>0)world.push(target,dx/distance*knockback,dy/distance*knockback);
  }
}
function forwardPoint(world,p,distance) {
  let x=p.x+Math.cos(p.angle)*distance,y=p.y+Math.sin(p.angle)*distance;
  if(!world.canStand(x,y,19)) {x=p.x+Math.cos(p.angle)*distance*.65;y=p.y+Math.sin(p.angle)*distance*.65;}
  return {x,y};
}
function dash(world,p,distance) {
  const dx=Math.cos(p.angle),dy=Math.sin(p.angle),steps=Math.ceil(distance/12);
  for(let i=0;i<steps;i++) {const x=p.x+dx*distance/steps,y=p.y+dy*distance/steps;if(!world.canStand(x,y,19))break;world.moveTo(p,x,y);}
  world.effect({type:"dash",x:p.x,y:p.y,color:getCharacter(p.characterId).color});
}
function fireBasic(world,p,now) {
  if(!p.alive||p.jump||p.ammo<1)return false;
  const character=getCharacter(p.characterId),attack=character.attack;
  const cooldown=(attack.cooldown||.265)*(p.fastFireUntil>now?.62:1)*1000;
  if(now-(p.lastShot||0)<cooldown)return false;
  p.ammo--;p.lastShot=now;p.lastReload=now;
  world.shot(p,p.angle,{...attack,damage:attack.damage+(p.bonusDamageUntil>now?8:0),color:character.color});
  world.effect({type:"shot",x:p.x,y:p.y,id:p.id,color:character.color,characterId:p.characterId});
  return true;
}
function useSkill(world,p,now) {
  if(!p.alive||p.jump||now<(p.skillReadyAt||0))return {ok:false,reason:"cooldown"};
  const character=getCharacter(p.characterId),type=character.skill.type;
  p.skillReadyAt=now+character.skill.cooldown*1000;
  world.effect({type:"skill",skill:type,x:p.x,y:p.y,id:p.id,color:character.color});
  switch(type) {
    case "armor": p.shieldHits=clamp((p.shieldHits||0)+2,0,2);p.speedBuffUntil=now+4200;break;
    case "flameRing": blast(world,p,p.x,p.y,120,22,"burn",0,now);break;
    case "dash": dash(world,p,175);blast(world,p,p.x,p.y,65,15,null,0,now);break;
    case "freeze": blast(world,p,p.x,p.y,135,14,"slow",0,now);break;
    case "chain": for(const offset of[-.22,0,.22])world.shot(p,p.angle+offset,{damage:19,speed:860,range:560,size:7,color:character.color});break;
    case "heal": p.hp=Math.min(character.hp,p.hp+38);world.effect({type:"heal",x:p.x,y:p.y,id:p.id});break;
    case "focus": p.bonusDamageUntil=now+6300;p.fastFireUntil=now+6300;break;
    case "blink": dash(world,p,180);p.shieldHits=Math.min(2,(p.shieldHits||0)+1);break;
    case "quake": blast(world,p,p.x,p.y,115,24,"slow",0,now);break;
    case "gust": blast(world,p,p.x,p.y,145,15,null,100,now);break;
    case "stealth": p.stealthUntil=now+4200;p.speedBuffUntil=now+4200;break;
    case "poisonPool": {const point=forwardPoint(world,p,165);world.fields.push({x:point.x,y:point.y,radius:83,until:now+4200,nextTick:now+400,interval:650,damage:7,status:"poison",owner:p.id,color:character.color});world.effect({type:"field",x:point.x,y:point.y,radius:83,color:character.color});break;}
    case "rhythm": p.fastFireUntil=now+6500;p.hp=Math.min(character.hp,p.hp+16);break;
    case "roots": world.shot(p,p.angle,{damage:16,speed:710,range:570,size:12,status:"root",color:character.color});break;
    case "starlight": p.ammo=3;p.shieldHits=Math.min(2,(p.shieldHits||0)+1);p.super=Math.min(100,p.super+8);break;
  }
  return {ok:true,cooldown:character.skill.cooldown};
}
function useSuper(world,p,now,target) {
  if(!p.alive||p.jump||p.super<100)return {ok:false,reason:"not-ready"};
  const character=getCharacter(p.characterId),type=character.super.type;
  if(type==="jump") {
    if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return {ok:false,reason:"target"};
    const distance=Math.hypot(target.x-p.x,target.y-p.y);
    if(distance>525||distance<35||!world.canStand(target.x,target.y,21))return {ok:false,reason:"range"};
    p.super=0;p.jump={fromX:p.x,fromY:p.y,toX:target.x,toY:target.y,startAt:now,landAt:now+650};
    world.effect({type:"jump",x:p.x,y:p.y,toX:target.x,toY:target.y,id:p.id,color:character.color});
    return {ok:true};
  }
  p.super=0;
  world.effect({type:"super",super:type,x:p.x,y:p.y,id:p.id,color:character.color});
  switch(type) {
    case "cannon": for(const offset of[-.09,0,.09])world.shot(p,p.angle+offset,{damage:43,speed:900,range:800,size:15,color:character.color});break;
    case "meteor": {const point=target&&Number.isFinite(target.x)&&Math.hypot(target.x-p.x,target.y-p.y)<420?target:forwardPoint(world,p,350);blast(world,p,point.x,point.y,135,44,"burn",0,now);break;}
    case "blizzard": blast(world,p,p.x,p.y,225,36,"slow",0,now);break;
    case "storm": for(let i=0;i<10;i++)world.shot(p,i*TAU/10,{damage:24,speed:810,range:650,size:9,color:character.color});break;
    case "sanctuary": p.hp=character.hp;p.shieldHits=2;world.effect({type:"heal",x:p.x,y:p.y,id:p.id});break;
    case "rail": {const dx=Math.cos(p.angle),dy=Math.sin(p.angle);for(const enemy of world.players()){if(enemy.id===p.id||!enemy.alive)continue;const vx=enemy.x-p.x,vy=enemy.y-p.y,along=vx*dx+vy*dy,across=Math.abs(vx*dy-vy*dx);if(along>0&&along<820&&across<36)hit(world,enemy,58,p.id,null,now);}world.effect({type:"beam",x:p.x,y:p.y,toX:p.x+dx*820,toY:p.y+dy*820,color:character.color});break;}
    case "mirror": for(let i=0;i<12;i++)world.shot(p,i*TAU/12,{damage:23,speed:740,range:590,size:8,color:character.color});break;
    case "earthwall": p.shieldHits=2;blast(world,p,p.x,p.y,155,28,"slow",55,now);break;
    case "tornado": blast(world,p,p.x,p.y,205,36,"slow",135,now);break;
    case "teleStrike": {const enemies=world.players().filter(v=>v.id!==p.id&&v.alive&&Math.hypot(v.x-p.x,v.y-p.y)<345).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));const enemy=enemies[0];if(enemy){const x=enemy.x-Math.cos(p.angle)*45,y=enemy.y-Math.sin(p.angle)*45;if(world.canStand(x,y,19))world.moveTo(p,x,y);hit(world,enemy,52,p.id,null,now);world.effect({type:"dash",x:p.x,y:p.y,color:character.color});}else for(const offset of[-.15,0,.15])world.shot(p,p.angle+offset,{damage:25,speed:760,range:600,size:9,color:character.color});break;}
    case "acidRain": {const point=target&&Number.isFinite(target.x)&&Math.hypot(target.x-p.x,target.y-p.y)<420?target:forwardPoint(world,p,330);world.fields.push({x:point.x,y:point.y,radius:145,until:now+5000,nextTick:now+400,interval:650,damage:11,status:"poison",owner:p.id,color:character.color});world.effect({type:"field",x:point.x,y:point.y,radius:145,color:character.color});break;}
    case "sonic": blast(world,p,p.x,p.y,215,40,null,80,now);break;
    case "garden": p.hp=Math.min(character.hp,p.hp+60);blast(world,p,p.x,p.y,160,29,"root",0,now);break;
    case "orbit": for(let i=0;i<12;i++)world.shot(p,i*TAU/12,{damage:23,speed:780,range:650,size:9,color:character.color});break;
  }
  return {ok:true};
}
function tick(world,now) {
  for(const player of world.players()) {
    if(player.jump&&now>=player.jump.landAt) {
      const jump=player.jump;player.jump=null;world.moveTo(player,jump.toX,jump.toY);
      world.effect({type:"land",x:player.x,y:player.y,radius:120,id:player.id,color:getCharacter(player.characterId).color});
      blast(world,player,player.x,player.y,120,46,null,40,now);
    }
    if(!player.alive)continue;
    if(player.burnUntil>now&&now>=(player.nextBurn||0)){player.nextBurn=now+650;world.hit(player,5,player.burnOwner);}
    if(player.poisonUntil>now&&now>=(player.nextPoison||0)){player.nextPoison=now+760;world.hit(player,4,player.poisonOwner);}
  }
  for(let i=world.fields.length-1;i>=0;i--)if(world.fields[i].until<=now)world.fields.splice(i,1);
  for(const field of world.fields)if(now>=field.nextTick){field.nextTick=now+field.interval;for(const player of world.players())if(player.id!==field.owner&&player.alive&&Math.hypot(player.x-field.x,player.y-field.y)<field.radius+19)hit(world,player,field.damage,field.owner,field.status,now);}
}
const rules={getCharacter,roster,applyStatus,fireBasic,useSkill,useSuper,tick};
if(typeof module!=="undefined"&&module.exports)module.exports=rules;
if(typeof window!=="undefined")window.YungeonCombat=rules;
