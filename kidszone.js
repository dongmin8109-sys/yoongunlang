"use strict";

// Kids Zone keeps its progress on this device. It never reads or writes account data.
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const safeWords = [
  ["emileno", "에밀레노", "엄마"], ["ebileno", "에빌레노", "아빠"],
  ["ae", "예", "1"], ["el", "엘", "2"], ["me’", "메", "3"],
  ["zo", "조", "4"], ["pa", "파", "5"], ["de’", "데", "6"]
];
const ids = ["slide", "lab", "space", "tree", "animals", "dress", "carousel", "treasure", "den"];
const names = ["무지개 미끄럼틀", "로봇 연구소", "우주선 발사장", "마법 나무집", "동물 놀이터", "꾸미기 하우스", "회전목마", "보물상자", "나만의 아지트"];
const descriptions = ["별을 모으는 모험", "단어를 배우는 곳", "행성을 찾아서", "선택하는 동화", "친구들과 놀아요", "내 캐릭터 만들기", "짝을 찾아요", "내가 모은 보물", "나의 놀이 기록"];
const intro = "안녕! 나는 윤봇이야! 윤건언어 놀이터에 온 걸 환영해! 미끄럼틀을 누르면 게임을 할 수 있고, 로봇 연구소에 가면 나랑 공부할 수 있어. 같이 놀아볼래?";
const defaults = { stars: 0, ledger: {}, best: 0, completed: [], learned: [], stickers: [], unlocks: [0], avatar: { body: "blue", hair: "round", hat: "none", friend: "bot", background: "sky" }, level: "sprout", theme: "rainbow", sound: false, motion: false };
function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("yoongun-kids-v1") || "null");
    if (!saved || typeof saved !== "object") return structuredClone(defaults);
    return { ...structuredClone(defaults), ...saved, ledger: saved.ledger && typeof saved.ledger === "object" ? saved.ledger : {}, avatar: { ...defaults.avatar, ...(saved.avatar || {}) }, completed: Array.isArray(saved.completed) ? saved.completed : [], learned: Array.isArray(saved.learned) ? saved.learned : [], stickers: Array.isArray(saved.stickers) ? saved.stickers : [], unlocks: Array.isArray(saved.unlocks) ? saved.unlocks : [0] };
  } catch { return structuredClone(defaults); }
}
let progress = readProgress();
let words = safeWords;
let wordSource = "예시 학습 데이터";
let current = null;
let game = null;
let speech = null;
function save() { try { localStorage.setItem("yoongun-kids-v1", JSON.stringify(progress)); } catch { /* Play remains available when storage is disabled. */ } updateStars(); }
function updateStars() { $("starTotal").textContent = String(progress.stars); }
function reward(key, amount, label, extras = {}) {
  if (progress.ledger[key]) return false;
  progress.ledger[key] = true;
  progress.stars += amount;
  if (extras.complete && !progress.completed.includes(extras.complete)) progress.completed.push(extras.complete);
  if (extras.sticker && !progress.stickers.includes(extras.sticker)) progress.stickers.push(extras.sticker);
  save();
  botSay(`잘했어! ${label} 별 ${amount}개를 받았어!`, true);
  return true;
}
function botSay(message, dance = false) {
  $("botMessage").textContent = message;
  $("activityBotMessage").textContent = message;
  $("bot").classList.toggle("dance", dance);
  window.setTimeout(() => $("bot").classList.remove("dance"), 1400);
  if (progress.sound) speak(message);
}
function speak(message) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    speech = new SpeechSynthesisUtterance(message);
    speech.lang = "ko-KR"; speech.rate = .88;
    speech.onerror = () => { speech = null; };
    window.speechSynthesis.speak(speech);
  } catch { /* Captions always remain visible. */ }
}
function icon(id) {
  const open = '<svg viewBox="0 0 200 200" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">';
  const close = '</svg>';
  const art = {
    slide: '<path d="M22 172h160" stroke="#6aa995" stroke-width="8" stroke-linecap="round"/><path d="M44 169V40h57v16H62v113" fill="#ffe394" stroke="#d69d55" stroke-width="6"/><path d="M49 64h65c0 35 18 43 49 65 13 10 16 23 18 38h-25c-4-17-24-25-45-36-29-15-39-34-41-49H49z" fill="#ff8fb8" stroke="#c76898" stroke-width="5"/><path d="M74 65c7 47 33 51 73 76" fill="none" stroke="#ffe081" stroke-width="11"/><path d="M94 65c4 26 15 37 34 51" fill="none" stroke="#85d9e7" stroke-width="11"/><path d="M40 36h80" stroke="#5f9ed2" stroke-width="12" stroke-linecap="round"/><path d="M15 100h34M15 124h34M15 148h34" stroke="#d69d55" stroke-width="6"/>',
    lab: '<rect x="22" y="79" width="155" height="99" rx="13" fill="#c1e6fa" stroke="#5a96c9" stroke-width="6"/><path d="M18 81 48 43h102l32 38" fill="#ffb9c9" stroke="#cf7c9d" stroke-width="6"/><path d="M61 177v-52h36v52" fill="#fff" stroke="#5a96c9" stroke-width="5"/><rect x="119" y="110" width="38" height="37" rx="8" fill="#fff9bf" stroke="#5a96c9" stroke-width="5"/><path d="M100 38V18m-15 9h30" stroke="#5a96c9" stroke-width="6"/><circle cx="100" cy="16" r="8" fill="#ffdd76"/>',
    space: '<path d="M40 167h120" stroke="#8e8dc2" stroke-width="8" stroke-linecap="round"/><path d="M75 145 90 50q10-33 20 0l15 95z" fill="#f9faff" stroke="#688dca" stroke-width="6"/><path d="M75 145 54 164V99l23 22M125 145l21 19V99l-23 22" fill="#ff9f9b" stroke="#d4778f" stroke-width="5"/><circle cx="100" cy="87" r="20" fill="#91dcf1" stroke="#688dca" stroke-width="6"/><path d="M91 148v30l9 13 9-13v-30" fill="#ffca68"/><circle cx="155" cy="45" r="17" fill="#ffe799"/><path d="M143 45h24" stroke="#fff" stroke-width="4"/>',
    tree: '<path d="M88 176 76 82h48l-10 94" fill="#a97856" stroke="#795841" stroke-width="6"/><circle cx="66" cy="72" r="43" fill="#86d9a6" stroke="#59a97b" stroke-width="6"/><circle cx="121" cy="61" r="49" fill="#9be5ae" stroke="#59a97b" stroke-width="6"/><circle cx="151" cy="91" r="33" fill="#86d9a6" stroke="#59a97b" stroke-width="6"/><rect x="68" y="81" width="71" height="53" rx="9" fill="#ffe4a7" stroke="#a97856" stroke-width="6"/><path d="m63 82 39-32 43 32" fill="#ef9f92" stroke="#ae6f75" stroke-width="6"/><rect x="95" y="101" width="18" height="33" rx="9" fill="#a97856"/><path d="M139 135v41m-20-41v41m-2-24h24" stroke="#a97856" stroke-width="5"/>',
    animals: '<path d="M18 168h164" stroke="#74b78c" stroke-width="8"/><ellipse cx="70" cy="119" rx="36" ry="38" fill="#f4cf9e" stroke="#b98667" stroke-width="5"/><path d="M44 99 31 55l30 26M94 99l15-44-32 26" fill="#b98667" stroke="#97674d" stroke-width="5"/><circle cx="58" cy="115" r="4" fill="#55455a"/><circle cx="81" cy="115" r="4" fill="#55455a"/><ellipse cx="70" cy="129" rx="7" ry="5" fill="#55455a"/><ellipse cx="143" cy="131" rx="28" ry="30" fill="#f8f7f4" stroke="#b6a5a3" stroke-width="5"/><path d="M128 111 123 51q12-12 20 50M151 103l19-51q12-7 3 52" fill="#f8f7f4" stroke="#b6a5a3" stroke-width="5"/><circle cx="134" cy="128" r="3"/><circle cx="151" cy="128" r="3"/><circle cx="143" cy="140" r="4" fill="#ee9faf"/>',
    dress: '<rect x="25" y="61" width="150" height="115" rx="13" fill="#ffe8c7" stroke="#dcad91" stroke-width="6"/><path d="M17 64 52 29h96l35 35" fill="#f6adc9" stroke="#cb7eaa" stroke-width="6"/><rect x="76" y="102" width="48" height="74" rx="12" fill="#fff" stroke="#cb9bb8" stroke-width="5"/><circle cx="100" cy="93" r="22" fill="#8ed1ef" stroke="#5294cb" stroke-width="5"/><path d="M82 75q18-26 36 0" fill="#956bb0"/><path d="M55 89h-15v30h15M145 89h15v30h-15" fill="#fff" stroke="#dcad91" stroke-width="4"/>',
    carousel: '<path d="M24 163h152" stroke="#916cb7" stroke-width="8"/><path d="M100 35v128" stroke="#916cb7" stroke-width="7"/><path d="m22 69 78-43 78 43z" fill="#f7a5c8" stroke="#ba77a9" stroke-width="6"/><path d="M40 70v84m40-84v84m40-84v84m40-84v84" stroke="#e4a867" stroke-width="5"/><path d="M43 113q12-17 27 0l15 15-12 18H43z" fill="#fff8cf" stroke="#b48a7b" stroke-width="5"/><circle cx="47" cy="108" r="9" fill="#fff8cf" stroke="#b48a7b" stroke-width="4"/><path d="M120 113q13-17 27 0l15 15-12 18h-30z" fill="#9ce2e3" stroke="#6ca5ba" stroke-width="5"/><circle cx="123" cy="108" r="9" fill="#9ce2e3" stroke="#6ca5ba" stroke-width="4"/>',
    treasure: '<path d="M23 172h155" stroke="#78b68c" stroke-width="7"/><rect x="35" y="105" width="130" height="67" rx="12" fill="#eab868" stroke="#aa773e" stroke-width="6"/><path d="M35 111V79q65-63 130 0v32z" fill="#ffd985" stroke="#aa773e" stroke-width="6"/><path d="M93 73v98M44 125h112" stroke="#ad793f" stroke-width="6"/><rect x="87" y="116" width="26" height="25" rx="6" fill="#fff2ad" stroke="#aa773e" stroke-width="5"/><circle cx="100" cy="127" r="4" fill="#aa773e"/>',
    den: '<path d="M19 176h162" stroke="#73b999" stroke-width="8"/><path d="M31 91 100 30l69 61v85H31z" fill="#c7e2ff" stroke="#6598c1" stroke-width="6"/><path d="m20 92 80-75 80 75" fill="none" stroke="#8e7bb5" stroke-width="13" stroke-linejoin="round"/><rect x="76" y="111" width="48" height="65" rx="14" fill="#fff1c5" stroke="#6598c1" stroke-width="5"/><circle cx="113" cy="145" r="4" fill="#6598c1"/><rect x="40" y="103" width="25" height="25" rx="4" fill="#9de3ed" stroke="#6598c1" stroke-width="4"/><rect x="135" y="103" width="25" height="25" rx="4" fill="#9de3ed" stroke="#6598c1" stroke-width="4"/>'
  };
  return open + art[id] + close;
}

function createFacilities() {
  $("facilityLayer").innerHTML = ids.map((id, index) => `<button class="facility f-${id}" data-place="${id}" type="button" aria-label="${names[index]} 열기">${icon(id)}<span class="facility-label">${names[index]}<small>${descriptions[index]}</small></span></button>`).join("");
  $("facilityLayer").addEventListener("click", (event) => { const button = event.target.closest("[data-place]"); if (button) openActivity(button.dataset.place); });
}
function syncSettings() {
  $("levelSelect").value = progress.level;
  $("themeSelect").value = progress.theme;
  $("sceneWorld").dataset.theme = progress.theme;
  $("soundToggle").setAttribute("aria-pressed", String(progress.sound));
  $("soundToggle").textContent = progress.sound ? "소리 끄기" : "소리 켜기";
  $("motionToggle").setAttribute("aria-pressed", String(progress.motion));
  $("motionToggle").textContent = progress.motion ? "움직임 켜기" : "움직임 줄이기";
  document.body.classList.toggle("reduce-motion", progress.motion);
}
async function loadWords() {
  try {
    const response = await fetch("/api/words", { cache: "no-store" });
    if (!response.ok) throw Error("unavailable");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw Error("invalid data");
    const approved = safeWords.filter((entry) => rows.some((row) => Array.isArray(row) && row[0] === entry[0] && row[2] === entry[2]));
    if (approved.length < 4) throw Error("not enough curated words");
    words = approved;
    wordSource = "공식 사전의 어린이용 단어";
  } catch { words = safeWords; wordSource = "예시 학습 데이터 · 사전 연결 전"; }
  if (current === "lab") renderLab();
}
function openActivity(id) {
  if (game) { game.running = false; game = null; }
  window.speechSynthesis?.cancel();
  current = id;
  $("playground").hidden = true; $("activity").hidden = false;
  $("activityTitle").textContent = names[ids.indexOf(id)];
  $("activityBadge").textContent = progress.level === "sprout" ? "새싹 모드" : progress.level === "explorer" ? "탐험 모드" : "마스터 모드";
  $("activityEyebrow").textContent = "YOONBOT ADVENTURE";
  botSay(`${names[ids.indexOf(id)]}에 왔어! 같이 놀아 보자!`);
  window.scrollTo({ top: 0, behavior: progress.motion ? "instant" : "smooth" });
  ({ slide: renderSlide, lab: renderLab, space: renderSpace, tree: renderTree, animals: renderAnimals, dress: renderDress, carousel: renderCarousel, treasure: renderTreasure, den: renderDen })[id]();
}
function goHome() { if (game) { game.running = false; game = null; } current = null; $("activity").hidden = true; $("playground").hidden = false; botSay("다음에는 어디로 갈까? 멋진 모험을 골라 줘!"); }
function content(html) { $("activityContent").innerHTML = html; }
function pickOptions(correct, pool, count = 4) { return [correct, ...pool.filter((value) => value !== correct).sort(() => Math.random() - .5).slice(0, count - 1)].sort(() => Math.random() - .5); }
function learn(word) { if (!progress.learned.includes(word[0])) { progress.learned.push(word[0]); save(); } }
function answerButtons(target, options, correct, onCorrect) {
  const box = $(target);
  box.replaceChildren();
  options.forEach((option) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "choice-button"; button.textContent = option;
    button.addEventListener("click", () => {
      const ok = option === correct;
      button.classList.add(ok ? "correct" : "wrong");
      button.setAttribute("aria-label", `${option} — ${ok ? "정답" : "다시 생각해 봐요"}`);
      if (ok) { [...box.children].forEach((child) => { child.disabled = true; }); onCorrect(); }
      else { button.disabled = true; const feedback = box.nextElementSibling; if (feedback) feedback.textContent = "괜찮아! 다시 골라 보자."; }
    });
    box.append(button);
  });
}

$("backButton").addEventListener("click", goHome);
$("panLeft").addEventListener("click", () => $("sceneViewport").scrollBy({ left: -460, behavior: "smooth" }));
$("panRight").addEventListener("click", () => $("sceneViewport").scrollBy({ left: 460, behavior: "smooth" }));
$("sceneViewport").addEventListener("keydown", (event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); $("sceneViewport").scrollBy({ left: event.key === "ArrowLeft" ? -300 : 300, behavior: "smooth" }); } });
$("levelSelect").addEventListener("change", (event) => { progress.level = event.target.value; save(); botSay("난이도를 바꿨어! 언제든 다시 바꿀 수 있어."); });
$("themeSelect").addEventListener("change", (event) => { progress.theme = event.target.value; save(); syncSettings(); botSay("놀이터의 분위기가 바뀌었어!"); });
$("soundToggle").addEventListener("click", () => { progress.sound = !progress.sound; save(); syncSettings(); if (!progress.sound) window.speechSynthesis?.cancel(); else speak($("botMessage").textContent); });
$("motionToggle").addEventListener("click", () => { progress.motion = !progress.motion; save(); syncSettings(); });
$("speakButton").addEventListener("click", () => speak($("botMessage").textContent));
createFacilities(); syncSettings(); updateStars(); botSay(intro); void loadWords();

// One complete side-scrolling course. World coordinates use a fixed 1000 x 390 canvas.
function groundAt(x) {
  if (x < 380) return 305;
  if (x < 720) return 305 + (x - 380) * .12;
  if (x < 1150) return 346;
  if (x < 1460) return 346 - (x - 1150) * .13;
  return 306;
}
function renderSlide() {
  content(`<div class="panel"><h3>슝슝! 윤봇의 무지개 미끄럼틀</h3><p>오른쪽으로 가서 별을 모아요. 블록을 뛰어넘고 윤건언어 문제를 풀면 보물상자에 도착할 수 있어요.</p><p class="source-note">PC: ← → 또는 A D 이동 · 스페이스/↑ 점프 · 모바일: 아래 버튼을 꾹 누르기</p></div><div class="game-shell"><div class="game-hud"><span id="heartsHud">하트 ♥♥♥</span><span id="scoreHud">점수 0</span><span id="gameStarHud">별 0 / 10</span><span id="checkpointHud">체크포인트: 출발점</span></div><canvas id="slideCanvas" width="1000" height="390" role="img" aria-label="무지개 미끄럼틀 게임 화면"></canvas><div class="game-controls"><div class="move-controls"><button id="moveLeft" type="button" aria-label="왼쪽으로 계속 이동">←</button><button id="moveRight" type="button" aria-label="오른쪽으로 계속 이동">→</button></div><button id="jumpButton" type="button" aria-label="점프">점프 ↑</button></div><div id="gameOverlay" class="game-overlay" hidden></div></div>`);
  const canvas = $("slideCanvas"), ctx = canvas.getContext("2d");
  const stars = [170,310,480,660,820,1000,1190,1390,1630,1850].map((x, i) => ({ x, y: groundAt(x) - (i % 3 === 0 ? 115 : 65), got: false }));
  const obstacles = [540,760,1240,1560,1810].map((x, i) => ({ x, w: i % 2 ? 40 : 48, h: i % 2 ? 34 : 46 })).filter((_, i) => progress.level === "master" || (progress.level === "explorer" ? i !== 3 : i !== 1 && i !== 3));
  const state = { running: true, keys: { left: false, right: false, jump: false }, x: 55, y: groundAt(55), vy: 0, hearts: 3, score: 0, collected: 0, checkpoint: 55, invincible: 0, quizDone: false, paused: false, last: 0, finished: false, stars, obstacles };
  game = state;
  const speed = { sprout: 3.3, explorer: 4.3, master: 5.4 }[progress.level];
  const gravity = .53;
  function hud() { $("heartsHud").textContent = `하트 ${"♥".repeat(state.hearts)}${"♡".repeat(3 - state.hearts)}`; $("scoreHud").textContent = `점수 ${state.score}`; $("gameStarHud").textContent = `별 ${state.collected} / 10`; $("checkpointHud").textContent = `체크포인트: ${state.checkpoint > 55 ? "무지개 중간" : "출발점"}`; }
  function resetAtCheckpoint() { state.x = state.checkpoint; state.y = groundAt(state.x); state.vy = 0; state.invincible = 75; }
  function collision() { if (state.invincible > 0) return; state.hearts--; hud(); if (state.hearts <= 0) { state.hearts = 3; state.score = Math.max(0, state.score - 20); botSay("괜찮아! 체크포인트에서 다시 시작하자."); } else botSay("앗! 하트가 하나 줄었어. 점프해 보자!"); resetAtCheckpoint(); }
  function startQuiz() {
    state.paused = true;
    const word = words.find((item) => item[2] === "엄마") || words[0];
    $("gameOverlay").hidden = false;
    $("gameOverlay").innerHTML = `<div class="game-modal"><h3>윤봇의 단어 퀴즈</h3><p><b>${escapeHtml(word[0])}</b>의 뜻은 무엇일까?</p><div id="gameQuizOptions" class="choice-grid"></div><p class="feedback" id="gameQuizFeedback" role="status"></p></div>`;
    answerButtons("gameQuizOptions", pickOptions(word[2], words.map((item) => item[2]), { sprout: 2, explorer: 3, master: 4 }[progress.level]), word[2], () => { learn(word); state.quizDone = true; state.score += 100; $("gameQuizFeedback").textContent = "정답! 계속 가 보자!"; botSay("정답이야! 앞으로 달려 보자!", true); hud(); setTimeout(() => { if (game !== state) return; $("gameOverlay").hidden = true; state.paused = false; }, 850); });
  }
  function finish() {
    state.finished = true; state.paused = true;
    progress.best = Math.max(progress.best, state.score); save();
    const earned = reward("slide-finish", 12, "미끄럼틀 완주!", { complete: "무지개 미끄럼틀", sticker: "무지개 별" });
    $("gameOverlay").hidden = false;
    $("gameOverlay").innerHTML = `<div class="game-modal"><h3>보물상자 도착!</h3><p>멋지게 완주했어! <strong>최종 점수 ${state.score}점</strong></p><p>별 ${state.collected}개를 찾았어. ${earned ? "첫 완주 보상 별 12개와 무지개 별 스티커를 받았어!" : "첫 완주 보상은 이미 받았어. 최고 점수에 도전해 봐!"}</p><button class="primary-button" id="restartSlide" type="button">다시 달리기</button></div>`;
    $("restartSlide").addEventListener("click", renderSlide);
  }
  const keydown = (event) => { if (current !== "slide") return; const key = event.key.toLowerCase(); if (["arrowleft", "arrowright", "arrowup", " ", "a", "d"].includes(key)) event.preventDefault(); if (key === "arrowleft" || key === "a") state.keys.left = true; if (key === "arrowright" || key === "d") state.keys.right = true; if (key === "arrowup" || key === " ") state.keys.jump = true; };
  const keyup = (event) => { const key = event.key.toLowerCase(); if (key === "arrowleft" || key === "a") state.keys.left = false; if (key === "arrowright" || key === "d") state.keys.right = false; if (key === "arrowup" || key === " ") state.keys.jump = false; };
  window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
  state.cleanup = () => { window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); };
  [["moveLeft", "left"], ["moveRight", "right"], ["jumpButton", "jump"]].forEach(([id, direction]) => {
    const button = $(id);
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); state.keys[direction] = true; });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => button.addEventListener(type, () => { state.keys[direction] = false; }));
  });
  function drawStar(x, y, radius = 17) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = "#ffc742"; ctx.strokeStyle = "#d98f25"; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .48 : radius; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function draw() {
    const w = canvas.width, h = canvas.height, camera = Math.max(0, Math.min(1200, state.x - 270));
    const gradient = ctx.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, "#9bdff7"); gradient.addColorStop(.72, "#d9f6ff"); gradient.addColorStop(.72, "#a9e4b1"); gradient.addColorStop(1, "#8dcf9e"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff7b8"; ctx.beginPath(); ctx.arc(850 - camera * .18, 66, 37, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffffbb"; [120, 430, 750, 1130, 1550, 1980].forEach((x) => { const sx = x - camera * .42; ctx.beginPath(); ctx.ellipse(sx, 69 + x % 35, 50, 16, 0, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(-camera, 0);
    ctx.beginPath(); ctx.moveTo(0, groundAt(0)); for (let x = 0; x <= 2200; x += 10) ctx.lineTo(x, groundAt(x)); ctx.lineTo(2200, 390); ctx.lineTo(0, 390); ctx.closePath(); ctx.fillStyle = "#8dd49f"; ctx.fill(); ctx.strokeStyle = "#4fa883"; ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath(); for (let x = 0; x <= 2200; x += 10) { if (x === 0) ctx.moveTo(x, groundAt(x) + 12); else ctx.lineTo(x, groundAt(x) + 12); } ctx.strokeStyle = "#ffda8a"; ctx.lineWidth = 18; ctx.stroke();
    for (const star of state.stars) if (!star.got) drawStar(star.x, star.y);
    state.obstacles.forEach((item, i) => { const y = groundAt(item.x) - item.h; ctx.fillStyle = i % 2 ? "#d9f6fa" : "#f6a8bd"; ctx.strokeStyle = i % 2 ? "#80bfd0" : "#bf708c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(item.x, y, item.w, item.h, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#5c6780"; ctx.fillRect(item.x + 10, y + 12, 5, 5); ctx.fillRect(item.x + item.w - 15, y + 12, 5, 5); });
    ctx.fillStyle = "#6e9fd1"; ctx.fillRect(850, groundAt(850) - 45, 8, 45); ctx.fillStyle = "#ffe497"; ctx.beginPath(); ctx.moveTo(858, groundAt(850) - 45); ctx.lineTo(915, groundAt(850) - 32); ctx.lineTo(858, groundAt(850) - 18); ctx.fill();
    ctx.fillStyle = "#ad7a4e"; ctx.fillRect(2070, 245, 105, 63); ctx.fillStyle = "#f8cb73"; ctx.beginPath(); ctx.roundRect(2070, 218, 105, 47, 16); ctx.fill(); ctx.strokeStyle = "#875c48"; ctx.lineWidth = 5; ctx.stroke(); drawStar(2122, 245, 14);
    if (state.invincible % 8 < 4) { ctx.fillStyle = "#358bcf"; ctx.strokeStyle = "#1762a8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(state.x - 16, state.y - 39, 32, 38, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(state.x - 6, state.y - 24, 5, 0, 7); ctx.arc(state.x + 6, state.y - 24, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#234665"; ctx.beginPath(); ctx.arc(state.x - 5, state.y - 24, 2, 0, 7); ctx.arc(state.x + 7, state.y - 24, 2, 0, 7); ctx.fill(); ctx.strokeStyle = "#234665"; ctx.beginPath(); ctx.arc(state.x + 1, state.y - 14, 5, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
  }
  function tick(time) {
    if (!state.running || game !== state) { state.cleanup(); return; }
    const delta = Math.min((time - (state.last || time)) / 16.67, 2); state.last = time;
    if (!state.paused) {
      const direction = Number(state.keys.right) - Number(state.keys.left);
      state.x = Math.max(20, Math.min(2140, state.x + direction * speed * delta));
      const floor = groundAt(state.x);
      if (state.keys.jump && state.y >= floor - 1) { state.vy = progress.level === "sprout" ? -12 : -11.5; state.keys.jump = false; }
      state.vy += gravity * delta; state.y += state.vy * delta;
      if (state.y >= floor) { state.y = floor; state.vy = 0; }
      if (state.invincible > 0) state.invincible -= delta;
      if (state.x > 850 && state.checkpoint === 55) { state.checkpoint = 850; botSay("체크포인트를 지났어! 조금만 더 가자!"); hud(); }
      for (const star of state.stars) if (!star.got && Math.abs(star.x - state.x) < 25 && Math.abs(star.y - (state.y - 22)) < 33) { star.got = true; state.collected++; state.score += 10; hud(); }
      for (const obstacle of state.obstacles) if (state.x + 13 > obstacle.x && state.x - 13 < obstacle.x + obstacle.w && state.y > groundAt(obstacle.x) - obstacle.h - 5 && state.y - 36 < groundAt(obstacle.x)) { collision(); break; }
      if (state.x > 1050 && !state.quizDone) startQuiz();
      if (state.x >= 2090 && state.quizDone) finish();
    }
    draw(); requestAnimationFrame(tick);
  }
  hud(); requestAnimationFrame(tick);
}

let labMode = "today";
function labTabs() { return `<div class="button-row" role="group" aria-label="연구소 활동">${[["today","오늘의 단어"],["quiz","뜻 맞히기"],["picture","그림 고르기"],["listen","듣기"],["flip","카드 뒤집기"],["memory","기억력"],["sentence","단어 놓기"]].map(([id,label]) => `<button class="mini-button" type="button" data-lab="${id}" ${labMode === id ? 'aria-current="true"' : ""}>${label}</button>`).join("")}</div>`; }
function renderLab() {
  const day = Math.floor(Date.now() / 86400000);
  const daily = words[day % words.length];
  content(`<div class="panel"><h3>윤봇의 로봇 연구소</h3><p>단어를 보고, 듣고, 카드로 놀아 보자!</p><p class="source-note" id="wordSource">${wordSource}</p>${labTabs()}</div><div class="panel" id="labStage"></div>`);
  document.querySelectorAll("[data-lab]").forEach((button) => button.addEventListener("click", () => { labMode = button.dataset.lab; renderLab(); }));
  const stage = $("labStage");
  if (labMode === "today") {
    stage.innerHTML = `<h3>오늘의 단어</h3><p class="word-big">${escapeHtml(daily[0])}</p><p class="word-pron">발음: ${escapeHtml(daily[1])}</p><p>뜻: <strong>${escapeHtml(daily[2])}</strong></p><div class="button-row"><button id="dailyListen" class="soft-button" type="button">발음 듣기</button><button id="dailyLearn" class="primary-button" type="button">배웠어요!</button></div><p id="labFeedback" class="feedback" role="status"></p>`;
    $("dailyListen").addEventListener("click", () => speak(daily[1]));
    $("dailyLearn").addEventListener("click", () => { learn(daily); const gained = reward(`lab-daily-${daily[0]}`, 2, "오늘의 단어!", { complete: "오늘의 단어" }); $("labFeedback").textContent = gained ? "오늘의 단어를 기억했어!" : "이미 배운 단어야. 다시 보는 것도 좋아!"; });
  } else if (labMode === "quiz" || labMode === "picture") {
    const numberWords = words.filter((item) => /^\d$/.test(item[2]));
    const item = labMode === "picture" ? numberWords[day % numberWords.length] : words[(day + 1) % words.length];
    stage.innerHTML = labMode === "picture" ? `<h3>그림 보고 단어 고르기</h3><p>그림에 동그라미가 몇 개 있을까?</p><div class="picture-dots" style="font-size:38px;color:#69afd9;letter-spacing:7px" aria-label="동그라미 ${escapeHtml(item[2])}개">${"●".repeat(Number(item[2]))}</div><div id="labOptions" class="choice-grid"></div><p class="feedback" id="labFeedback" role="status"></p>` : `<h3>뜻 맞히기</h3><p class="word-big">${escapeHtml(item[0])}</p><p class="word-pron">${escapeHtml(item[1])}</p><div id="labOptions" class="choice-grid"></div><p class="feedback" id="labFeedback" role="status"></p>`;
    const optionCount = { sprout: 2, explorer: 3, master: 4 }[progress.level];
    const options = labMode === "picture" ? pickOptions(item[0], numberWords.map((word) => word[0]), optionCount) : pickOptions(item[2], words.map((word) => word[2]), optionCount);
    answerButtons("labOptions", options, labMode === "picture" ? item[0] : item[2], () => { learn(item); $("labFeedback").textContent = `정답! ${item[0]} = ${item[2]}`; reward(`lab-${labMode}-${item[0]}`, 3, "연구소 문제!", { complete: "로봇 연구소" }); });
  } else if (labMode === "listen") {
    const item = words[(day + 2) % words.length];
    stage.innerHTML = `<h3>단어 듣기</h3><p>윤봇이 읽어 줄게. 소리가 없어도 글자를 보며 풀 수 있어!</p><p class="word-big">${escapeHtml(item[0])}</p><p class="word-pron">${escapeHtml(item[1])}</p><button id="listenWord" class="soft-button" type="button">다시 듣기</button><div id="labOptions" class="choice-grid" style="margin-top:14px"></div><p class="feedback" id="labFeedback" role="status"></p>`;
    $("listenWord").addEventListener("click", () => speak(item[1]));
    answerButtons("labOptions", pickOptions(item[2], words.map((word) => word[2])), item[2], () => { learn(item); $("labFeedback").textContent = "정답! 소리와 뜻을 함께 배웠어."; reward(`lab-listen-${item[0]}`, 3, "듣기 문제!", { complete: "로봇 연구소" }); });
  } else if (labMode === "flip") {
    const item = words[(day + 3) % words.length];
    stage.innerHTML = `<h3>단어 카드 뒤집기</h3><p>카드를 누르면 뜻이 보여!</p><button id="flipCard" class="flip-card" type="button" aria-label="단어 카드 뒤집기">${escapeHtml(item[0])}</button><p id="labFeedback" class="feedback" role="status"></p>`;
    let flipped = false;
    $("flipCard").addEventListener("click", () => { flipped = !flipped; $("flipCard").classList.toggle("flipped", flipped); $("flipCard").textContent = flipped ? item[2] : item[0]; if (flipped) { learn(item); $("labFeedback").textContent = `${item[0]}는 ${item[2]}!`; reward(`lab-flip-${item[0]}`, 1, "카드 뒤집기!"); } });
  } else if (labMode === "memory") {
    stage.innerHTML = `<h3>단어 기억력 게임</h3><p>윤건언어 단어와 뜻을 짝지어 봐!</p><div id="labMemory" class="memory-grid"></div><p id="labFeedback" class="feedback" role="status"></p>`;
    const pairs = words.slice(0, 3).map((word, index) => ({ id: index, front: word[0], back: word[2], word }));
    memoryGame("labMemory", pairs, () => { pairs.forEach((pair) => learn(pair.word)); $("labFeedback").textContent = "모든 짝을 찾았어!"; reward("lab-memory", 5, "단어 짝 맞히기!", { complete: "로봇 연구소" }); });
  } else {
    const terms = words.slice(0, 3);
    stage.innerHTML = `<h3>간단한 단어 놓기</h3><p>아래 뜻의 순서대로 단어를 눌러 놓아 봐. 윤건언어 문법 문장은 아직 다루지 않아.</p><p><strong>${terms.map((word) => escapeHtml(word[2])).join(" → ")}</strong></p><div id="sentenceChosen" class="sentence-tokens"></div><div id="sentenceTokens" class="sentence-tokens button-row"></div><p id="labFeedback" class="feedback" role="status"></p><button id="sentenceReset" class="soft-button" type="button">다시 놓기</button>`;
    const order = terms.map((word) => word[0]); let chosen = [];
    const makeTokens = () => { $("sentenceTokens").replaceChildren(); [...order].reverse().forEach((term) => { const button = document.createElement("button"); button.className = "choice-button"; button.type = "button"; button.textContent = term; button.disabled = chosen.includes(term); button.addEventListener("click", () => { chosen.push(term); $("sentenceChosen").textContent = chosen.join(" → "); makeTokens(); if (chosen.length === order.length) { const ok = chosen.every((value, index) => value === order[index]); $("labFeedback").textContent = ok ? "맞았어! 단어를 순서대로 놓았어." : "순서가 달라. 다시 놓아 보자!"; if (ok) { terms.forEach(learn); reward("lab-order", 5, "단어 놓기!", { complete: "로봇 연구소" }); } } }); $("sentenceTokens").append(button); }); };
    $("sentenceReset").addEventListener("click", () => { chosen = []; $("sentenceChosen").textContent = ""; $("labFeedback").textContent = ""; makeTokens(); }); makeTokens();
  }
}

function memoryGame(targetId, pairs, onDone) {
  const deck = pairs.flatMap((pair) => [{ id: pair.id, text: pair.front }, { id: pair.id, text: pair.back }]).sort(() => Math.random() - .5);
  const box = $(targetId); let opened = [], matched = 0, locked = false;
  deck.forEach((card, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "memory-card"; button.textContent = "?"; button.setAttribute("aria-label", `숨은 카드 ${index + 1}`);
    button.addEventListener("click", () => {
      if (locked || button.classList.contains("matched") || opened.some((entry) => entry.button === button)) return;
      button.classList.add("open"); button.textContent = card.text; opened.push({ card, button });
      if (opened.length === 2) {
        if (opened[0].card.id === opened[1].card.id) { opened.forEach((entry) => { entry.button.classList.add("matched"); entry.button.disabled = true; }); opened = []; matched++; if (matched === pairs.length) onDone(); }
        else { locked = true; setTimeout(() => { opened.forEach((entry) => { entry.button.classList.remove("open"); entry.button.textContent = "?"; }); opened = []; locked = false; }, 800); }
      }
    }); box.append(button);
  });
}

const planets = [
  { name: "반짝 행성", color: "#ffe69b", detail: "별을 모으고 첫 단어를 배워요", word: "emileno" },
  { name: "푸른 행성", color: "#97dfed", detail: "숫자 단어를 찾아요", word: "ae" },
  { name: "보랏빛 행성", color: "#c6a6ed", detail: "새로운 뜻을 찾아요", word: "ebileno" }
];
let selectedShip = "blue";
function planetSvg(color) { return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="37" fill="${color}" stroke="#6c80bc" stroke-width="4"/><path d="M15 48q36 28 71 1" fill="none" stroke="#ffffffaa" stroke-width="9"/><circle cx="38" cy="33" r="6" fill="#ffffff77"/></svg>`; }
function renderSpace() {
  content(`<div class="panel"><h3>우주선 모험</h3><p>우주선을 골라 행성으로 가자! 첫 행성부터 차례로 열 수 있어.</p><div class="button-row"><button class="soft-button" data-ship="blue" type="button">파란 우주선</button><button class="soft-button" data-ship="pink" type="button">분홍 우주선</button></div><p id="shipStatus" class="feedback" role="status">선택한 우주선: ${selectedShip === "blue" ? "파란" : "분홍"} 우주선</p></div><div class="panel"><h3>어느 행성으로 갈까?</h3><div class="planet-grid">${planets.map((planet, index) => `<button type="button" class="planet" data-planet="${index}" ${progress.unlocks.includes(index) ? "" : "disabled"}>${planetSvg(planet.color)}${planet.name}<small style="display:block;font-size:12px">${progress.unlocks.includes(index) ? planet.detail : "앞 행성 미션을 완료하면 열려요"}</small></button>`).join("")}</div></div><div class="panel space-stage" id="planetStage"><h3>출발 준비!</h3><p>행성을 눌러 우주 모험을 시작해.</p></div>`);
  document.querySelectorAll("[data-ship]").forEach((button) => button.addEventListener("click", () => { selectedShip = button.dataset.ship; $("shipStatus").textContent = `선택한 우주선: ${selectedShip === "blue" ? "파란" : "분홍"} 우주선`; }));
  document.querySelectorAll("[data-planet]").forEach((button) => button.addEventListener("click", () => playPlanet(Number(button.dataset.planet))));
}
function playPlanet(index) {
  const planet = planets[index], word = words.find((item) => item[0] === planet.word) || words[index];
  const stage = $("planetStage"); let gathered = 0;
  stage.innerHTML = `<h3>${planet.name} 착륙!</h3><p>외계인 루루: “안녕! 빛나는 별 3개를 찾아 줘. 그러면 단어 미션을 줄게!”</p><div class="button-row" id="planetStars"><button class="choice-button" type="button" aria-label="첫 번째 별 모으기">☆</button><button class="choice-button" type="button" aria-label="두 번째 별 모으기">☆</button><button class="choice-button" type="button" aria-label="세 번째 별 모으기">☆</button></div><div id="planetMission"></div>`;
  [...$("planetStars").children].forEach((button) => button.addEventListener("click", () => { if (button.disabled) return; button.textContent = "★"; button.disabled = true; gathered++; if (gathered === 3) { $("planetMission").innerHTML = `<p>루루: “고마워! <strong>${escapeHtml(word[0])}</strong>의 뜻은 무엇일까?”</p><div id="planetOptions" class="choice-grid"></div><p id="planetFeedback" class="feedback" role="status"></p>`; answerButtons("planetOptions", pickOptions(word[2], words.map((item) => item[2])), word[2], () => { learn(word); $("planetFeedback").textContent = "미션 성공! 다음 행성이 열렸어!"; if (!progress.unlocks.includes(index + 1) && index < 2) progress.unlocks.push(index + 1); save(); reward(`space-${index}`, 6, `${planet.name} 탐험!`, { complete: planet.name, sticker: `${planet.name} 스티커` }); setTimeout(() => { if (current === "space") renderSpace(); }, 1300); }); } }));
}

const story = [
  { title: "숲의 아침", line: "작은 토끼가 마법 나무 아래에서 반짝이는 조각을 찾았어요.", art: "tree" },
  { title: "숲의 친구", line: "토끼는 윤봇을 만났어요. 윤봇은 ‘emileno’라는 단어를 알려 주었어요.", art: "lab", glossary: true },
  { title: "마음의 선택", line: "길이 두 개로 나뉘었어요. 누구와 함께 가 볼까요?", art: "animals", choice: true },
  { title: "함께 찾은 별", line: "친구와 함께 걸어가니 반짝이는 별이 나타났어요. 서로 도와서 더 즐거웠답니다!", art: "treasure" }
];
let storyPage = 0, storyFriend = "";
function renderTree() {
  const page = story[storyPage];
  content(`<div class="panel"><h3>마법 나무집 동화책 · 반짝이는 숲</h3><p class="source-note">샘플 동화 · ${storyPage + 1} / ${story.length}쪽</p><div class="two-col"><div class="story-art">${icon(page.art)}</div><div><h3>${page.title}</h3><p class="story-copy">${page.line.replace("emileno", '<button id="glossaryWord" type="button">emileno</button>')}</p>${storyFriend && storyPage === 3 ? `<p>함께 온 친구: <strong>${storyFriend}</strong></p>` : ""}<p id="storyFeedback" class="feedback" role="status"></p></div></div><div class="button-row" id="storyControls"><button id="storyPrev" class="soft-button" type="button" ${storyPage === 0 ? "disabled" : ""}>이전 쪽</button><button id="storyListen" class="soft-button" type="button">이야기 듣기</button>${page.choice ? '<button id="chooseRabbit" class="choice-button" type="button">토끼와 가기</button><button id="chooseBot" class="choice-button" type="button">윤봇과 가기</button>' : `<button id="storyNext" class="primary-button" type="button">${storyPage === story.length - 1 ? "책 마치기" : "다음 쪽"}</button>`}</div></div>`);
  $("storyPrev").addEventListener("click", () => { storyPage--; renderTree(); });
  $("storyListen").addEventListener("click", () => speak(page.line));
  if (page.glossary) $("glossaryWord").addEventListener("click", () => { $("storyFeedback").textContent = "emileno (에밀레노) = 엄마"; learn(words.find((item) => item[0] === "emileno") || safeWords[0]); });
  if (page.choice) {
    [["chooseRabbit", "토끼"], ["chooseBot", "윤봇"]].forEach(([id, friend]) => $(id).addEventListener("click", () => { storyFriend = friend; storyPage = 3; renderTree(); }));
  } else $("storyNext").addEventListener("click", () => { if (storyPage === story.length - 1) { const earned = reward("story-finish", 5, "동화책 완독!", { complete: "반짝이는 숲", sticker: "숲 스티커" }); $("storyFeedback").textContent = earned ? "동화를 다 읽었어! 숲 스티커를 받았어." : "동화를 다시 읽어 줘서 고마워!"; const again = document.createElement("button"); again.className = "primary-button"; again.type = "button"; again.textContent = "처음부터 다시 읽기"; again.addEventListener("click", () => { storyPage = 0; renderTree(); }); $("storyNext").replaceWith(again); } else { storyPage++; renderTree(); } });
}

const animalNames = ["강아지", "고양이", "토끼"];
let selectedAnimal = 0, animalActions = { feed: false, pet: false };
function animalSvg(index) {
  const coats = ["#e9bb8d", "#b4b5c8", "#faf0dc"], coat = coats[index];
  const ears = index === 2 ? '<path d="M65 82 55 17q16-17 29 54M119 70l17-53q19-12 12 68" fill="#faf0dc" stroke="#947b78" stroke-width="6"/>' : index === 0 ? '<path d="M56 85 35 29q-22 20 5 68M131 84l22-55q24 19 1 70" fill="#b68165" stroke="#947b78" stroke-width="6"/>' : '<path d="M53 82 47 28l40 40M116 67l36-38-5 63" fill="#b4b5c8" stroke="#85869d" stroke-width="6"/>';
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${ears}<ellipse cx="100" cy="115" rx="67" ry="66" fill="${coat}" stroke="#947b78" stroke-width="6"/><circle cx="74" cy="105" r="7" fill="#3c405c"/><circle cx="125" cy="105" r="7" fill="#3c405c"/><path d="m91 129 9 9 9-9z" fill="#e8939f"/><path d="M100 138q-12 16-27 6M100 138q12 16 27 6" fill="none" stroke="#61546a" stroke-width="4" stroke-linecap="round"/><ellipse cx="55" cy="151" rx="18" ry="12" fill="${coat}"/><ellipse cx="145" cy="151" rx="18" ry="12" fill="${coat}"/></svg>`;
}
function renderAnimals() {
  content(`<div class="panel"><h3>동물 친구를 골라 줘!</h3><div class="button-row">${animalNames.map((name, index) => `<button class="soft-button" data-animal="${index}" type="button" ${index === selectedAnimal ? 'aria-current="true"' : ""}>${name}</button>`).join("")}</div></div><div class="panel two-col"><div id="animalArt" class="animal-art">${animalSvg(selectedAnimal)}</div><div><h3>${animalNames[selectedAnimal]}와 놀기</h3><p>먹이를 주거나 쓰다듬어 봐. 친구의 반응을 볼 수 있어!</p><div class="button-row"><button id="feedAnimal" class="primary-button" type="button">먹이 주기</button><button id="petAnimal" class="soft-button" type="button">쓰다듬기</button></div><p id="animalFeedback" class="feedback" role="status"></p><p>이 동물의 이름은 무엇일까?</p><div id="animalOptions" class="choice-grid"></div><p id="animalQuizFeedback" class="feedback" role="status"></p></div></div>`);
  document.querySelectorAll("[data-animal]").forEach((button) => button.addEventListener("click", () => { selectedAnimal = Number(button.dataset.animal); animalActions = { feed: false, pet: false }; renderAnimals(); }));
  const react = (message) => { const art = $("animalArt"); art.classList.remove("bounce"); void art.offsetWidth; art.classList.add("bounce"); $("animalFeedback").textContent = message; };
  $("feedAnimal").addEventListener("click", () => { animalActions.feed = true; react(`${animalNames[selectedAnimal]}가 맛있게 먹고 꼬리를 흔들어!`); });
  $("petAnimal").addEventListener("click", () => { animalActions.pet = true; react(`${animalNames[selectedAnimal]}가 기분 좋게 눈을 감았어!`); });
  answerButtons("animalOptions", pickOptions(animalNames[selectedAnimal], animalNames, 3), animalNames[selectedAnimal], () => {
    $("animalQuizFeedback").textContent = animalActions.feed && animalActions.pet ? "정답! 친구와 잘 놀아 주었어!" : "정답! 먹이도 주고 쓰다듬어 봐!";
    if (animalActions.feed && animalActions.pet) reward(`animal-${selectedAnimal}`, 4, `${animalNames[selectedAnimal]}와 놀기!`, { complete: `${animalNames[selectedAnimal]} 놀이터`, sticker: `${animalNames[selectedAnimal]} 스티커` });
  });
  // If the quiz was answered first, completing both care actions still grants the reward.
  let quizSolved = false;
  const quizButtons = [...$("animalOptions").children];
  quizButtons.forEach((button) => button.addEventListener("click", () => { if (button.textContent === animalNames[selectedAnimal]) quizSolved = true; }));
  [["feedAnimal", "feed"], ["petAnimal", "pet"]].forEach(([id]) => $(id).addEventListener("click", () => { if (quizSolved && animalActions.feed && animalActions.pet) { reward(`animal-${selectedAnimal}`, 4, `${animalNames[selectedAnimal]}와 놀기!`, { complete: `${animalNames[selectedAnimal]} 놀이터`, sticker: `${animalNames[selectedAnimal]} 스티커` }); $("animalQuizFeedback").textContent = "동물 스티커를 받았어!"; } }));
}

function avatarSvg(avatar = progress.avatar) {
  const colors = { blue: "#7dc5f5", pink: "#f8b7d1", mint: "#a5e1c8", yellow: "#ffe29d" };
  const backgrounds = { sky: "#d6f2ff", forest: "#dbf5d8", star: "#dfd9f9" };
  const hat = avatar.hat === "cap" ? '<path d="M65 51q35-39 70 0l15 10H58z" fill="#ed9a88" stroke="#a16b78" stroke-width="5"/>' : avatar.hat === "crown" ? '<path d="m62 59-8-33 24 14 20-25 23 25 24-14-9 33z" fill="#ffd65e" stroke="#b99142" stroke-width="5"/>' : "";
  const hair = avatar.hair === "spiky" ? '<path d="m62 67-7-35 18 12 12-29 18 24 23-22 14 44" fill="#6b688f"/>' : avatar.hair === "wave" ? '<path d="M56 67q-10-53 29-40 36-36 58 34" fill="#a37b9d"/>' : '<path d="M59 64q4-44 43-44t43 44" fill="#735f8e"/>';
  return `<svg viewBox="0 0 200 220" role="img" aria-label="내가 꾸민 캐릭터"><rect width="200" height="220" rx="24" fill="${backgrounds[avatar.background] || backgrounds.sky}"/><ellipse cx="100" cy="208" rx="71" ry="9" fill="#8ca8b988"/><path d="M53 206v-75q47-31 94 0v75" fill="${colors[avatar.body] || colors.blue}" stroke="#5388a5" stroke-width="6"/><circle cx="100" cy="87" r="48" fill="#ffdfba" stroke="#bd9d85" stroke-width="5"/>${hair}${hat}<circle cx="84" cy="88" r="5" fill="#514567"/><circle cx="117" cy="88" r="5" fill="#514567"/><path d="M87 108q14 15 28 0" fill="none" stroke="#bd6e81" stroke-width="4" stroke-linecap="round"/><path d="M54 151 34 184M147 151l20 33" stroke="${colors[avatar.body] || colors.blue}" stroke-width="17" stroke-linecap="round"/>${avatar.friend === "bot" ? '<circle cx="165" cy="176" r="20" fill="#72bce9" stroke="#3d83b5" stroke-width="4"/><circle cx="157" cy="174" r="2"/><circle cx="171" cy="174" r="2"/>' : '<circle cx="163" cy="177" r="20" fill="#ffe1a9" stroke="#ad8a7b" stroke-width="4"/><path d="m149 162-8-19 20 11m9 0 17-11-6 22" fill="#ffe1a9" stroke="#ad8a7b" stroke-width="3"/>'}</svg>`;
}
function renderDress() {
  const a = progress.avatar;
  content(`<div class="panel"><h3>나만의 캐릭터를 꾸며 줘!</h3><p>기본 아이템은 모두 무료야. 왕관은 별 15개를 모으면 열 수 있어. 꾸민 모습은 이 기기에 저장돼.</p><div class="two-col"><div class="avatar-art" id="avatarPreview">${avatarSvg()}</div><div class="wardrobe-controls"><label>옷 색상<select data-avatar="body"><option value="blue">하늘색</option><option value="pink">분홍색</option><option value="mint">민트색</option><option value="yellow">노란색</option></select></label><label>머리 모양<select data-avatar="hair"><option value="round">둥근 머리</option><option value="spiky">뾰족 머리</option><option value="wave">물결 머리</option></select></label><label>모자<select data-avatar="hat"><option value="none">없음</option><option value="cap">모자</option>${progress.ledger["crown-unlock"] ? '<option value="crown">별 왕관</option>' : ""}</select></label><label>로봇 친구<select data-avatar="friend"><option value="bot">윤봇</option><option value="cat">고양이 로봇</option></select></label><label>배경<select data-avatar="background"><option value="sky">하늘</option><option value="forest">숲</option><option value="star">별빛</option></select></label></div></div><div class="button-row"><button id="saveAvatar" class="primary-button" type="button">꾸미기 저장</button><button id="unlockCrown" class="soft-button" type="button" ${progress.ledger["crown-unlock"] || progress.stars < 15 ? "disabled" : ""}>${progress.ledger["crown-unlock"] ? "왕관 해금 완료" : "별 15개로 왕관 열기"}</button></div><p id="dressFeedback" class="feedback" role="status"></p></div>`);
  document.querySelectorAll("[data-avatar]").forEach((select) => { select.value = a[select.dataset.avatar]; select.addEventListener("change", () => { a[select.dataset.avatar] = select.value; $("avatarPreview").innerHTML = avatarSvg(); }); });
  $("saveAvatar").addEventListener("click", () => { save(); $("dressFeedback").textContent = "내 캐릭터를 저장했어! 다음에 와도 다시 만날 수 있어."; reward("dress-first", 2, "첫 꾸미기!", { complete: "캐릭터 꾸미기" }); });
  $("unlockCrown").addEventListener("click", () => { if (progress.ledger["crown-unlock"] || progress.stars < 15) return; progress.stars -= 15; progress.ledger["crown-unlock"] = true; save(); renderDress(); $("dressFeedback").textContent = "별 왕관을 열었어! 모자에서 골라 봐."; });
}

function renderCarousel() {
  content(`<div class="panel"><h3>빙글빙글 짝 찾기</h3><p>같은 그림 두 장을 찾아 줘. 짧게 즐길 수 있는 회전목마 게임이야!</p><div id="carouselMemory" class="memory-grid"></div><p id="carouselFeedback" class="feedback" role="status"></p><button id="carouselRestart" class="soft-button" type="button">새 카드로 다시 놀기</button></div>`);
  memoryGame("carouselMemory", [{ id: 0, front: "★", back: "★" }, { id: 1, front: "●", back: "●" }, { id: 2, front: "◆", back: "◆" }, { id: 3, front: "♥", back: "♥" }], () => { $("carouselFeedback").textContent = "모든 그림을 찾았어!"; reward("carousel-match", 5, "회전목마 짝 찾기!", { complete: "회전목마", sticker: "회전목마 스티커" }); });
  $("carouselRestart").addEventListener("click", renderCarousel);
}

function renderTreasure() {
  const rewards = ["무지개 미끄럼틀 첫 완주: 별 12개·무지개 별 스티커", "연구소 활동: 별 1~5개", "행성 미션: 행성별 별 6개·스티커", "동화 완독: 별 5개·숲 스티커", "동물과 놀고 퀴즈: 동물별 별 4개·스티커", "회전목마 짝 찾기: 별 5개·스티커", "첫 꾸미기 저장: 별 2개"];
  content(`<div class="panel"><h3>윤봇의 보물상자</h3><p class="word-big">★ ${progress.stars}개</p><p>이 별은 놀이 보상이에요. 현금이나 유료 상품과 연결되지 않아요.</p><h3>모은 스티커</h3><div class="reward-list">${progress.stickers.length ? progress.stickers.map((sticker) => `<span class="reward-chip">${escapeHtml(sticker)}</span>`).join("") : "아직 스티커가 없어요. 게임을 해 보자!"}</div><h3 style="margin-top:24px">보상 받는 방법</h3><ul>${rewards.map((rewardText) => `<li>${rewardText}</li>`).join("")}</ul><p class="source-note">각 보상은 이 기기에서 활동별 첫 완료 시 한 번만 받을 수 있어요.</p></div>`);
}
function renderDen() {
  content(`<div class="panel"><h3>나만의 아지트</h3><p>내가 놀고 배운 것을 한눈에 볼 수 있어!</p><div class="two-col"><div class="avatar-art">${avatarSvg()}</div><div class="den-grid"><div class="stat">모은 별<br><strong>${progress.stars}개</strong></div><div class="stat">미끄럼틀 최고 점수<br><strong>${progress.best}점</strong></div><div class="stat">완료한 활동<br><strong>${progress.completed.length}개</strong></div><div class="stat">배운 단어<br><strong>${progress.learned.length}개</strong></div></div></div></div><div class="two-col"><div class="panel"><h3>완료한 게임과 활동</h3><div class="reward-list">${progress.completed.length ? progress.completed.map((item) => `<span class="reward-chip">${escapeHtml(item)}</span>`).join("") : "아직 없어요. 놀이터에서 시작해 보자!"}</div><h3 style="margin-top:22px">수집한 스티커</h3><div class="reward-list">${progress.stickers.length ? progress.stickers.map((item) => `<span class="reward-chip">${escapeHtml(item)}</span>`).join("") : "아직 없어요."}</div></div><div class="panel"><h3>배운 윤건언어 단어</h3><div class="reward-list">${progress.learned.length ? progress.learned.map((term) => { const word = safeWords.find((item) => item[0] === term); return `<span class="reward-chip">${escapeHtml(term)}${word ? ` · ${escapeHtml(word[2])}` : ""}</span>`; }).join("") : "연구소에서 단어를 배워 보자!"}</div><h3 style="margin-top:22px">해금한 아이템</h3><p>${progress.ledger["crown-unlock"] ? "별 왕관" : "기본 꾸미기 아이템"}</p><p class="source-note">로그인 계정과 연결되지 않았어요. 브라우저 데이터를 지우면 이 기록도 지워져요.</p></div></div>`);
}
