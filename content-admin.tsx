"use client";

import { useCallback, useEffect, useState } from "react";
import { type Example, GRAMMAR_CATEGORY, GRAMMAR_ORDER, NOTICE_CATEGORY, NOTICE_ORDER, RESEARCH_KIND, RESEARCH_STATUS, dateTime, shortDate } from "../labels";

type Role = "chief" | "assistant";
export type ContentTab = "grammar" | "lab" | "notices" | "settings";
type Grammar = { id: number; category: string; title: string; summary: string; body: string; examples: Example[]; related: number[]; status: string; officialVersion: number; researchId: number | null; updatedAt: number; updatedBy: Role };
type Research = { id: number; kind: string; title: string; summary: string; body: string; status: string; isPublic: number; proposalCategory: string; proposalTitle: string; proposalSummary: string; proposalBody: string; proposalExamples: Example[]; targetGrammarId: number | null; result: string; appliedGrammarId: number | null; updatedAt: number };
type Notice = { id: number; category: string; title: string; body: string; pinned: number; createdAt: number; updatedAt: number; authorRole: Role };
type Opinion = { id: number; projectId: number; projectTitle: string; authorName: string; body: string; status: string; createdAt: number };
type Overview = { role: Role; permissions: Record<string, boolean>; trash: { type: string; id: number; title: string; deletedAt: number }[]; grammar: Grammar[]; research: Research[]; notices: Notice[]; opinions: Opinion[] };
type Revision = { version: number; title: string; note: string; researchId: number | null; confirmedBy: Role; confirmedAt: number };

const TRANSITIONS: Record<string, string[]> = {
  proposed: ["reviewing", "rejected"], reviewing: ["feedback", "approved", "rejected", "proposed"],
  feedback: ["approved", "rejected", "reviewing"], approved: ["applied", "feedback"], rejected: ["reviewing"], applied: [],
};
const CHIEF_ONLY = ["approved", "rejected", "applied"];
const roleName = (role: Role) => role === "chief" ? "최고 관리자" : "보조 관리자";

async function request<T = Record<string, unknown>>(path: string, method: string, payload?: object): Promise<T> {
  const response = await fetch(path, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result;
}

function ExamplesEditor({ value, onChange }: { value: Example[]; onChange: (next: Example[]) => void }) {
  const set = (i: number, key: keyof Example, v: string) => onChange(value.map((x, j) => j === i ? { ...x, [key]: v } : x));
  return <div className="examples-editor">
    {value.map((x, i) => <div className="example-row" key={i}>
      <input aria-label={"예문 " + (i + 1)} value={x.text} maxLength={300} placeholder="윤건언어 예문" onChange={e => set(i, "text", e.target.value)} />
      <input aria-label={"예문 " + (i + 1) + " 뜻"} value={x.meaning} maxLength={300} placeholder="한국어 뜻" onChange={e => set(i, "meaning", e.target.value)} />
      <input aria-label={"예문 " + (i + 1) + " 설명"} value={x.note} maxLength={300} placeholder="설명 (선택)" onChange={e => set(i, "note", e.target.value)} />
      <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={"예문 " + (i + 1) + " 삭제"}>×</button>
    </div>)}
    {value.length < 20 && <button type="button" className="add-example" onClick={() => onChange([...value, { text: "", meaning: "", note: "" }])}>+ 예문 추가</button>}
  </div>;
}

const emptyGrammar = { category: "pos", title: "", summary: "", body: "", examples: [] as Example[], related: [] as number[] };
const emptyResearch = { kind: "grammar", title: "", summary: "", body: "", isPublic: true, proposalCategory: "", proposalTitle: "", proposalSummary: "", proposalBody: "", proposalExamples: [] as Example[], targetGrammarId: 0, result: "" };
const emptyNotice = { category: "general", title: "", body: "", pinned: false };

export default function ContentAdmin({ tab, role }: { tab: ContentTab; role: Role }) {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [grammarForm, setGrammarForm] = useState(emptyGrammar);
  const [grammarEditing, setGrammarEditing] = useState<number | null>(null);
  const [researchForm, setResearchForm] = useState(emptyResearch);
  const [researchEditing, setResearchEditing] = useState<number | null>(null);
  const [noticeForm, setNoticeForm] = useState(emptyNotice);
  const [noticeEditing, setNoticeEditing] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<{ id: number; list: Revision[] } | null>(null);

  const refresh = useCallback(async () => {
    try { setData(await request<Overview>("/api/admin/content", "GET")); }
    catch (e) { setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function run(action: () => Promise<unknown>, done = "") {
    setBusy(true); setError(""); setNotice("");
    try { await action(); if (done) setNotice(done); await refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); return false; }
    finally { setBusy(false); }
  }
  const top = () => window.scrollTo({ top: 240, behavior: "smooth" });
  const can = (key: string) => role === "chief" || !!data?.permissions[key];

  if (!data) return <section className="admin-panel"><p className="muted">{error || "불러오는 중입니다…"}</p></section>;
  const messages = <>{error && <p className="form-error admin-error" role="alert">{error}</p>}{notice && <p className="form-ok admin-error" role="status">{notice}</p>}</>;
  const locked = (key: string) => !can(key) && <p className="form-error">최고 관리자가 이 기능을 보조 관리자에게 허용하지 않았습니다. 열람만 가능합니다.</p>;

  // ───── 공식 문법서 ─────
  if (tab === "grammar") {
    const save = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void run(() => request(grammarEditing ? "/api/admin/grammar/" + grammarEditing : "/api/admin/grammar", grammarEditing ? "PATCH" : "POST", grammarForm), grammarEditing ? "초안을 저장했습니다. 공식 확정 전까지 공개 화면에는 이전 공식본이 표시됩니다." : "문법 초안을 등록했습니다.")
        .then(ok => { if (ok) { setGrammarForm(emptyGrammar); setGrammarEditing(null); } });
    };
    const confirm = (g: Grammar) => {
      const note = window.prompt(`"${g.title}"을(를) 공식 문법 v${g.officialVersion + 1}로 확정합니다.\n개정 내용 메모를 입력하세요. (선택)`, g.officialVersion ? "" : "최초 공식 확정");
      if (note === null) return;
      void run(() => request("/api/admin/grammar/" + g.id + "/confirm", "POST", { note }), "공식 문법으로 확정했습니다. 공개 화면에 반영되었습니다.");
    };
    const remove = (g: Grammar) => { if (window.confirm(`"${g.title}" 문법 항목을 삭제할까요?${g.officialVersion ? "\n공식 문법서에서도 내려갑니다. (최고 관리자 화면에서 복구 가능)" : ""}`)) void run(() => request("/api/admin/grammar/" + g.id, "DELETE"), "삭제했습니다."); };
    const showRevisions = (g: Grammar) => void run(async () => setRevisions({ id: g.id, list: (await request<{ revisions: Revision[] }>("/api/admin/grammar/" + g.id + "/revisions", "GET")).revisions }));
    return <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>공식 문법서</h2><p>초안은 공개되지 않습니다. 최고 관리자가 공식 확정한 내용만 일반 이용자에게 표시됩니다.</p></div><a className="ghost-button" href="/grammar" target="_blank" rel="noopener noreferrer">문법서 보기 ↗</a></div>
      {messages}{locked("assistant_grammar")}
      {can("assistant_grammar") && <form className="news-editor content-editor" onSubmit={save}>
        <div className="editor-grid">
          <div><label htmlFor="g-cat">카테고리</label><select id="g-cat" value={grammarForm.category} onChange={e => setGrammarForm({ ...grammarForm, category: e.target.value })}>{GRAMMAR_ORDER.map(k => <option key={k} value={k}>{GRAMMAR_CATEGORY[k]}</option>)}</select></div>
          <div><label htmlFor="g-title">문법 제목</label><input id="g-title" value={grammarForm.title} maxLength={100} required onChange={e => setGrammarForm({ ...grammarForm, title: e.target.value })} /></div>
        </div>
        <label htmlFor="g-sum">요약 <span>(선택)</span></label><input id="g-sum" value={grammarForm.summary} maxLength={300} onChange={e => setGrammarForm({ ...grammarForm, summary: e.target.value })} />
        <label htmlFor="g-body">설명</label><textarea id="g-body" value={grammarForm.body} maxLength={8000} rows={8} required onChange={e => setGrammarForm({ ...grammarForm, body: e.target.value })} placeholder="확정된 규칙만 작성해 주세요." />
        <label>예문</label><ExamplesEditor value={grammarForm.examples} onChange={examples => setGrammarForm({ ...grammarForm, examples })} />
        {data.grammar.filter(g => g.id !== grammarEditing).length > 0 && <><label>관련 문법</label><div className="check-grid">{data.grammar.filter(g => g.id !== grammarEditing).map(g => <label key={g.id} className="check"><input type="checkbox" checked={grammarForm.related.includes(g.id)} onChange={e => setGrammarForm({ ...grammarForm, related: e.target.checked ? [...grammarForm.related, g.id] : grammarForm.related.filter(x => x !== g.id) })} />{g.title}</label>)}</div><p className="form-note left">관련 문법은 공식 확정된 항목만 공개 화면에 연결됩니다.</p></>}
        <div className="editor-actions"><button className="submit-button" disabled={busy} type="submit">{grammarEditing ? "초안 저장" : "초안 등록"} <span>→</span></button>{grammarEditing && <button className="cancel-button" type="button" onClick={() => { setGrammarEditing(null); setGrammarForm(emptyGrammar); }}>취소</button>}</div>
      </form>}
      <div className="history"><h3>문법 항목 {data.grammar.length}</h3>{data.grammar.length ? data.grammar.map(g => <article className="published-news content-row" key={g.id}>
        <div><small>{GRAMMAR_CATEGORY[g.category]} · {shortDate(g.updatedAt)} {roleName(g.updatedBy)} 수정{g.researchId ? " · 연구 #" + g.researchId + " 연동" : ""}</small>
          <h4>{g.title} <span className={"status-tag " + (g.status === "official" ? "approved" : "draft")}>{g.status === "official" ? "공식 v" + g.officialVersion : g.officialVersion ? "공식 v" + g.officialVersion + " · 수정 초안" : "초안"}</span></h4>
          {g.summary && <p>{g.summary}</p>}
          {revisions?.id === g.id && <ul className="revision-list compact">{revisions.list.length ? revisions.list.map(r => <li key={r.version}><b>v{r.version}</b><span>{r.note || "개정"} · {roleName(r.confirmedBy)}</span><time>{dateTime(r.confirmedAt)}</time></li>) : <li><span>아직 공식 확정 이력이 없습니다.</span></li>}</ul>}
        </div>
        <div className="published-actions">
          {role === "chief" && g.status === "draft" && <button type="button" className="strong" disabled={busy} onClick={() => confirm(g)}>공식 확정</button>}
          {can("assistant_grammar") && <button type="button" onClick={() => { setGrammarEditing(g.id); setGrammarForm({ category: g.category, title: g.title, summary: g.summary, body: g.body, examples: g.examples, related: g.related }); top(); }}>수정</button>}
          <button type="button" disabled={busy} onClick={() => revisions?.id === g.id ? setRevisions(null) : showRevisions(g)}>이력</button>
          {can("assistant_grammar") && (role === "chief" || !g.officialVersion) && <button type="button" disabled={busy} onClick={() => remove(g)}>삭제</button>}
        </div>
      </article>) : <p className="muted">아직 등록된 문법이 없습니다.</p>}</div>
    </section>;
  }

  // ───── 연구소 ─────
  if (tab === "lab") {
    const save = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void run(() => request(researchEditing ? "/api/admin/research/" + researchEditing : "/api/admin/research", researchEditing ? "PATCH" : "POST", { ...researchForm, targetGrammarId: researchForm.targetGrammarId || null }), researchEditing ? "연구 과제를 수정했습니다." : "연구 과제를 등록했습니다. (제안 접수)")
        .then(ok => { if (ok) { setResearchForm(emptyResearch); setResearchEditing(null); } });
    };
    const move = (r: Research, status: string) => {
      const note = window.prompt(`"${r.title}"\n${RESEARCH_STATUS[r.status]} → ${RESEARCH_STATUS[status]}\n변경 사유나 메모를 입력하세요. (선택, 공개 진행 기록에 표시)`, "");
      if (note === null) return;
      void run(() => request("/api/admin/research/" + r.id + "/status", "POST", { status, note }), "진행 상태를 " + RESEARCH_STATUS[status] + "(으)로 바꿨습니다.");
    };
    const toGrammar = (r: Research) => {
      if (!window.confirm(`"${r.proposalTitle}" 개정안으로 문법서 초안을 만듭니다.\n바로 공개되지 않으며, 공식 문법서 탭에서 내용을 확인한 뒤 '공식 확정'해야 반영됩니다.`)) return;
      void run(() => request("/api/admin/research/" + r.id + "/draft", "POST"), "문법서 초안을 만들었습니다. 공식 문법서 탭에서 확인 후 공식 확정해 주세요.");
    };
    const remove = (r: Research) => { if (window.confirm(`"${r.title}" 연구 과제를 삭제할까요? (최고 관리자 화면에서 복구 가능)`)) void run(() => request("/api/admin/research/" + r.id, "DELETE"), "삭제했습니다."); };
    const f = researchForm;
    return <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>윤건언어 연구소</h2><p>제안 접수 → 검토 중 → 의견 수렴 → 승인 또는 반려 → 공식 반영. 승인·반려·반영은 최고 관리자만 할 수 있습니다.</p></div><a className="ghost-button" href="/lab" target="_blank" rel="noopener noreferrer">연구소 보기 ↗</a></div>
      {messages}{locked("assistant_lab")}
      {can("assistant_lab") && <form className="news-editor content-editor" onSubmit={save}>
        <div className="editor-grid">
          <div><label htmlFor="r-kind">연구 종류</label><select id="r-kind" value={f.kind} onChange={e => setResearchForm({ ...f, kind: e.target.value })}><option value="grammar">문법 연구</option><option value="expression">표현 연구</option></select></div>
          <div><label htmlFor="r-title">연구 제목</label><input id="r-title" value={f.title} maxLength={120} required onChange={e => setResearchForm({ ...f, title: e.target.value })} /></div>
        </div>
        <label htmlFor="r-sum">요약 <span>(선택)</span></label><input id="r-sum" value={f.summary} maxLength={300} onChange={e => setResearchForm({ ...f, summary: e.target.value })} />
        <label htmlFor="r-body">상세 설명</label><textarea id="r-body" value={f.body} maxLength={8000} rows={6} required onChange={e => setResearchForm({ ...f, body: e.target.value })} />
        <label className="check inline"><input type="checkbox" checked={f.isPublic} onChange={e => setResearchForm({ ...f, isPublic: e.target.checked })} />연구소 페이지에 공개</label>
        <fieldset className="proposal-fieldset"><legend>개정안 <span>(공개됨 · 문법 연구는 승인 후 문법서 초안으로 보낼 수 있음)</span></legend>
          <div className="editor-grid">
            <div><label htmlFor="r-pcat">문법 카테고리</label><select id="r-pcat" value={f.proposalCategory} onChange={e => setResearchForm({ ...f, proposalCategory: e.target.value })}><option value="">선택 안 함</option>{GRAMMAR_ORDER.map(k => <option key={k} value={k}>{GRAMMAR_CATEGORY[k]}</option>)}</select></div>
            <div><label htmlFor="r-target">개정 대상 문법 <span>(없으면 새 항목)</span></label><select id="r-target" value={f.targetGrammarId} onChange={e => setResearchForm({ ...f, targetGrammarId: Number(e.target.value) })}><option value={0}>새 문법 항목</option>{data.grammar.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          </div>
          <label htmlFor="r-ptitle">개정안 제목</label><input id="r-ptitle" value={f.proposalTitle} maxLength={100} onChange={e => setResearchForm({ ...f, proposalTitle: e.target.value })} />
          <label htmlFor="r-psum">개정안 요약</label><input id="r-psum" value={f.proposalSummary} maxLength={300} onChange={e => setResearchForm({ ...f, proposalSummary: e.target.value })} />
          <label htmlFor="r-pbody">개정안 본문</label><textarea id="r-pbody" value={f.proposalBody} maxLength={8000} rows={5} onChange={e => setResearchForm({ ...f, proposalBody: e.target.value })} />
          <label>개정안 예문</label><ExamplesEditor value={f.proposalExamples} onChange={proposalExamples => setResearchForm({ ...f, proposalExamples })} />
        </fieldset>
        <label htmlFor="r-result">연구 결과 발표 <span>(선택 · 공개됨)</span></label><textarea id="r-result" value={f.result} maxLength={8000} rows={4} onChange={e => setResearchForm({ ...f, result: e.target.value })} />
        <div className="editor-actions"><button className="submit-button" disabled={busy} type="submit">{researchEditing ? "수정 내용 저장" : "연구 과제 등록"} <span>→</span></button>{researchEditing && <button className="cancel-button" type="button" onClick={() => { setResearchEditing(null); setResearchForm(emptyResearch); }}>취소</button>}</div>
      </form>}
      <div className="history"><h3>연구 과제 {data.research.length}</h3>{data.research.length ? data.research.map(r => <article className="published-news content-row" key={r.id}>
        <div><small>#{r.id} · {RESEARCH_KIND[r.kind]} · {shortDate(r.updatedAt)}{r.isPublic ? "" : " · 비공개"}{r.appliedGrammarId ? " · 문법 #" + r.appliedGrammarId + " 연동" : ""}</small>
          <h4>{r.title} <span className={"status-pill " + r.status}>{RESEARCH_STATUS[r.status]}</span></h4>{r.summary && <p>{r.summary}</p>}
          {can("assistant_lab") && <div className="transition-row">{TRANSITIONS[r.status].filter(s => !(s === "applied" && r.kind === "grammar")).filter(s => role === "chief" || (!CHIEF_ONLY.includes(s) && !CHIEF_ONLY.includes(r.status))).map(s => <button key={s} type="button" disabled={busy} onClick={() => move(r, s)}>→ {RESEARCH_STATUS[s]}</button>)}
            {role === "chief" && r.status === "approved" && r.kind === "grammar" && <button type="button" className="strong" disabled={busy} onClick={() => toGrammar(r)}>{r.appliedGrammarId ? "문법서 초안 다시 보내기" : "문법서 초안 만들기"}</button>}</div>}
        </div>
        <div className="published-actions">
          {can("assistant_lab") && (r.status !== "applied" || role === "chief") && <button type="button" onClick={() => { setResearchEditing(r.id); setResearchForm({ kind: r.kind, title: r.title, summary: r.summary, body: r.body, isPublic: !!r.isPublic, proposalCategory: r.proposalCategory, proposalTitle: r.proposalTitle, proposalSummary: r.proposalSummary, proposalBody: r.proposalBody, proposalExamples: r.proposalExamples, targetGrammarId: r.targetGrammarId || 0, result: r.result }); top(); }}>수정</button>}
          {can("assistant_lab") && (role === "chief" || !["approved", "rejected", "applied"].includes(r.status)) && <button type="button" disabled={busy} onClick={() => remove(r)}>삭제</button>}
        </div>
      </article>) : <p className="muted">아직 등록된 연구 과제가 없습니다.</p>}</div>
      <div className="history"><h3>회원 의견 {data.opinions.length}</h3>{data.opinions.length ? data.opinions.map(o => <div className="history-row" key={o.id}>
        <span>{o.authorName} <small>#{o.projectId} {o.projectTitle} · {dateTime(o.createdAt)}</small><small className="opinion-text">{o.body}</small></span>
        <span className={"status-tag " + (o.status === "hidden" ? "removed" : "approved")}>{o.status === "hidden" ? "숨김" : "공개"}</span>
        {can("assistant_lab") && <button type="button" disabled={busy} onClick={() => void run(() => request("/api/admin/opinions/" + o.id, "PATCH", { status: o.status === "hidden" ? "visible" : "hidden" }))}>{o.status === "hidden" ? "다시 공개" : "숨기기"}</button>}
      </div>) : <p className="muted">아직 제출된 의견이 없습니다.</p>}</div>
    </section>;
  }

  // ───── 공지센터 ─────
  if (tab === "notices") {
    const save = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void run(() => request(noticeEditing ? "/api/admin/notices/" + noticeEditing : "/api/admin/notices", noticeEditing ? "PATCH" : "POST", noticeForm), noticeEditing ? "공지를 수정했습니다." : "공지를 게시했습니다.")
        .then(ok => { if (ok) { setNoticeForm(emptyNotice); setNoticeEditing(null); } });
    };
    const remove = (n: Notice) => { if (window.confirm(`"${n.title}" 공지를 삭제할까요? (최고 관리자 화면에서 복구 가능)`)) void run(() => request("/api/admin/notices/" + n.id, "DELETE"), "삭제했습니다."); };
    return <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>공식 공지센터</h2><p>게시 즉시 공지센터와 메인 홈페이지에 표시됩니다.</p></div><a className="ghost-button" href="/notices" target="_blank" rel="noopener noreferrer">공지센터 보기 ↗</a></div>
      {messages}{locked("assistant_notice")}
      {can("assistant_notice") && <form className="news-editor content-editor" onSubmit={save}>
        <div className="editor-grid">
          <div><label htmlFor="n-cat">카테고리</label><select id="n-cat" value={noticeForm.category} onChange={e => setNoticeForm({ ...noticeForm, category: e.target.value, pinned: e.target.value === "important" ? true : noticeForm.pinned })}>{NOTICE_ORDER.map(k => <option key={k} value={k}>{NOTICE_CATEGORY[k]}</option>)}</select></div>
          <div><label htmlFor="n-title">공지 제목</label><input id="n-title" value={noticeForm.title} maxLength={120} required onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} /></div>
        </div>
        <label htmlFor="n-body">내용</label><textarea id="n-body" value={noticeForm.body} maxLength={8000} rows={7} required onChange={e => setNoticeForm({ ...noticeForm, body: e.target.value })} />
        <label className="check inline"><input type="checkbox" checked={noticeForm.pinned} onChange={e => setNoticeForm({ ...noticeForm, pinned: e.target.checked })} />목록 상단에 고정</label>
        <div className="editor-actions"><button className="submit-button" disabled={busy} type="submit">{noticeEditing ? "수정 내용 저장" : "공지 게시하기"} <span>→</span></button>{noticeEditing && <button className="cancel-button" type="button" onClick={() => { setNoticeEditing(null); setNoticeForm(emptyNotice); }}>취소</button>}</div>
      </form>}
      <div className="history"><h3>게시된 공지 {data.notices.length}</h3>{data.notices.length ? data.notices.map(n => <article className="published-news" key={n.id}>
        <div><small>{NOTICE_CATEGORY[n.category]}{n.pinned ? " · 상단 고정" : ""} · 작성 {dateTime(n.createdAt)}{n.updatedAt - n.createdAt > 60000 ? " · 수정 " + dateTime(n.updatedAt) : ""} · {roleName(n.authorRole)}</small><h4>{n.title}</h4><p>{n.body}</p></div>
        {can("assistant_notice") && <div className="published-actions"><button type="button" onClick={() => { setNoticeEditing(n.id); setNoticeForm({ category: n.category, title: n.title, body: n.body, pinned: !!n.pinned }); top(); }}>수정</button><button type="button" disabled={busy} onClick={() => remove(n)}>삭제</button></div>}
      </article>) : <p className="muted">아직 게시된 공지가 없습니다.</p>}</div>
    </section>;
  }

  // ───── 권한·복구 (최고 관리자) ─────
  if (role !== "chief") return <section className="admin-panel"><p className="muted">최고 관리자 전용 메뉴입니다.</p></section>;
  const toggles: [string, string, string][] = [
    ["assistant_grammar", "공식 문법서 초안 작성·수정", "공식 확정과 공식 문법 삭제는 항상 최고 관리자만 가능"],
    ["assistant_lab", "연구 과제 등록·수정, 검토 중·의견 수렴 전환, 의견 관리", "승인·반려·문법서 반영은 항상 최고 관리자만 가능"],
    ["assistant_notice", "공지 작성·수정·삭제", ""],
  ];
  return <section className="admin-panel">
    <div className="admin-panel-heading"><div><h2>권한 · 복구</h2><p>보조 관리자에게 허용할 범위를 정하고, 삭제된 항목을 복구합니다.</p></div></div>
    {messages}
    <div className="permission-list">{toggles.map(([key, label, hint]) => <label key={key} className="permission-row"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={!!data.permissions[key]} disabled={busy} onChange={e => void run(() => request("/api/admin/permissions", "PATCH", { [key]: e.target.checked }), "보조 관리자 권한을 변경했습니다.")} /></label>)}</div>
    <div className="history"><h3>삭제된 항목</h3>{data.trash.length ? data.trash.map(t => <div className="history-row" key={t.type + t.id}>
      <span>{t.title}<small>{t.type === "grammar" ? "문법" : t.type === "research" ? "연구 과제" : "공지"} #{t.id} · {dateTime(t.deletedAt)} 삭제</small></span>
      <button type="button" disabled={busy} onClick={() => void run(() => request("/api/admin/restore", "POST", { type: t.type, id: t.id }), "복구했습니다.")}>복구</button>
    </div>) : <p className="muted">삭제된 항목이 없습니다.</p>}</div>
    <p className="admin-rights">모든 수정·삭제·확정 작업은 변경 직전 내용이 서버 감사 기록(admin_audit)에 함께 저장됩니다.</p>
  </section>;
}
