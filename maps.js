"use strict";
(function(){

// Map 1 arrays are the original arena geometry and spawn order, unchanged.
const classicWalls=[[273,217,174,30],[273,815,174,30],[207,318,30,103],[483,318,30,103],[207,659,30,105],[483,659,30,105],[207,390,96,30],[417,390,96,30],[207,660,96,30],[417,660,96,30],[0,452,98,45],[622,452,98,45],[0,585,98,45],[622,585,98,45],[69,382,30,116],[621,382,30,116],[69,584,30,116],[621,584,30,116],[0,296,98,30],[622,296,98,30],[0,754,98,30],[622,754,98,30],[0,0,60,48],[660,0,60,48],[0,1032,60,48],[660,1032,60,48]];
const classicWaters=[[0,0,93,278],[627,0,93,278],[0,497,93,88],[627,497,93,88],[0,800,93,280],[627,800,93,280]];
const classicSpawns=[[360,965],[360,96],[150,535],[570,535]];
const classicBushes=[[273,152,174,66],[238,333,245,62],[238,686,245,78],[273,845,174,79]];
const maps=[
  {id:"classic",name:"클래식 아레나",tag:"기본 전투",description:"벽과 물길을 이용하는 균형 잡힌 원형 아레나",features:["🧱 기존 벽","💧 물 지형","⚔ 균형 전투"],palette:{floor:"#ed986c",tile:"#f6a377",wall:"#19b99c",accent:"#77dbef"},walls:classicWalls,waters:classicWaters,spawns:classicSpawns,bushes:classicBushes,hazards:[],specialZones:[],jumpPads:[],portals:[]},
  {id:"volcano",name:"화산 지대",tag:"고위험 공격전",description:"용암 사이 좁은 통로와 예고 후 터지는 화산",features:["🌋 분출 예고","🔥 용암 지속 피해","⚔ 위험한 중앙"],palette:{floor:"#352d37",tile:"#44343a",wall:"#7d655b",accent:"#ff8742"},walls:[[80,215,175,28],[465,215,175,28],[80,835,175,28],[465,835,175,28],[260,310,28,145],[432,310,28,145],[260,625,28,145],[432,625,28,145],[95,455,115,28],[510,455,115,28],[95,597,115,28],[510,597,115,28],[315,260,90,28],[315,790,90,28]],waters:[],spawns:[[360,960],[360,115],[137,535],[583,535]],bushes:[],hazards:[{type:"lava",rect:[285,410,150,260]},{type:"lava",rect:[65,270,145,125]},{type:"lava",rect:[510,685,145,125]}],specialZones:[{type:"vent",x:360,y:535,radius:125},{type:"vent",x:150,y:355,radius:100},{type:"vent",x:570,y:725,radius:100}],jumpPads:[],portals:[]},
  {id:"ice",name:"얼음 호수",tag:"미끄럼 제어전",description:"넓은 빙판에서 관성을 읽고 깨지는 얼음을 피하세요",features:["❄ 미끄러운 빙판","💥 깨지는 얼음","🏝 좁은 육지"],palette:{floor:"#aacbd0",tile:"#bcdce0",wall:"#6f9baa",accent:"#8cf1ff"},walls:[[80,245,155,28],[485,245,155,28],[80,808,155,28],[485,808,155,28],[75,415,100,25],[545,415,100,25],[75,635,100,25],[545,635,100,25],[300,340,120,24],[300,718,120,24]],waters:[[0,0,60,130],[660,950,60,130]],spawns:[[360,960],[360,115],[130,535],[590,535]],bushes:[],hazards:[],specialZones:[{type:"ice",rect:[90,285,540,510]},{type:"thinIce",rect:[205,420,125,135]},{type:"thinIce",rect:[390,555,125,135]}],jumpPads:[],portals:[]},
  {id:"jungle",name:"고대 정글",tag:"은신·길목전",description:"우거진 수풀과 시간이 지나면 자라는 식물",features:["🌿 시야를 가리는 수풀","🪴 변화하는 식물","🏛 넓은 중앙"],palette:{floor:"#6e9564",tile:"#82a570",wall:"#547462",accent:"#b5e27a"},walls:[[55,205,190,30],[475,205,190,30],[55,845,190,30],[475,845,190,30],[180,285,30,130],[510,285,30,130],[180,670,30,130],[510,670,30,130],[65,480,125,28],[530,480,125,28],[65,575,125,28],[530,575,125,28],[290,285,140,25],[290,770,140,25]],waters:[[0,430,55,200],[665,430,55,200]],spawns:[[360,970],[360,110],[120,540],[600,540]],bushes:[[215,248,290,60],[85,320,80,115],[555,320,80,115],[85,645,80,115],[555,645,80,115],[215,818,290,65]],hazards:[],specialZones:[{type:"fog",rect:[205,330,310,430]},{type:"grow",x:260,y:490},{type:"grow",x:460,y:585},{type:"grow",x:360,y:370}],jumpPads:[],portals:[]},
  {id:"sky",name:"공중 도시",tag:"기동·추락전",description:"좁은 다리와 점프 패드, 연결된 포털로 빠르게 이동",features:["🕳 추락 후 안전 복귀","🌀 연결 포털","🚀 교대 점프 패드"],palette:{floor:"#95c8d8",tile:"#aedbe3",wall:"#4d86a7",accent:"#ffd676"},walls:[[235,260,25,180],[460,260,25,180],[235,640,25,180],[460,640,25,180],[85,340,120,25],[515,340,120,25],[85,715,120,25],[515,715,120,25]],waters:[],spawns:[[360,950],[360,125],[125,535],[595,535]],bushes:[],hazards:[{type:"pit",rect:[0,260,75,245]},{type:"pit",rect:[645,575,75,245]},{type:"pit",rect:[270,330,180,55]},{type:"pit",rect:[270,695,180,55]},{type:"pit",rect:[75,755,110,155]},{type:"pit",rect:[535,170,110,155]}],specialZones:[{type:"bridge",rect:[260,455,200,170]}],jumpPads:[{x:165,y:390,toX:355,toY:500},{x:555,y:690,toX:365,toY:585}],portals:[{x:120,y:610,toX:590,toY:430},{x:590,y:430,toX:120,toY:610}]}
];
const byId=new Map(maps.map(map=>[map.id,map]));
const get=id=>byId.get(id)||maps[0];
const selectable=[{id:"random",name:"🎲 랜덤",tag:"서버 결정",description:"대전 시작 직전에 서버가 5개 맵 중 하나를 선택합니다.",features:["🎲 서버가 추첨"]},...maps];
const contains=(rect,x,y,pad=0)=>x+pad>rect[0]&&x-pad<rect[0]+rect[2]&&y+pad>rect[1]&&y-pad<rect[1]+rect[3];
const inZone=(zones,type,x,y)=>zones.some(zone=>zone.type===type&&contains(zone.rect,x,y));
function blocked(map,state,x,y,r=19){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<r||y<r||x>720-r||y>1080-r)return true;
  return [...map.walls,...map.waters,...(state?.dynamicWalls||[]).map(v=>v.rect)].some(rect=>contains(rect,x,y,r));
}
function createState(mapId,now=Date.now()){return{mapId:get(mapId).id,nextEventAt:now+7000,warning:null,dynamicWalls:[],brokenIce:[],padsActive:true,phase:0};}
function publicState(state){return{warning:state.warning,dynamicWalls:state.dynamicWalls,brokenIce:state.brokenIce,padsActive:state.padsActive,phase:state.phase};}
function safePoint(map,state,p){const options=map.spawns.filter(([x,y])=>!blocked(map,state,x,y,21));return options.sort((a,b)=>(a[0]-p.x)**2+(a[1]-p.y)**2-(b[0]-p.x)**2-(b[1]-p.y)**2)[0]||map.spawns[0];}
function move(map,state,p,dx,dy,dt,now,moveTo){
  if(p.rootUntil>now||p.jump||p.downedUntil>now)return;
  const magnitude=Math.hypot(dx,dy);let speed=p.form==="pilot"?305:(p.moveSpeed||p.baseSpeed||220);
  if(p.slowUntil>now)speed*=.57;if(p.speedBuffUntil>now)speed*=1.3;
  const icy=map.id==="ice"&&inZone(map.specialZones,"ice",p.x,p.y);
  if(icy){if(p.characterId==="frost")speed*=1.08;const smoothing=p.characterId==="frost"?.21:.105;p.slideVx=(p.slideVx||0)*(1-smoothing)+(magnitude?dx/magnitude*speed:0)*smoothing;p.slideVy=(p.slideVy||0)*(1-smoothing)+(magnitude?dy/magnitude*speed:0)*smoothing;moveTo(p,p.x+p.slideVx*dt,p.y);moveTo(p,p.x,p.y+p.slideVy*dt);}
  else{p.slideVx=0;p.slideVy=0;if(magnitude<.01)return;moveTo(p,p.x+dx/magnitude*speed*dt,p.y);moveTo(p,p.x,p.y+dy/magnitude*speed*dt);}
}
function projectileTerrain(map,state,bullet,now,emit){
  if(map.id!=="ice"||bullet.damage<20)return;
  for(const zone of map.specialZones.filter(v=>v.type==="thinIce"))if(contains(zone.rect,bullet.x,bullet.y)&&!state.brokenIce.some(v=>v.rectIndex===map.specialZones.indexOf(zone)&&v.until>now)){
    state.brokenIce.push({rectIndex:map.specialZones.indexOf(zone),rect:zone.rect,until:now+4200});emit({type:"iceBreak",x:bullet.x,y:bullet.y,rect:zone.rect});break;
  }
}
function tickEnvironment(map,state,players,now,api){
  state.dynamicWalls=state.dynamicWalls.filter(v=>v.until>now);state.brokenIce=state.brokenIce.filter(v=>v.until>now);
  if(map.id==="volcano"){
    if(!state.warning&&now>=state.nextEventAt){const vents=map.specialZones.filter(v=>v.type==="vent"),vent=vents[state.phase++%vents.length];state.warning={x:vent.x,y:vent.y,radius:vent.radius,until:now+1900};api.effect({type:"volcanoWarn",...state.warning});}
    if(state.warning&&now>=state.warning.until){const vent=state.warning;state.warning=null;state.nextEventAt=now+8200;api.effect({type:"eruption",x:vent.x,y:vent.y,radius:vent.radius});for(const p of players)if(p.alive&&Math.hypot(p.x-vent.x,p.y-vent.y)<vent.radius+18)api.hit(p,38,null);}
  }
  if(map.id==="ice"&&now>=state.nextEventAt){const zones=map.specialZones.filter(v=>v.type==="thinIce"),zone=zones[state.phase++%zones.length];state.brokenIce.push({rectIndex:map.specialZones.indexOf(zone),rect:zone.rect,until:now+4200});state.nextEventAt=now+11000;api.effect({type:"iceBreak",x:zone.rect[0]+zone.rect[2]/2,y:zone.rect[1]+zone.rect[3]/2,rect:zone.rect});}
  if(map.id==="jungle"&&now>=state.nextEventAt){const points=map.specialZones.filter(v=>v.type==="grow"),point=points[state.phase++%points.length],rect=[point.x-25,point.y-25,50,50];state.dynamicWalls.push({rect,until:now+5200,kind:"junglePlant"});state.nextEventAt=now+9000;api.effect({type:"plantGrow",x:point.x,y:point.y,rect,until:now+5200});}
  if(map.id==="sky"&&now>=state.nextEventAt){state.padsActive=!state.padsActive;state.nextEventAt=now+8000;api.effect({type:"padsToggle",active:state.padsActive});}
  for(const p of players){if(!p.alive||p.downedUntil>now)continue;
    if(map.id==="volcano"&&map.hazards.some(v=>v.type==="lava"&&contains(v.rect,p.x,p.y))&&now>=(p.envDamageAt||0)){p.envDamageAt=now+900;api.hit(p,7,null);api.effect({type:"lavaHit",x:p.x,y:p.y,id:p.id});}
    if(map.id==="ice"&&state.brokenIce.some(v=>contains(v.rect,p.x,p.y))&&now>=(p.envDamageAt||0)){p.envDamageAt=now+1250;api.hit(p,15,null);const [x,y]=safePoint(map,state,p);p.x=x;p.y=y;api.effect({type:"iceFall",x,y,id:p.id});}
    if(map.id==="sky"){
      if(map.hazards.some(v=>v.type==="pit"&&contains(v.rect,p.x,p.y))&&now>=(p.fallReadyAt||0)){p.fallReadyAt=now+1800;api.hit(p,24,null);const [x,y]=safePoint(map,state,p);p.x=x;p.y=y;api.effect({type:"fall",x,y,id:p.id});}
      if(state.padsActive&&now>=(p.padReadyAt||0))for(const pad of map.jumpPads)if(Math.hypot(p.x-pad.x,p.y-pad.y)<34){p.padReadyAt=now+3300;p.x=pad.toX;p.y=pad.toY;p.invulnUntil=Math.max(p.invulnUntil||0,now+450);api.effect({type:"padJump",x:p.x,y:p.y,id:p.id});break;}
      if(now>=(p.portalReadyAt||0))for(const portal of map.portals)if(Math.hypot(p.x-portal.x,p.y-portal.y)<28){p.portalReadyAt=now+3000;p.x=portal.toX;p.y=portal.toY;api.effect({type:"portal",x:p.x,y:p.y,id:p.id});break;}
    }
  }
}
const engine={maps,selectable,get,blocked,contains,inZone,createState,publicState,safePoint,move,projectileTerrain,tickEnvironment};
if(typeof module!=="undefined"&&module.exports)module.exports=engine;
if(typeof window!=="undefined")window.YungeonMaps=engine;
})();
