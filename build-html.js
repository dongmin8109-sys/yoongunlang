"use strict";

const fs=require("node:fs");
const path=require("node:path");
const gamePath=path.join(__dirname,"game.html");
const files=["characters.js","combat-rules.js","maps.js","sound.js","game-client.js"];
const start="<!-- YUNGEON_BUNDLE_START -->";
const end="<!-- YUNGEON_BUNDLE_END -->";
let html=fs.readFileSync(gamePath,"utf8");
const bundle=files.map(file=>{
  const source=fs.readFileSync(path.join(__dirname,file),"utf8").replace(/<\/script/gi,"<\\/script");
  return `<script>\n${source}\n</script>`;
}).join("\n");
const wrapped=`${start}\n${bundle}\n${end}`;
if(html.includes(start)&&html.includes(end)){
  const begin=html.indexOf(start),finish=html.indexOf(end,begin)+end.length;
  html=html.slice(0,begin)+wrapped+html.slice(finish);
}else{
  const imports=new RegExp(files.map(file=>`<script src="${file.replace(/\./g,"\\.")}"></script>`).join("\\s*"));
  if(!imports.test(html))throw Error("game.html의 클라이언트 스크립트 위치를 찾지 못했습니다.");
  html=html.replace(imports,wrapped);
}
fs.writeFileSync(gamePath,html);
console.log("game.html에 캐릭터·전투·사운드·게임 코드를 포함했습니다.");
