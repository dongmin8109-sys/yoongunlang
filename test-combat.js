"use strict";

const assert=require("node:assert/strict");
const combat=require("./combat-rules");
const roster=require("./characters");

assert.equal(roster.length,15);
assert.equal(roster.filter(c=>c.gender==="남").length,11);
assert.equal(roster.filter(c=>c.gender==="여").length,4);
assert.equal(new Set(roster.map(c=>c.skill.type)).size,15);
assert.equal(new Set(roster.map(c=>c.super.type)).size,15);

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
