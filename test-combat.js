"use strict";

const assert=require("node:assert/strict");
const combat=require("./combat-rules");
const roster=require("./characters");

assert.equal(roster.length,15);
assert.equal(roster.filter(c=>c.gender==="남").length,11);
assert.equal(roster.filter(c=>c.gender==="여").length,4);
assert.equal(new Set(roster.map(c=>c.skill.type)).size,15);
assert.equal(new Set(roster.map(c=>c.super.type)).size,15);
assert.deepEqual(roster.map(c=>c.name),["메카","화린","점핑 잭","쉘","우르","모리스","모스코","오리엔","바위르","섬광","베놈","플랜트","타임슬리퍼","켄조","리코트"]);
assert.equal(combat.getCharacter("flame").gender,"남");

for(const fighter of roster){
  assert.ok(fighter.attack.damage>0&&fighter.attack.range>0,`${fighter.name}: 원거리 기본 공격`);
  assert.ok(fighter.skill.cooldown>=9&&fighter.skill.cooldown<=12,`${fighter.name}: 스킬 쿨타임`);
  const p={id:1,characterId:fighter.id,x:100,y:100,angle:0,hp:fighter.hp,ammo:3,super:100,alive:true,lastShot:0,lastReload:0,shieldHits:0,skillReadyAt:0};
  const enemy={id:2,characterId:"gear",x:315,y:100,angle:Math.PI,hp:120,ammo:3,super:0,alive:true,shieldHits:0};
  const shots=[],events=[],fields=[];
  const world={fields,now:()=>10000,players:()=>[p,enemy],hit:(target,amount)=>{target.hp=Math.max(0,target.hp-amount);return true;},canStand:()=>true,moveTo:(player,x,y)=>{player.x=x;player.y=y;return true;},push:(player,dx,dy)=>{player.x+=dx;player.y+=dy;},shot:(player,a,options)=>shots.push({a,options}),effect:event=>events.push(event)};
  assert.equal(combat.fireBasic(world,p,10000),true,`${fighter.name}: 발사`);
  assert.equal(shots.length,1,`${fighter.name}: 기본 탄환`);
  assert.equal(p.ammo,2);
  assert.equal(combat.useSkill(world,p,10000).ok,true,`${fighter.name}: 스킬`);
  assert.equal(combat.useSkill(world,p,10001).ok,false,`${fighter.name}: 재사용 대기`);
  assert.equal(p.skillReadyAt,10000+fighter.skill.cooldown*1000);
  const landing=fighter.id==="jumper"?{x:p.x+200,y:p.y}:null;
  if(landing){enemy.x=landing.x+10;enemy.y=landing.y;}
  assert.equal(combat.useSuper(world,p,10000,landing).ok,true,`${fighter.name}: 필살기`);
  assert.equal(p.super,0);
  if(fighter.id==="jumper"){
    assert.equal(p.jump.toX,landing.x);
    combat.tick(world,10651);
    assert.equal(p.x,landing.x);
    assert.ok(enemy.hp<120,"도약 착지 피해");
    p.super=100;
    assert.equal(combat.useSuper(world,p,11000,{x:p.x+600,y:p.y}).ok,false,"맵 절반 점프 제한");
  }
}
console.log("15명 원거리 공격·일반 스킬·쿨타임·필살기·점프 착지 검사 통과");

function fixture(characterId){const p={id:1,characterId,x:300,y:500,angle:0,ammo:3,super:100,alive:true,lastShot:0,lastReload:0,skillReadyAt:0,shieldHits:0},enemy={id:2,characterId:"flame",x:335,y:500,hp:100,alive:true,invulnUntil:0,shieldHits:0};combat.initFighter(p,10000);p.invulnUntil=0;const fields=[],events=[],obstacles=[];const world={fields,now:()=>10000,players:()=>[p,enemy],hit:(target,amount)=>{target.hp=Math.max(0,target.hp-amount);return true;},canStand:()=>true,moveTo:(fighter,x,y)=>{fighter.x=x;fighter.y=y;return true;},push:()=>{},shot:()=>{},effect:e=>events.push(e),addObstacle:(...args)=>obstacles.push(args)};return{p,enemy,world,fields,events,obstacles};}
{
  const {p,world,events}=fixture("gear");assert.equal(p.form,"mech");p.hp=0;assert.equal(combat.resolveLethal(world,p,10000),true);assert.equal(p.form,"pilot");assert.equal(p.alive,true);assert.equal(p.deaths||0,0);assert.equal(p.hp,55);assert.ok(events.some(e=>e.type==="mechBreak"));p.hp=0;assert.equal(combat.resolveLethal(world,p,12000),false);combat.initFighter(p,17000);assert.equal(p.form,"mech");assert.equal(p.invulnUntil,20000);
}
{
  const {p,enemy,world,fields,events,obstacles}=fixture("earth");assert.equal(combat.useSkill(world,p,10000).ok,true);assert.ok(enemy.hp<100);assert.ok(fields.some(f=>f.type==="fissure"));assert.ok(events.some(e=>e.type==="quake"));p.skillReadyAt=0;assert.equal(combat.useSkill(world,p,10100).ok,true);assert.ok(events.some(e=>e.type==="collapse"));assert.equal(obstacles[0][2],"earthRubble");
}
{
  const {p,world,events}=fixture("music");p.history=[{x:150,y:200,hp:88,at:7000}];p.x=300;p.y=500;p.hp=30;assert.equal(combat.useSuper(world,p,10000).ok,true);assert.deepEqual([p.x,p.y],[150,200]);assert.equal(p.hp,65);assert.ok(events.some(e=>e.type==="rewind"));
}
{
  const {p,world}=fixture("star");p.hp=0;assert.equal(combat.resolveLethal(world,p,10000),true);assert.equal(p.reviveCharges,0);assert.equal(p.downedUntil,11350);combat.tick(world,11400);assert.ok(p.hp>1);p.invulnUntil=0;p.hp=0;assert.equal(combat.resolveLethal(world,p,13000),false);combat.initFighter(p,18000);assert.equal(p.reviveCharges,1);assert.equal(p.downedUntil,0);
}
{
  const p={characterId:"shadow",hp:1,alive:true,burnUntil:100,poisonUntil:100,poisonStacks:4,slowUntil:100,rootUntil:100,speedBuffUntil:100,bonusDamageUntil:100,shieldHits:2};combat.initFighter(p,20000);assert.equal(p.poisonStacks,0);assert.equal(p.burnUntil,0);assert.equal(p.speedBuffUntil,0);assert.equal(p.shieldHits,0);assert.equal(p.invulnUntil,23000);combat.applyStatus(p,"poison",24000,2);assert.equal(p.poisonStacks,1);combat.applyStatus(p,"chill",24000,2);combat.applyStatus(p,"chill",24000,2);combat.applyStatus(p,"chill",24000,2);assert.ok(p.rootUntil>24000);
}
console.log("이름·메카 변신/KO 분기·지진 연계·상태이상·시간 되감기·리코트 제한 부활·respawn 초기화 검사 통과");
