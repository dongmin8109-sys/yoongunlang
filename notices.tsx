"use client";

import { useEffect, useMemo, useState } from "react";
import { NOTICE_CATEGORY, NOTICE_ORDER, dateTime, norm, pushId, readId, shortDate } from "../labels";
import { SiteFooter, SiteHeader } from "../site-header";

type Notice = { id: number; category: string; title: string; body: string; pinned: number; createdAt: number; updatedAt: number };

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(readId());
    const onPop = () => setSelected(readId());
    window.addEventListener("popstate", onPop);
    fetch("/api/notices", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error();
      setNotices(((await response.json()) as { notices: Notice[] }).notices || []);
      setState("ready");
    }).catch(() => setState("error"));
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = (id: number) => { setSelected(id); pushId(id); };
  const filtered = useMemo(() => {
    const key = norm(query.trim());
    return notices.filter(n => (category === "all" || n.category === category) && (!key || norm(n.title + " " + n.body).includes(key)));
  }, [notices, category, query]);
  const notice = notices.find(n => n.id === selected);
  const edited = (n: Notice) => n.updatedAt - n.createdAt > 60000;

  return <div className="site">
    <SiteHeader current="/notices" />
    <main>
      <section className="page-hero notice-hero"><div className="shell page-hero-inner">
        <div><p className="pill"><span className="pulse-dot" /> OFFICIAL NOTICE</p><h1>윤건언어 <em>공식 공지센터</em></h1>
          <p className="page-sub">윤건언어 운영진이 전하는 공식 공지사항입니다. 업데이트, 서버 점검, 운영 정책을 이곳에서 가장 먼저 확인하세요.</p></div>
        <div className="page-hero-stats"><span><strong>{state === "ready" ? notices.length : "—"}</strong>전체 공지</span><span><strong>{state === "ready" ? notices.filter(n => n.pinned).length : "—"}</strong>상단 고정</span></div>
      </div></section>

      <div className="shell notice-main" aria-live="polite">
        {selected ? (state === "loading" ? <div className="doc-empty"><p>공지를 불러오는 중입니다…</p></div>
          : notice ? <article className="notice-detail">
            <button type="button" className="back-button" onClick={() => open(0)}>← 공지 목록</button>
            <div className="doc-meta"><span className={"notice-badge " + notice.category}>{NOTICE_CATEGORY[notice.category]}</span>{notice.pinned ? <span className="pin-tag">상단 고정</span> : null}</div>
            <h2>{notice.title}</h2>
            <dl className="notice-dates"><div><dt>작성일</dt><dd>{dateTime(notice.createdAt)}</dd></div>{edited(notice) && <div><dt>수정일</dt><dd>{dateTime(notice.updatedAt)}</dd></div>}</dl>
            <div className="doc-body notice-body">{notice.body}</div>
            <button type="button" className="ghost-button" onClick={() => open(0)}>목록으로</button>
          </article>
          : <div className="doc-empty"><span>?</span><strong>공지를 찾을 수 없습니다.</strong><p>삭제되었거나 주소가 올바르지 않습니다.</p><button type="button" className="ghost-button" onClick={() => open(0)}>공지 목록으로</button></div>)
        : <>
          <div className="notice-toolbar">
            <div className="lab-tabs notice-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={category === "all"} className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>전체</button>
              {NOTICE_ORDER.map(key => <button key={key} type="button" role="tab" aria-selected={category === key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>{NOTICE_CATEGORY[key]}</button>)}
            </div>
            <label className="doc-search notice-search"><span className="sr-only">공지 검색</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="공지 검색" /></label>
          </div>
          {state === "loading" ? <div className="doc-empty"><p>공지를 불러오는 중입니다…</p></div>
            : state === "error" ? <div className="doc-empty"><span>!</span><strong>공지를 불러오지 못했습니다.</strong><p>잠시 후 새로고침해 주세요.</p></div>
            : filtered.length ? <ul className="notice-list">{filtered.map(n => <li key={n.id}><a href={"/notices?id=" + n.id} className={n.pinned ? "pinned" : ""} onClick={event => { event.preventDefault(); open(n.id); }}>
              <span className={"notice-badge " + n.category}>{n.pinned ? "고정 · " : ""}{NOTICE_CATEGORY[n.category]}</span>
              <strong>{n.title}</strong>
              <span className="notice-date">{shortDate(n.createdAt)}{edited(n) && <small> · 수정 {shortDate(n.updatedAt)}</small>}</span></a></li>)}</ul>
            : <div className="doc-empty"><span>✉</span><strong>{notices.length ? "조건에 맞는 공지가 없습니다." : "등록된 공지가 없습니다."}</strong><p>{notices.length ? "다른 카테고리나 검색어를 사용해 보세요." : "새 공지가 게시되면 이곳에 표시됩니다."}</p></div>}
        </>}
      </div>
    </main>
    <SiteFooter />
  </div>;
}
