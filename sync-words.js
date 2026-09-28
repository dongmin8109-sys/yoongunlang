"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const source = fs.readFileSync(path.join(root, "dictionary.html"), "utf8");
const entries = [...source.matchAll(/\{ term: "([^"]+)", pronunciation: "([^"]+)", meaning: "([^"]+)", source: "[^"]+" \}/g)]
  .map(match => [match[1], match[2], match[3]]);

const slug = term => term.toLowerCase().normalize("NFKD").replace(/[’'`]/g, "").replace(/\s+/g, "-");
const words = entries.filter(([term]) => fs.existsSync(path.join(root, "audio", `${slug(term)}.mp3`)));
if (words.length !== 65) throw new Error(`녹음과 맞는 사전 단어 65개가 필요합니다. 현재 ${words.length}개입니다.`);

fs.writeFileSync(path.join(root, "words.json"), JSON.stringify(words, null, 2) + "\n");
const gamePath = path.join(root, "game.html");
const game = fs.readFileSync(gamePath, "utf8");
const next = game.replace(/const words=\[[\s\S]*?\];\n  const rewardNames=/,
  `const words=${JSON.stringify(words)};\n  const rewardNames=`);
if (game === next) throw new Error("game.html의 단어 목록을 찾지 못했습니다.");
fs.writeFileSync(gamePath, next);
console.log(`사전 단어 ${words.length}개와 녹음 파일 연결 완료 (녹음 없는 단어 ${entries.length-words.length}개 제외)`);
