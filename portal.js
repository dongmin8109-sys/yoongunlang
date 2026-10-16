"use strict";

const portalPages = [
  {title:"윤건언어 소개",detail:"역사, 문자, 문법, 어휘와 회화",href:"language.html",terms:"윤건언어 역사 문자 문법 어휘 회화 소개"},
  {title:"온라인 윤건언어 사전",detail:"단어, 발음과 한국어 뜻 검색",href:"dictionary.html",terms:"사전 단어 검색 발음 뜻"},
  {title:"기초 단어 배우기",detail:"윤건언어 표현을 익히고 퀴즈 풀기",href:"learn.html",terms:"배우기 학습 강의 문제 퀴즈"},
  {title:"윤건언어 아레나",detail:"캐릭터와 함께하는 연습전과 온라인 대전",href:"game.html",terms:"게임 아레나 캐릭터 전투 대전"},
  {title:"커뮤니티",detail:"교류 공간 안내",href:"community.html",terms:"커뮤니티 게시판 질문 번역 창작"},
  {title:"미디어",detail:"윤건언어 발음 오디오",href:"media.html",terms:"미디어 발음 오디오 영상 음악"},
  {title:"연구개발팀",detail:"프로젝트를 만드는 사람들",href:"research.html",terms:"연구개발팀 연구소 송윤건 이동민 박찬준 허윤 김준우"},
  {title:"공식 문법서",detail:"공식 확정된 윤건언어 문법 규칙",href:"/grammar",terms:"공식 문법서 문법 품사 어순 시제 문장 구조 표기법 예문"},
  {title:"윤건언어 연구소",detail:"연구 과제, 개정안, 연구 결과와 의견 제출",href:"/lab",terms:"연구소 연구 과제 개정안 의견 표현 문법 연구"},
  {title:"공식 공지센터",detail:"운영진 공지, 업데이트, 서버 점검 안내",href:"/notices",terms:"공지 공지사항 공지센터 업데이트 점검 장애 운영 정책"},
  {title:"윤건샵",detail:"관련 상품을 판매하는 외부 스토어",href:"https://smartstore.naver.com/wowotshop",terms:"윤건샵 인공어샵 굿즈 상품 사전"}
];

const form=document.querySelector("#portalSearch");
if(form){
  const input=document.querySelector("#portalQuery");
  const panel=document.querySelector("#searchResults");
  const count=document.querySelector("#wordCount");
  const daily=document.querySelector("#dailyWord");
  let words=[];
  const norm=value=>String(value).normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[’'`]/g,"").replace(/\s+/g,"").trim();
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};

  function resultGroup(title,items){
    const section=el("section","result-group");
    section.append(el("h3","",`${title} ${items.length}개`));
    const list=el("div","result-list");
    items.slice(0,8).forEach(item=>{
      const link=el("a","result-item");link.href=item.href;
      link.append(el("strong","",item.title),el("span","",item.detail));
      list.append(link);
    });
    section.append(list);
    if(items.length>8){const more=el("a","text-link","전체 사전 결과 보기 ↗");more.href=`dictionary.html?q=${encodeURIComponent(input.value.trim())}`;section.append(more);}
    return section;
  }

  function renderSearch(query){
    const raw=query.trim();
    if(!raw){panel.hidden=true;panel.replaceChildren();return;}
    const key=norm(raw);
    const matchingWords=words.filter(word=>word.some(value=>norm(value).includes(key))).map(word=>({title:word[0],detail:`${word[1]} · ${word[2]}`,href:`dictionary.html?q=${encodeURIComponent(raw)}`}));
    const matchingPages=portalPages.filter(page=>norm(`${page.title} ${page.detail} ${page.terms}`).includes(key));
    panel.replaceChildren();
    panel.append(el("h2","",`“${raw}” 검색 결과`),el("p","result-summary",`사전 ${matchingWords.length}개 · 서비스 ${matchingPages.length}개`));
    if(matchingWords.length)panel.append(resultGroup("사전",matchingWords));
    if(matchingPages.length)panel.append(resultGroup("서비스",matchingPages));
    if(!matchingWords.length&&!matchingPages.length)panel.append(el("p","search-empty","일치하는 결과가 없습니다. 다른 단어로 검색해 보세요."));
    panel.hidden=false;
  }

  form.addEventListener("submit",event=>{
    event.preventDefault();
    const query=input.value.trim();
    const url=new URL(location.href);
    if(query)url.searchParams.set("q",query);else url.searchParams.delete("q");
    history.pushState({},"",url);
    renderSearch(query);
    if(query)panel.scrollIntoView({behavior:"smooth",block:"start"});
  });
  window.addEventListener("popstate",()=>{input.value=new URLSearchParams(location.search).get("q")||"";renderSearch(input.value);});
  input.value=new URLSearchParams(location.search).get("q")||"";
  renderSearch(input.value);

  fetch("/api/words", {cache:"no-store"}).then(response=>{if(!response.ok)throw Error("word data unavailable");return response.json();}).then(data=>{
    words=Array.isArray(data)?data.filter(item=>Array.isArray(item)&&item.length>=3):[];
    count.textContent=words.length.toLocaleString("ko-KR");
    if(words.length){
      const today=new Date();
      const day=Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000);
      const word=words[day%words.length];
      daily.replaceChildren(el("div","daily-term",word[0]),el("p","daily-pron",word[1]),el("p","daily-meaning",word[2]));
    }else daily.replaceChildren(el("p","muted","등록된 단어가 없습니다."));
    renderSearch(input.value);
  }).catch(()=>{
    count.textContent="—";
    daily.replaceChildren(el("p","muted","단어를 불러오지 못했습니다. 사전에서 다시 시도해 주세요."));
    renderSearch(input.value);
  });
}

// 공식 공지센터의 최신 공지 (textContent만 사용)
const portalNotices=document.querySelector("#portalNotices");
if(portalNotices){
  const labels={important:"중요",general:"일반",update:"업데이트",maintenance:"점검·장애",policy:"정책"};
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  fetch("/api/notices?limit=3",{cache:"no-store"}).then(response=>{if(!response.ok)throw Error("notices unavailable");return response.json();}).then(data=>{
    const list=Array.isArray(data.notices)?data.notices:[];
    if(!list.length){portalNotices.replaceChildren(make("p","muted","등록된 공지가 없습니다."));return;}
    portalNotices.replaceChildren(...list.map(item=>{
      const link=make("a","portal-notice");link.href=`/notices?id=${encodeURIComponent(item.id)}`;
      link.append(make("span","portal-notice-tag",(item.pinned?"고정 · ":"")+(labels[item.category]||"공지")),make("strong","",String(item.title)),make("small","",new Date(item.createdAt).toLocaleDateString("ko-KR")));
      return link;
    }));
  }).catch(()=>portalNotices.replaceChildren(make("p","muted","공지를 불러오지 못했습니다.")));
}

