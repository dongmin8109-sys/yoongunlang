"use strict";

const portalHeader=document.querySelector("#portalHeader");
if(portalHeader){
  const pages=[
    ["language.html","윤건언어"],["dictionary.html","사전"],["learn.html","배우기"],
    ["game.html","게임"],["kidszone.html","키즈존"],["community.html","커뮤니티"],["media.html","미디어"],
    ["research.html","연구개발팀"],["/grammar","공식 문법서"],["/lab","연구소"],["/notices","공지센터"]
  ];
  const current=location.pathname.split("/").pop();
  const navigation=pages.map(([href,label])=>`<a href="${href}"${current===href?' aria-current="page"':""}>${label}</a>`).join("");
  portalHeader.innerHTML=`
    <div class="utility"><div class="wrap utility-inner"><span>윤건언어의 모든 것</span><a href="language.html">윤건언어 소개</a></div></div>
    <header class="site-header"><div class="wrap masthead">
      <a class="logo" href="/portal.html" aria-label="윤건언어 포털 홈"><span class="logo-symbol">윤</span><span class="logo-word">YOONGUN<small>LANGUAGE PORTAL</small></span></a>
      <form class="search-box" role="search" action="/portal.html"><label class="sr-only" for="shellQuery">윤건언어 통합검색</label><input id="shellQuery" name="q" type="search" placeholder="단어, 문법, 게임을 검색하세요"><button type="submit" aria-label="검색"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></button></form>
      <a class="account-link" href="account.html"><span class="account-circle">YG</span><span>내 활동</span></a>
    </div><nav class="primary-nav" aria-label="주요 서비스"><div class="wrap nav-inner">${navigation}<a href="https://smartstore.naver.com/wowotshop" target="_blank" rel="noopener noreferrer">윤건샵 <span aria-hidden="true">↗</span></a></div></nav></header>`;
}

const portalFooter=document.querySelector("#portalFooter");
if(portalFooter){
  portalFooter.innerHTML=`<footer class="footer"><div class="wrap footer-inner"><div><strong>YOONGUN</strong><p>윤건언어 포털</p></div><div><a href="language.html">윤건언어</a><a href="dictionary.html">사전</a><a href="game.html">게임</a><a href="mailto:yungunlang@naver.com">문의</a></div></div></footer>`;
}
