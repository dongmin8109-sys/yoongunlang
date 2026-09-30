from pathlib import Path

out = Path("/mnt/data/sync-words.js")
code = r'''"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const dictionaryPath = path.join(root, "dictionary.html");
const source = fs.readFileSync(dictionaryPath, "utf8");

// 현재 dictionary.html 형식:
// {word:'haluleno', pronunciation:'할루레노', meaning:'안녕하세요, 안녕'}
const entries = [...source.matchAll(
  /\{word:'((?:\\'|[^'])*)',\s*pronunciation:'((?:\\'|[^'])*)',\s*meaning:'((?:\\'|[^'])*)'\}/g
)].map(match => [
  match[1].replace(/\\'/g, "'"),
  match[2].replace(/\\'/g, "'"),
  match[3].replace(/\\'/g, "'")
]);

if (!entries.length) {
  throw new Error("dictionary.html에서 사전 단어를 찾지 못했습니다.");
}

// 실제 녹음/audio 폴더를 검사하지 않습니다.
// 사전의 모든 단어와 한글 발음을 그대로 게임용 words.json에 사용합니다.
fs.writeFileSync(
  path.join(root, "words.json"),
  JSON.stringify(entries, null, 2) + "\n"
);

const gamePath = path.join(root, "game.html");
const game = fs.readFileSync(gamePath, "utf8");
const next = game.replace(
  /const words=\[[\s\S]*?\];\n  const rewardNames=/,
  `const words=${JSON.stringify(entries)};\n  const rewardNames=`
);

if (game === next) {
  console.log(`words.json 업데이트 완료: ${entries.length}개`);
  console.log("game.html은 서버의 words.json을 사용하는 버전이거나 내장 단어 목록 형식이 달라 자동 변경하지 않았습니다.");
} else {
  fs.writeFileSync(gamePath, next);
  console.log(`사전/게임 단어 ${entries.length}개 동기화 완료`);
}

console.log("오디오 파일은 사용하지 않습니다. 발음은 브라우저 TTS가 pronunciation 값을 읽습니다.");
'''
out.write_text(code, encoding="utf-8")
print("완료: sync-words.js")
