"use strict";

// 15 characters: 11 male and 4 female (the closest whole-character split to 70/30).
const characters = [
  {id:"gear",name:"기어탄",gender:"남",icon:"🤖",color:"#42d9f0",role:"로봇 파일럿",description:"탑승 로봇의 중장갑과 초대형 레일포",hp:120,speed:195,attack:{name:"플라즈마 볼트",damage:18,speed:720,range:590,size:8},skill:{name:"과부하 장갑",type:"armor",cooldown:11},super:{name:"거대 레일포",type:"cannon"}},
  {id:"flame",name:"화린",gender:"여",icon:"🔥",color:"#ff7961",role:"화염술사",description:"불씨를 퍼뜨리고 전장을 태우는 공격",hp:95,speed:220,attack:{name:"불씨탄",damage:16,speed:660,range:540,size:8,status:"burn"},skill:{name:"화염 고리",type:"flameRing",cooldown:10},super:{name:"유성 낙하",type:"meteor"}},
  {id:"jumper",name:"도약",gender:"남",icon:"🦘",color:"#f8c462",role:"점프 선봉",description:"맵 절반 거리까지 점프해 착지 충격파",hp:105,speed:235,attack:{name:"도약 창",damage:19,speed:690,range:580,size:7},skill:{name:"전광 돌진",type:"dash",cooldown:9},super:{name:"슈퍼점프",type:"jump"}},
  {id:"frost",name:"서리온",gender:"남",icon:"❄️",color:"#8ecbff",role:"빙결 조율사",description:"느려지는 얼음 파편과 광역 눈보라",hp:100,speed:215,attack:{name:"얼음 파편",damage:17,speed:650,range:570,size:8,status:"slow"},skill:{name:"서리 숨결",type:"freeze",cooldown:10},super:{name:"백야 눈보라",type:"blizzard"}},
  {id:"volt",name:"볼티",gender:"남",icon:"⚡",color:"#ffdc66",role:"번개 사냥꾼",description:"빠른 탄환과 연쇄 전기 공격",hp:90,speed:245,attack:{name:"전기 펄스",damage:16,speed:790,range:600,size:6},skill:{name:"연쇄 스파크",type:"chain",cooldown:9},super:{name:"뇌전 폭풍",type:"storm"}},
  {id:"healer",name:"루미",gender:"여",icon:"💚",color:"#72e5ad",role:"빛의 치유사",description:"회복 탄환과 생존을 돕는 보호 기술",hp:100,speed:215,attack:{name:"빛의 씨앗",damage:15,speed:650,range:550,size:8},skill:{name:"생명의 숨",type:"heal",cooldown:12},super:{name:"성역",type:"sanctuary"}},
  {id:"sniper",name:"핀노",gender:"남",icon:"🎯",color:"#f89abd",role:"정밀 사수",description:"긴 사거리의 고위력 탄환과 관통 광선",hp:80,speed:210,attack:{name:"정밀 탄환",damage:25,speed:950,range:790,size:5,cooldown:0.42},skill:{name:"집중 조준",type:"focus",cooldown:11},super:{name:"직선 관통포",type:"rail"}},
  {id:"trick",name:"카르도",gender:"남",icon:"🃏",color:"#bf95ff",role:"환영 마술사",description:"순간 이동과 사방으로 날리는 카드",hp:95,speed:235,attack:{name:"마법 카드",damage:17,speed:720,range:560,size:7},skill:{name:"허상 이동",type:"blink",cooldown:10},super:{name:"거울 카드",type:"mirror"}},
  {id:"earth",name:"바위르",gender:"남",icon:"🪨",color:"#c69b74",role:"대지 수호자",description:"묵직한 투석과 지진 방어",hp:135,speed:185,attack:{name:"돌 투척",damage:21,speed:570,range:500,size:11},skill:{name:"지진 발구르기",type:"quake",cooldown:11},super:{name:"대지 요새",type:"earthwall"}},
  {id:"wind",name:"휘나",gender:"여",icon:"🌪️",color:"#7eebd5",role:"바람 길잡이",description:"빠른 바람탄과 적을 밀어내는 돌풍",hp:90,speed:255,attack:{name:"바람 칼날",damage:16,speed:810,range:610,size:7},skill:{name:"밀어내는 숨",type:"gust",cooldown:9},super:{name:"회오리",type:"tornado"}},
  {id:"shadow",name:"그림",gender:"남",icon:"🌑",color:"#9b9cdb",role:"그림자 잠입자",description:"은신과 뒤를 노리는 기습",hp:90,speed:245,attack:{name:"암영 단검",damage:19,speed:770,range:550,size:7},skill:{name:"그림자 망토",type:"stealth",cooldown:11},super:{name:"배후 일격",type:"teleStrike"}},
  {id:"alchemist",name:"아루",gender:"남",icon:"🧪",color:"#b6e579",role:"연금술사",description:"독성 물약과 오래 남는 산성 비",hp:100,speed:215,attack:{name:"독 물약",damage:15,speed:630,range:520,size:9,status:"poison"},skill:{name:"독성 웅덩이",type:"poisonPool",cooldown:12},super:{name:"산성 소나기",type:"acidRain"}},
  {id:"music",name:"리듬",gender:"남",icon:"🎵",color:"#ff95c3",role:"음파 연주자",description:"박자 강화와 원형 음파 폭발",hp:95,speed:225,attack:{name:"음표탄",damage:17,speed:700,range:570,size:8},skill:{name:"고속 박자",type:"rhythm",cooldown:10},super:{name:"대합창",type:"sonic"}},
  {id:"plant",name:"덩굴",gender:"남",icon:"🌿",color:"#81d68d",role:"숲의 수호자",description:"가시탄과 움직임을 묶는 덩굴",hp:110,speed:210,attack:{name:"가시탄",damage:17,speed:670,range:560,size:7},skill:{name:"휘감는 뿌리",type:"roots",cooldown:10},super:{name:"생명의 정원",type:"garden"}},
  {id:"star",name:"별하",gender:"여",icon:"🌟",color:"#ffd986",role:"별빛 탐험가",description:"빛의 탄환과 궤도 포화 공격",hp:95,speed:230,attack:{name:"별똥탄",damage:18,speed:750,range:610,size:8},skill:{name:"별빛 충전",type:"starlight",cooldown:10},super:{name:"별의 궤도",type:"orbit"}}
];

if (typeof module !== "undefined" && module.exports) module.exports = characters;
if (typeof window !== "undefined") window.YungeonCharacters = characters;
