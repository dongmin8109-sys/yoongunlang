"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Example, GRAMMAR_CATEGORY, RESEARCH_DONE, RESEARCH_KIND, RESEARCH_STATUS, RESEARCH_STEPS, dateTime, fullDate, pushId, readId, shortDate, stepIndex } from "../labels";
import { SiteFooter, SiteHeader } from "../site-header";

type Project = { id: number; kind: string; title: string; summary: string; status: string; createdAt: number; updatedAt: number; opinionCount: number };
type Detail = Project & {
  body: string; proposalCategory: string; proposalTitle: string; proposalSummary: string; proposalBody: string; proposalExamples: Example[];
  result: string; appliedGrammarId: number | null;
  log: { fromStatus: string | null; toStatus: string; note: string; changedAt: number }[];
  opinions: { id: number; authorName: string; body: string; createdAt: number }[];
};

function Steps({ status }: { status: string }) {
  const current = stepIndex(status);
  return <ol className="lab-steps" aria-label="연구 진행 단계">{RESEARCH_STEPS.map((step, i) => <li key={step.label} className={(i < current ? "done" : i === current ? "current" : "") + (i === current && status === "rejected" ? " rejected" : "")}>
    <b>{i + 1}</b><span>{i === current && (status === "approved" || status === "rejected") ? RESEARCH_STATUS[status] : step.label}</span></li>)}</ol>;
}

export default function Lab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState<Detail | null | "missing">(null);
  const [name, setName] = useState("");
  const [opinion, setOpinion] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setSelected(readId());
    const onPop = () => setSelected(readId());
    window.addEventListener("popstate", onPop);
    fetch("/api/lab", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error();
      setProjects(((await response.json()) as { projects: Project[] }).projects || []);
      setState("ready");
    }).catch(() => setState("error"));
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const response = await fetch("/api/lab/" + id, { cache: "no-store" });
    setDetail(response.ok ? ((await response.json()) as { project: Detail }).project : "missing");
  }, []);
  useEffect(() => {
    setDetail(null); setMessage(null);
    if (selected) loadDetail(selected).catch(() => setDetail("missing"));
  }, [selected, loadDetail]);

  const open = (id: number) => { setSelected(id); pushId(id); };
  const visible = useMemo(() => projects.filter(p => filter === "all" || (filter === "done" ? RESEARCH_DONE.includes(p.status) : !RESEARCH_DONE.includes(p.status))), [projects, filter]);
  const activeCount = projects.filter(p => !RESEARCH_DONE.includes(p.status)).length;

  async function submitOpinion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/lab/" + selected + "/opinions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, body: opinion }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "의견을 제출하지 못했습니다.");
      setOpinion(""); setMessage({ ok: true, text: "의견이 등록되었습니다. 소중한 의견 감사합니다." });
      await loadDetail(selected);
    } catch (e) { setMessage({ ok: false, text: e instanceof Error ? e.message : "의견을 제출하지 못했습니다." }); }
    finally { setBusy(false); }
  }

  const d = detail && detail !== "missing" ? detail : null;
  return <div className="site">
    <SiteHeader current="/lab" />
    <main>
      <section className="page-hero lab-hero"><div className="shell page-hero-inner">
        <div><p className="pill"><span className="pulse-dot" /> YOONGUN LANGUAGE LAB</p><h1>윤건언어 <em>연구소</em></h1>
          <p className="page-sub">연구개발팀이 새로운 문법과 표현을 연구하고 개정안을 공개하는 곳입니다. 의견 수렴 단계의 연구에는 누구나 의견을 남길 수 있어요.</p></div>
        <div className="page-hero-stats"><span><strong>{state === "ready" ? activeCount : "—"}</strong>진행 중인 연구</span><span><strong>{state === "ready" ? projects.length - activeCount : "—"}</strong>완료 기록</span></div>
      </div></section>
      <section className="process-bar"><div className="shell process-inner lab-process">{RESEARCH_STEPS.map((step, i) => <span key={step.label} className="lab-process-step">{i > 0 && <span className="process-line" />}<b>{String(i + 1).padStart(2, "0")}</b> {step.label}</span>)}</div></section>

      <div className="shell lab-main" aria-live="polite">
        {selected ? (detail === null ? <div className="doc-empty"><p>연구 과제를 불러오는 중입니다…</p></div>
          : !d ? <div className="doc-empty"><span>?</span><strong>연구 과제를 찾을 수 없습니다.</strong><p>비공개로 전환되었거나 삭제된 과제입니다.</p><button type="button" className="ghost-button" onClick={() => open(0)}>연구 목록으로</button></div>
          : <article className="lab-detail">
            <button type="button" className="back-button" onClick={() => open(0)}>← 연구 목록</button>
            <div className="doc-meta"><span className="cat-badge">{RESEARCH_KIND[d.kind]}</span><span className={"status-pill " + d.status}>{RESEARCH_STATUS[d.status]}</span><span>연구 #{d.id} · 등록 {fullDate(d.createdAt)} · 최근 갱신 {fullDate(d.updatedAt)}</span></div>
            <h2>{d.title}</h2>
            <Steps status={d.status} />
            {d.summary && <p className="doc-summary">{d.summary}</p>}
            <div className="doc-block"><h3>연구 내용</h3><div className="doc-body">{d.body}</div></div>
            {(d.proposalTitle || d.proposalBody) && <div className="proposal-box">
              <p className="section-label">PROPOSED REVISION · 개정안</p>
              <h3>{d.proposalTitle}{d.proposalCategory && <span className="cat-badge">{GRAMMAR_CATEGORY[d.proposalCategory]}</span>}</h3>
              {d.proposalSummary && <p className="doc-summary">{d.proposalSummary}</p>}
              {d.proposalBody && <div className="doc-body">{d.proposalBody}</div>}
              {d.proposalExamples.length > 0 && <ol className="example-list">{d.proposalExamples.map((x, i) => <li key={i}><strong lang="x-yg">{x.text}</strong>{x.meaning && <span>{x.meaning}</span>}{x.note && <small>{x.note}</small>}</li>)}</ol>}
              <p className="proposal-note">{d.status === "applied" ? "이 개정안은 공식 문법서에 반영되었습니다." : "개정안은 아직 공식 문법이 아닙니다. 최고 관리자의 최종 확인을 거쳐 공식 문법서에 반영됩니다."}</p>
            </div>}
            {d.result && <div className="doc-block result-block"><h3>연구 결과 발표</h3><div className="doc-body">{d.result}</div></div>}
            {d.appliedGrammarId && d.status === "applied" && <a className="primary-button applied-link" href={"/grammar?id=" + d.appliedGrammarId}>공식 문법서에서 보기 ↗</a>}
            <div className="doc-block"><h3>진행 기록</h3><ul className="timeline">{d.log.map((item, i) => <li key={i}><time>{dateTime(item.changedAt)}</time><strong>{RESEARCH_STATUS[item.toStatus]}</strong>{item.note && <span>{item.note}</span>}</li>)}</ul></div>
            <div className="doc-block opinions"><h3>회원 의견 <b>{d.opinions.length}</b></h3>
              {d.status === "feedback" ? <form className="word-form opinion-form" onSubmit={submitOpinion}>
                <label htmlFor="op-name">이름 <span>닉네임 가능 · 20자 이내</span></label>
                <input id="op-name" value={name} onChange={e => setName(e.target.value)} maxLength={20} required disabled={busy} />
                <label htmlFor="op-body">의견 <span>1000자 이내</span></label>
                <textarea id="op-body" value={opinion} onChange={e => setOpinion(e.target.value)} maxLength={1000} rows={4} required disabled={busy} placeholder="이 연구에 대한 생각을 자유롭게 남겨 주세요." />
                {message && <p className={message.ok ? "form-ok" : "form-error"} role="status">{message.text}</p>}
                <button className="submit-button" disabled={busy} type="submit">{busy ? "제출 중…" : "의견 제출하기"} <span aria-hidden="true">→</span></button>
                <p className="form-note">제출한 의견은 공개되며, 운영 정책에 맞지 않는 의견은 관리자가 숨길 수 있습니다. 의견은 연구 결과를 직접 수정하지 않습니다.</p>
              </form> : <p className="muted">{d.status === "proposed" || d.status === "reviewing" ? "검토가 끝나면 의견 수렴 단계에서 의견을 받습니다." : "의견 수렴이 끝난 연구입니다."}</p>}
              {d.opinions.length > 0 && <div className="opinion-list">{d.opinions.map(o => <div key={o.id} className="opinion"><div><strong>{o.authorName}</strong><time>{shortDate(o.createdAt)}</time></div><p>{o.body}</p></div>)}</div>}
            </div>
          </article>)
        : <>
          <div className="lab-tabs" role="tablist">
            {([["active", "진행 중인 연구"], ["done", "완료·확정 기록"], ["all", "전체"]] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? "active" : ""} type="button" onClick={() => setFilter(key)}>{label}</button>)}
          </div>
          {state === "loading" ? <div className="doc-empty"><p>연구 과제를 불러오는 중입니다…</p></div>
            : state === "error" ? <div className="doc-empty"><span>!</span><strong>연구 과제를 불러오지 못했습니다.</strong><p>잠시 후 새로고침해 주세요.</p></div>
            : visible.length ? <div className="lab-grid">{visible.map(p => <a key={p.id} className="lab-card" href={"/lab?id=" + p.id} onClick={event => { event.preventDefault(); open(p.id); }}>
              <div className="lab-card-top"><span className="cat-badge">{RESEARCH_KIND[p.kind]}</span><span className={"status-pill " + p.status}>{RESEARCH_STATUS[p.status]}</span></div>
              <strong>{p.title}</strong>{p.summary && <p>{p.summary}</p>}
              <div className="lab-card-foot"><span>연구 #{p.id}</span><span>의견 {p.opinionCount}</span><span>{shortDate(p.updatedAt)}</span></div></a>)}</div>
            : <div className="doc-empty"><span>◈</span><strong>{filter === "done" ? "아직 완료된 연구 기록이 없습니다." : "현재 공개된 연구 과제가 없습니다."}</strong><p>새로운 연구가 등록되면 이곳에 공개됩니다.</p></div>}
          <p className="lab-team">연구개발팀 소개는 <a href="/research.html">연구개발팀 페이지</a>에서 볼 수 있습니다.</p>
        </>}
      </div>
    </main>
    <SiteFooter />
  </div>;
}
