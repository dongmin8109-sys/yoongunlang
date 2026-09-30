"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const source = fs.readFileSync(path.join(root, "dictionary.html"), "utf8");
const entries = [...source.matchAll(/\{ term: "([^"]+)", pronunciation: "([^"]+)", meaning: "([^"]+)", source: "[^"]+" \}/g)]
  .map(match => [match[1], match[2], match[3]]);

const words = entries;
if (!words.length) throw new Error("사전 단어를 찾지 못했습니다.");

fs.writeFileSync(path.join(root, "words.json"), JSON.stringify(words, null, 2) + "\n");
const gamePath = path.join(root, "game-client.js");
const game = fs.readFileSync(gamePath, "utf8");
const next = game.replace(/^  const words=\[[^\n]*\];/m, `  const words=${JSON.stringify(words)};`);
if (game === next && !game.includes(`  const words=${JSON.stringify(words)};`)) throw new Error("game-client.js의 단어 목록을 찾지 못했습니다.");
fs.writeFileSync(gamePath, next);
require("./build-html");
console.log(`사전 단어 ${words.length}개를 TTS 미션과 연결했습니다.`);
