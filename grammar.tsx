"use client";

import { useEffect, useMemo, useState } from "react";
import { type Example, GRAMMAR_CATEGORY, GRAMMAR_ORDER, fullDate, norm, pushId, readId, shortDate } from "../labels";
import { SiteFooter, SiteHeader } from "../site-header";

type Entry = { id: number; category: string; title: string; summary: string; body: string; examples: Example[]; related: { id: number; title: string }[]; version: number; updatedAt: number; createdAt: number };
type Revision = { version: number; title: string; note: string; researchId: number | null; confirmedAt: number };

export default function Grammar() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [history, setHistory] = useState<Revision[] | null>(null);

  useEffect(() => {
    setSelected(readId());
    const onPop = () => setSelected(readId());
    window.addEventListener("popstate", onPop);
    fetch("/api/grammar", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error();
      setEntries(((await response.json()) as { entries: Entry[] }).entries || []);
      setState("ready");
    }).catch(() => setState("error"));
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    setHistory(null);
    if (!selected) return;
    fetch("/api/grammar/" + selected + "/history", { cache: "no-store" }).then(async response => {
      if (response.ok) setHistory(((await response.json()) as { history: Revision[] }).history || []);
    }).catch(() => setHistory([]));
  }, [selected]);

  const open = (id: number) => { setSelected(id); pushId(id); };
  const filtered = useMemo(() => {
    const key = norm(query.trim());
    return entries.filter(entry => (category === "all" || entry.category === category) &&
      (!key || norm([entry.title, entry.summary, entry.body, ...entry.examples.flatMap(x => [x.text, x.meaning])].join(" ")).includes(key)));
  }, [entries, category, query]);
  const counts = useMemo(() => Object.fromEntries(GRAMMAR_ORDER.map(key => [key, entries.filter(e => e.category === key).length])), [entries]);
  const lastUpdated = entries.reduce((max, e) => Math.max(max, e.updatedAt), 0);
  const entry = entries.find(item => item.id === selected);

  return <div className="site">
    <SiteHeader current="/grammar" />
    <main>
      <section className="page-hero"><div className="shell page-hero-inner">
        <div><p className="pill"><span className="pulse-dot" /> OFFICIAL GRAMMAR</p><h1>윤건언어 <em>공식 문법서</em></h1>
          <p className="page-sub">운영진이 공식 확정한 윤건언어 문법만 수록합니다. 검토 중인 내용은 <a href="/lab">윤건언어 연구소</a>에서 확인할 수 있어요.</p></div>
        <div className="page-hero-stats"><span><strong>{state === "ready" ? entries.length : "—"}</strong>공식 문법 항목</span><span><strong>{lastUpdated ? shortDate(lastUpdated) : "—"}</strong>최종 개정일</span></div>
      </div></section>

      <div className="shell doc-layout">
        <aside className="doc-toc" aria-label="문법 목차">
          <label className="doc-search"><span className="sr-only">문법 검색</span><input type="search" value={query} onChange={e => { setQuery(e.target.value); if (selected) open(0); }} placeholder="문법 검색 (제목·설명·예문)" /></label>
          <div className="toc-cats">
            <button type="button" className={category === "all" ? "active" : ""} onClick={() => { setCategory("all"); if (selected) open(0); }}>전체 <b>{entries.length}</b></button>
            {GRAMMAR_ORDER.map(key => <button key={key} type="button" className={category === key ? "active" : ""} onClick={() => { setCategory(key); if (selected) open(0); }}>{GRAMMAR_CATEGORY[key]} <b>{counts[key] || 0}</b></button>)}
          </div>
          {entries.length > 0 && <nav className="toc-list">{GRAMMAR_ORDER.filter(key => counts[key]).map(key => <div key={key}><p>{GRAMMAR_CATEGORY[key]}</p>
            {entries.filter(e => e.category === key).map(e => <a key={e.id} href={"/grammar?id=" + e.id} className={e.id === selected ? "active" : ""} onClick={event => { event.preventDefault(); open(e.id); }}>{e.title}</a>)}</div>)}</nav>}
        </aside>

        <section className="doc-main" aria-live="polite">
          {state === "loading" ? <div className="doc-empty"><p>문법서를 불러오는 중입니다…</p></div>
            : state === "error" ? <div className="doc-empty"><span>!</span><strong>문법서를 불러오지 못했습니다.</strong><p>잠시 후 새로고침해 주세요.</p></div>
            : selected && entry ? <article className="doc-article">
              <button type="button" className="back-button" onClick={() => open(0)}>← 문법 목록</button>
              <div className="doc-meta"><span className="cat-badge">{GRAMMAR_CATEGORY[entry.category]}</span><span className="official-badge">공식 v{entry.version}</span><span>최종 수정일 {fullDate(entry.updatedAt)}</span></div>
              <h2>{entry.title}</h2>
              {entry.summary && <p className="doc-summary">{entry.summary}</p>}
              <div className="doc-body">{entry.body}</div>
              {entry.examples.length > 0 && <div className="doc-block"><h3>예문</h3><ol className="example-list">{entry.examples.map((x, i) => <li key={i}><strong lang="x-yg">{x.text}</strong>{x.meaning && <span>{x.meaning}</span>}{x.note && <small>{x.note}</small>}</li>)}</ol></div>}
              {entry.related.length > 0 && <div className="doc-block"><h3>관련 문법</h3><div className="chip-row">{entry.related.map(r => <a key={r.id} className="chip" href={"/grammar?id=" + r.id} onClick={event => { event.preventDefault(); open(r.id); }}>{r.title} →</a>)}</div></div>}
              <div className="doc-block"><h3>개정 이력</h3>{history === null ? <p className="muted">불러오는 중…</p> : <ul className="revision-list">{history.map(h => <li key={h.version}><b>v{h.version}</b><span>{h.note || (h.version === 1 ? "최초 공식 확정" : "개정")}{h.researchId ? <> · <a href={"/lab?id=" + h.researchId}>연구 #{h.researchId}</a></> : null}</span><time>{shortDate(h.confirmedAt)}</time></li>)}</ul>}</div>
            </article>
            : selected ? <div className="doc-empty"><span>?</span><strong>공식 문법 항목을 찾을 수 없습니다.</strong><p>삭제되었거나 아직 공식 확정되지 않은 항목입니다.</p><button type="button" className="ghost-button" onClick={() => open(0)}>문법 목록으로</button></div>
            : !entries.length ? <div className="doc-empty"><span>✎</span><strong>아직 공식 확정된 문법이 없습니다.</strong><p>윤건언어 문법은 연구개발팀의 검토를 거쳐 순차적으로 공개됩니다.</p><a className="ghost-button" href="/lab">연구소에서 진행 상황 보기 →</a></div>
            : <>
              <div className="doc-list-head"><h2>{category === "all" ? "전체 문법" : GRAMMAR_CATEGORY[category]}</h2><span>{filtered.length}개 항목</span></div>
              {filtered.length ? <div className="doc-cards">{filtered.map(e => <a key={e.id} href={"/grammar?id=" + e.id} className="doc-card" onClick={event => { event.preventDefault(); open(e.id); }}>
                <span className="cat-badge">{GRAMMAR_CATEGORY[e.category]}</span><strong>{e.title}</strong>{e.summary && <p>{e.summary}</p>}<small>v{e.version} · {shortDate(e.updatedAt)} 수정</small></a>)}</div>
                : <div className="doc-empty"><strong>검색 결과가 없습니다.</strong><p>다른 낱말로 검색하거나 카테고리를 바꿔 보세요.</p></div>}
            </>}
        </section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
