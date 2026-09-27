"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const pkg=require("./package.json");
const words=require("./words.json");

assert.equal(pkg.dependencies["firebase-admin"]!==undefined,true);
assert.equal(pkg.dependencies.ws!==undefined,true);
assert.equal(words.length,65);
const game=fs.readFileSync(path.join(__dirname,"game.html"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"server.js"),"utf8");
assert.match(game,/Google로 로그인/);
assert.match(game,/yoongunlang\.firebaseapp\.com/);
assert.match(server,/await accounts\.verify\(m\.token\)/);
console.log("Google 로그인 프로젝트 구성 검사 통과 · 65개 단어 유지");
console.log("실제 로그인/온라인 대전 검사는 Firebase Admin 인증정보를 서버에 설정한 뒤 진행하세요.");
