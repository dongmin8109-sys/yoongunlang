"use strict";

const roster=typeof module!=="undefined"&&module.exports?require("./characters"):window.YungeonCharacters;
const byId=new Map(roster.map(c=>[c.id,c]));
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const getCharacter=id=>byId.get(id)||roster[0];
const getMaxHp=p=>p.characterId==="gear"&&p.form==="pilot"?getCharacter("gear").pilotHp:getCharacter(p.characterId).hp;
function initFighter(p,now){
  const c=getCharacter(p.characterId);p.form=p.characterId==="gear"?"mech":"normal";p.maxHp=c.hp;p.hp=c.hp;p.baseSpeed=c.speed;p.mechReturns=0;p.reviveCharges=p.characterId==="star"?1:0;p.downedUntil=0;p.charge=0;p.chillStacks=0;p.poisonStacks=0;p.vibrationStacks=0;p.beat=0;p.dodgeCharges=0;p.history=[];p.lastHistoryAt=0;p.seedUntil=0;p.wetUntil=0;p.timeMarkUntil=0;p.burnUntil=0;p.poisonUntil=0;p.slowUntil=0;p.rootUntil=0;p.stealthUntil=0;p.flightUntil=0;p.speedBuffUntil=0;p.bonusDamageUntil=0;p.fastFireUntil=0;p.slideVx=0;p.slideVy=0;p.jump=null;p.shieldHits=0;p.invulnUntil=now+3000;
}
function applyStatus(p,status,now,owner){
  switch(status){
    case "burn":p.burnUntil=Math.max(p.burnUntil||0,now+3400);p.nextBurn=now+600;p.burnOwner=owner;break;
    case "poison":p.poisonStacks=Math.min(4,(p.poisonStacks||0)+1);p.poisonUntil=Math.max(p.poisonUntil||0,now+4600);p.nextPoison=now+690;p.poisonOwner=owner;break;
    case "chill":p.chillStacks=(p.chillStacks||0)+1;p.slowUntil=Math.max(p.slowUntil||0,now+2300);if(p.chillStacks>=3){p.rootUntil=Math.max(p.rootUntil||0,now+1250);p.chillStacks=0;}break;
    case "slow":p.slowUntil=Math.max(p.slowUntil||0,now+2700);break;
    case "root":p.rootUntil=Math.max(p.rootUntil||0,now+1300);break;
    case "wet":p.wetUntil=Math.max(p.wetUntil||0,now+4500);p.slowUntil=Math.max(p.slowUntil||0,now+850);break;
    case "time":p.timeMarkUntil=now+3500;p.slowUntil=Math.max(p.slowUntil||0,now+1600);break;
    case "vibration":p.vibrationStacks=Math.min(3,(p.vibrationStacks||0)+1);p.vibrationUntil=now+3700;break;
    case "seed":p.seedUntil=now+1900;p.slowUntil=Math.max(p.slowUntil||0,now+900);break;
  }
}
function hit(world,target,damage,owner,status,now){if(world.hit(target,damage,owner)){if(status)applyStatus(target,status,now,owner);return true;}return false;}
function blast(world,owner,x,y,radius,damage,status,knockback=0,now=world.now(),weighted=false){
  world.effect({type:"blast",x,y,radius,color:getCharacter(owner.characterId).color,weighted});
  for(const target of world.players())if(target.id!==owner.id&&target.alive){const dx=target.x-x,dy=target.y-y,d=Math.hypot(dx,dy);if(d>radius+19)continue;const amount=weighted?Math.max(8,Math.round(damage*(1-.58*Math.min(1,d/radius)))):damage;hit(world,target,amount,owner.id,status,now);if(knockback&&d>0)world.push(target,dx/d*knockback,dy/d*knockback);}
}
function forwardPoint(world,p,d){for(const factor of[1,.8,.6,.4]){const x=p.x+Math.cos(p.angle)*d*factor,y=p.y+Math.sin(p.angle)*d*factor;if(world.canStand(x,y,19))return{x,y};}return{x:p.x,y:p.y};}
function dash(world,p,d,ignoreWalls=false){const dx=Math.cos(p.angle),dy=Math.sin(p.angle);if(ignoreWalls){for(let factor=1;factor>=.45;factor-=.1){const x=p.x+dx*d*factor,y=p.y+dy*d*factor;if(world.canStand(x,y,19)){p.x=x;p.y=y;world.effect({type:"flight",x,y,id:p.id,color:getCharacter(p.characterId).color});return true;}}return false;}
  for(let i=0;i<Math.ceil(d/12);i++){const x=p.x+dx*12,y=p.y+dy*12;if(!world.canStand(x,y,19))break;world.moveTo(p,x,y);}world.effect({type:"dash",x:p.x,y:p.y,id:p.id,color:getCharacter(p.characterId).color});return true;}
function addField(world,p,now,type,x,y,radius,duration,interval=700,damage=0,status=null){const field={type,x,y,radius,owner:p.id,color:getCharacter(p.characterId).color,until:now+duration,nextTick:now+Math.min(interval,500),interval,damage,status,growAt:type==="seed"?now+1050:0};world.fields.push(field);world.effect({type:"field",fieldType:type,x,y,radius,color:field.color,owner:p.id});return field;}
function quake(world,p,now,x,y,radius,damage){const old=world.fields.find(f=>f.type==="fissure"&&f.owner===p.id&&Math.hypot(f.x-x,f.y-y)<radius*.65&&f.until>now);blast(world,p,x,y,radius,damage,"slow",22,now,true);if(old){old.until=now;blast(world,p,x,y,Math.min(radius,145),22,"slow",40,now,true);world.addObstacle?.([x-22,y-22,44,44],now+3600,"earthRubble");world.effect({type:"collapse",x,y,radius:145,color:getCharacter(p.characterId).color});}addField(world,p,now,"fissure",x,y,Math.min(radius,165),4500,600,0,"slow");world.effect({type:"quake",x,y,radius,color:getCharacter(p.characterId).color});}
function fireBasic(world,p,now){
  if(!p.alive||p.jump||p.downedUntil>now||p.ammo<1)return false;
  const c=getCharacter(p.characterId),attack=p.characterId==="gear"&&p.form==="pilot"?c.pilotAttack:c.attack;
  const cooldown=(attack.cooldown||.265)*(p.fastFireUntil>now?.65:1)*1000;
  if(now-(p.lastShot||0)<cooldown)return false;
  let bonus=p.bonusDamageUntil>now?8:0;
  if(p.characterId==="volt"&&p.charge>=60){bonus+=6;p.charge-=35;}
  if(p.characterId==="plant"){const gap=now-(p.lastShot||0);p.beat=gap>=480&&gap<=900?Math.min(3,(p.beat||0)+1):0;bonus+=p.beat*2;}
  p.ammo--;p.lastShot=now;p.lastReload=now;
  world.shot(p,p.angle,{...attack,damage:attack.damage+bonus,color:c.color,source:p.characterId});
  world.effect({type:"shot",x:p.x,y:p.y,id:p.id,color:c.color,characterId:p.characterId});return true;
}
function projectileImpact(world,b,target,now){
  const owner=world.players().find(p=>p.id===b.owner);if(!owner)return false;
  let damage=b.damage;
  if(owner.characterId==="flame"&&target.burnUntil>now)damage+=8;
  if(owner.characterId==="healer"&&target.wetUntil>now)damage+=6;
  if(!hit(world,target,damage,owner.id,b.status,now))return false;
  if(b.splash){for(const other of world.players())if(other.id!==owner.id&&other.id!==target.id&&other.alive&&Math.hypot(other.x-target.x,other.y-target.y)<b.splash+18)hit(world,other,Math.round(damage*.34),owner.id,null,now);}
  if(b.knockback){const d=Math.hypot(b.vx,b.vy)||1;world.push(target,b.vx/d*b.knockback,b.vy/d*b.knockback);}
  if(owner.characterId==="flame"&&target.burnUntil>now){world.effect({type:"flare",x:target.x,y:target.y,color:owner.color});world.ignitePlants?.(target.x,target.y,55,now);}
  if(owner.characterId==="volt"){owner.charge=Math.min(100,(owner.charge||0)+20);const other=world.players().filter(p=>p.id!==owner.id&&p.id!==target.id&&p.alive&&Math.hypot(p.x-target.x,p.y-target.y)<145).sort((a,c)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(c.x-target.x,c.y-target.y))[0];if(other){hit(world,other,8,owner.id,"slow",now);world.effect({type:"chain",x:target.x,y:target.y,toX:other.x,toY:other.y,color:owner.color});}}
  if(owner.characterId==="plant"&&target.vibrationStacks>=3){target.vibrationStacks=0;blast(world,owner,target.x,target.y,75,12,null,45,now);}
  if(owner.characterId==="alchemist"&&b.status==="seed")addField(world,owner,now,"seed",target.x,target.y,60,3600,720,9,"root");
  if(owner.characterId==="star")owner.hp=Math.min(getMaxHp(owner),owner.hp+4);
  return true;
}
function useSkill(world,p,now){
  if(!p.alive||p.jump||p.downedUntil>now||now<(p.skillReadyAt||0))return{ok:false,reason:"cooldown"};
  const c=getCharacter(p.characterId),type=c.skill.type;p.skillReadyAt=now+c.skill.cooldown*1000;
  world.effect({type:"skill",skill:type,x:p.x,y:p.y,id:p.id,color:c.color});
  switch(type){
    case "mechGuard":if(p.form==="mech"){p.shieldHits=2;p.speedBuffUntil=now+2500;}else{dash(world,p,145);p.dodgeCharges=1;p.speedBuffUntil=now+3300;}break;
    case "flameRing":blast(world,p,p.x,p.y,125,22,"burn",0,now);addField(world,p,now,"fire",p.x,p.y,95,3500,650,7,"burn");world.ignitePlants?.(p.x,p.y,120,now);break;
    case "vault":dash(world,p,175,true);p.invulnUntil=Math.max(p.invulnUntil||0,now+550);blast(world,p,p.x,p.y,70,18,null,0,now);break;
    case "icePatch":{const q=forwardPoint(world,p,155);addField(world,p,now,"ice",q.x,q.y,110,4700,600,5,"chill");break;}
    case "chain":for(const offset of[-.24,0,.24])world.shot(p,p.angle+offset,{damage:18,speed:850,range:575,size:7,status:"shock",source:p.characterId,color:c.color});p.charge=Math.min(100,p.charge+18);break;
    case "waterPool":addField(world,p,now,"water",p.x,p.y,110,5200,640,5,"wet");p.hp=Math.min(getMaxHp(p),p.hp+15);break;
    case "gust":blast(world,p,p.x,p.y,148,14,"slow",120,now);p.speedBuffUntil=now+3500;break;
    case "flight":dash(world,p,215,true);p.invulnUntil=Math.max(p.invulnUntil||0,now+600);p.flightUntil=now+700;break;
    case "quake":quake(world,p,now,p.x,p.y,165,31);break;
    case "flashDash":dash(world,p,215);p.dodgeCharges=1;p.speedBuffUntil=now+3200;blast(world,p,p.x,p.y,80,12,"slow",0,now);world.effect({type:"afterimage",x:p.x,y:p.y,color:c.color});break;
    case "poisonPool":{const q=forwardPoint(world,p,160);addField(world,p,now,"poison",q.x,q.y,90,4700,650,7,"poison");break;}
    case "seedling":{const q=forwardPoint(world,p,150);addField(world,p,now,"seed",q.x,q.y,75,5000,650,10,"root");break;}
    case "timeShift":p.speedBuffUntil=now+4200;blast(world,p,p.x,p.y,145,9,"time",0,now);world.effect({type:"timeShift",x:p.x,y:p.y,color:c.color});break;
    case "echo":blast(world,p,p.x,p.y,145,20,"vibration",70,now);break;
    case "soulGuard":p.shieldHits=Math.min(2,(p.shieldHits||0)+2);p.hp=Math.min(getMaxHp(p),p.hp+16);break;
  }
  return{ok:true,cooldown:c.skill.cooldown};
}
function useSuper(world,p,now,target){
  if(!p.alive||p.jump||p.downedUntil>now||p.super<100)return{ok:false,reason:"not-ready"};
  const c=getCharacter(p.characterId),type=c.super.type;
  if(type==="jump"){
    if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return{ok:false,reason:"target"};
    const d=Math.hypot(target.x-p.x,target.y-p.y);if(d>525||d<35||!world.canStand(target.x,target.y,21))return{ok:false,reason:"range"};
    p.super=0;p.jump={fromX:p.x,fromY:p.y,toX:target.x,toY:target.y,startAt:now,landAt:now+650};world.effect({type:"jump",x:p.x,y:p.y,toX:target.x,toY:target.y,id:p.id,color:c.color});return{ok:true};
  }
  p.super=0;world.effect({type:"super",super:type,x:p.x,y:p.y,id:p.id,color:c.color});
  switch(type){
    case "reboot":if(p.form==="pilot"&&p.mechReturns<1){p.mechReturns++;p.form="mech";p.maxHp=c.hp;p.hp=95;p.invulnUntil=Math.max(p.invulnUntil||0,now+800);world.effect({type:"mechReboot",x:p.x,y:p.y,id:p.id});}else for(const offset of[-.12,0,.12])world.shot(p,p.angle+offset,{damage:39,speed:865,range:780,size:14,splash:45,source:p.characterId,color:c.color});break;
    case "meteor":{const q=target&&Number.isFinite(target.x)&&Math.hypot(target.x-p.x,target.y-p.y)<420?target:forwardPoint(world,p,345);blast(world,p,q.x,q.y,145,42,"burn",0,now);addField(world,p,now,"fire",q.x,q.y,115,3800,650,8,"burn");world.ignitePlants?.(q.x,q.y,145,now);break;}
    case "blizzard":blast(world,p,p.x,p.y,215,35,"chill",0,now);addField(world,p,now,"ice",p.x,p.y,175,5100,600,8,"chill");break;
    case "storm":for(let i=0;i<10;i++)world.shot(p,i*TAU/10,{damage:23,speed:810,range:650,size:9,status:"shock",source:p.characterId,color:c.color});p.charge=100;break;
    case "tidal":{const q=forwardPoint(world,p,230);blast(world,p,q.x,q.y,185,38,"wet",80,now);addField(world,p,now,"water",q.x,q.y,145,4600,650,6,"wet");break;}
    case "tornado":blast(world,p,p.x,p.y,215,34,"slow",145,now);addField(world,p,now,"wind",p.x,p.y,150,3500,680,6,"slow");break;
    case "dive":{const q=target&&Number.isFinite(target.x)&&Math.hypot(target.x-p.x,target.y-p.y)<360&&world.canStand(target.x,target.y,19)?target:forwardPoint(world,p,300);p.x=q.x;p.y=q.y;p.invulnUntil=Math.max(p.invulnUntil||0,now+500);blast(world,p,p.x,p.y,125,43,null,40,now);world.effect({type:"dive",x:p.x,y:p.y,id:p.id});break;}
    case "collapse":quake(world,p,now,p.x,p.y,235,49);p.shieldHits=Math.min(2,(p.shieldHits||0)+1);break;
    case "flashBurst":dash(world,p,270);p.dodgeCharges=1;blast(world,p,p.x,p.y,165,39,"slow",65,now);world.effect({type:"flash",x:p.x,y:p.y});break;
    case "venomBurst":for(const enemy of world.players())if(enemy.id!==p.id&&enemy.alive&&enemy.poisonStacks>0&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<280){hit(world,enemy,12+enemy.poisonStacks*9,p.id,"poison",now);enemy.poisonStacks=1;world.effect({type:"venomBurst",x:enemy.x,y:enemy.y});}addField(world,p,now,"poison",p.x,p.y,165,4000,640,9,"poison");break;
    case "forest":for(const offset of[-1,0,1]){const a=p.angle+offset*TAU/3;addField(world,p,now,"seed",p.x+Math.cos(a)*120,p.y+Math.sin(a)*120,80,5400,650,11,"root");}p.hp=Math.min(getMaxHp(p),p.hp+25);break;
    case "rewind":{const record=[...(p.history||[])].reverse().find(v=>v.at<=now-2200)||p.history?.[0];if(record&&world.canStand(record.x,record.y,19)){const old={x:p.x,y:p.y};p.x=record.x;p.y=record.y;p.hp=Math.min(getMaxHp(p),p.hp+Math.min(35,Math.max(0,record.hp-p.hp)));world.effect({type:"rewind",x:p.x,y:p.y,fromX:old.x,fromY:old.y,id:p.id});}else p.hp=Math.min(getMaxHp(p),p.hp+22);blast(world,p,p.x,p.y,140,14,"time",0,now);break;}
    case "sonic":blast(world,p,p.x,p.y,220,41,"vibration",95,now);break;
    case "spirits":for(let i=0;i<10;i++)world.shot(p,i*TAU/10,{damage:23,speed:775,range:650,size:8,status:"soul",source:p.characterId,color:c.color});p.shieldHits=Math.min(2,(p.shieldHits||0)+1);break;
  }
  return{ok:true};
}
function resolveLethal(world,p,now){
  if(p.characterId==="gear"&&p.form==="mech"){p.form="pilot";p.maxHp=getCharacter("gear").pilotHp;p.hp=p.maxHp;p.invulnUntil=now+850;p.shieldHits=0;world.effect({type:"mechBreak",x:p.x,y:p.y,id:p.id});blast(world,p,p.x,p.y,100,16,null,50,now);return true;}
  if(p.characterId==="star"&&p.reviveCharges>0){p.reviveCharges--;p.downedUntil=now+1350;p.hp=1;p.invulnUntil=now+2100;world.effect({type:"spiritDown",x:p.x,y:p.y,id:p.id});return true;}
  return false;
}
function tick(world,now){
  for(const p of world.players()){
    if(p.jump&&now>=p.jump.landAt){const jump=p.jump;p.jump=null;world.moveTo(p,jump.toX,jump.toY);world.effect({type:"land",x:p.x,y:p.y,radius:125,id:p.id,color:getCharacter(p.characterId).color});blast(world,p,p.x,p.y,125,43,null,42,now);p.skillReadyAt=Math.max(now,(p.skillReadyAt||now)-2000);}
    if(!p.alive)continue;
    if(p.downedUntil&&now>=p.downedUntil){p.downedUntil=0;p.hp=Math.max(p.hp,Math.ceil(getMaxHp(p)*.44));p.invulnUntil=now+1100;world.effect({type:"spiritRise",x:p.x,y:p.y,id:p.id});}
    if(p.characterId==="music"&&now-(p.lastHistoryAt||0)>=180){p.history ||= [];p.history.push({x:p.x,y:p.y,hp:p.hp,at:now});p.history=p.history.filter(v=>now-v.at<4400);p.lastHistoryAt=now;}
    if(p.burnUntil>now&&now>=(p.nextBurn||0)){p.nextBurn=now+650;world.hit(p,5,p.burnOwner);}
    if(p.poisonUntil>now&&now>=(p.nextPoison||0)){p.nextPoison=now+720;world.hit(p,3+Math.min(4,p.poisonStacks||1)*2,p.poisonOwner);}
    if(p.poisonUntil<=now)p.poisonStacks=0;if(p.vibrationUntil<=now)p.vibrationStacks=0;
  }
  for(let i=world.fields.length-1;i>=0;i--)if(world.fields[i].until<=now)world.fields.splice(i,1);
  for(const field of world.fields){if(field.type==="seed"&&field.growAt&&now>=field.growAt){field.growAt=0;world.effect({type:"plantGrow",x:field.x,y:field.y,owner:field.owner,radius:field.radius,color:field.color});}if(now<field.nextTick)continue;field.nextTick=now+field.interval;
    for(const p of world.players())if(p.alive&&Math.hypot(p.x-field.x,p.y-field.y)<field.radius+19){if(p.id===field.owner){if(field.type==="water")p.hp=Math.min(getMaxHp(p),p.hp+3);if(field.type==="water"&&p.characterId==="healer")p.speedBuffUntil=now+900;continue;}if(field.type==="fissure"){applyStatus(p,"slow",now,field.owner);continue;}if(field.type==="seed"&&field.growAt)continue;if(field.type==="ice"&&p.characterId==="frost")continue;if(field.type==="wind")world.push(p,(p.x-field.x)*.22,(p.y-field.y)*.22);hit(world,p,field.damage,field.owner,field.status,now);}
  }
}
const rules={getCharacter,getMaxHp,roster,initFighter,applyStatus,fireBasic,projectileImpact,useSkill,useSuper,resolveLethal,tick};
if(typeof module!=="undefined"&&module.exports)module.exports=rules;
if(typeof window!=="undefined")window.YungeonCombat=rules;
