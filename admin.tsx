"use client";

import { useCallback, useEffect, useState } from "react";
import ContentAdmin, { type ContentTab } from "./content-admin";

type Role = "chief" | "assistant";
type Suggestion = { id: number; spelling: string; meaning: string; pronunciation: string; status: string; submittedAt: number; rejectionReason?: string };
type News = { id: number; title: string; body: string; createdAt: number; updatedAt: number; authorRole: Role };
const date = (stamp: number) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(stamp);

export default function Admin() {
  const [role, setRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("chief");
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"queue" | "news" | ContentTab>("queue");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [title, setTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [queueResponse, newsResponse] = await Promise.all([
        fetch("/api/admin/queue", { cache: "no-store" }),
        fetch("/api/news", { cache: "no-store" }),
      ]);
      if (queueResponse.status === 403) { setRole(null); return; }
      if (queueResponse.ok) setSuggestions(((await queueResponse.json()) as { suggestions: Suggestion[] }).suggestions || []);
      if (newsResponse.ok) setNews(((await newsResponse.json()) as { news: News[] }).news || []);
    } catch { /* keep current content */ }
  }, []);

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" }).then(async response => {
      if (response.ok) setRole(((await response.json()) as { role: Role }).role);
    }).finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (!role) return;
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [role, refresh]);

  async function request(path: string, method: string, payload?: object): Promise<any> {
    const response = await fetch(path, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = (await response.json()) as { error?: string; role?: Role };
    if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
    return result;
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await request("/api/admin/login", "POST", { role: selectedRole, pin });
      setRole(result.role || null); setPin("");
    } catch (e) { setError(e instanceof Error ? e.message : "로그인하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await request("/api/admin/logout", "POST"); } finally { setRole(null); setSuggestions([]); setError(""); }
  }
  async function decide(item: Suggestion, decision: "approve" | "reject") {
    const reason = decision === "reject" ? window.prompt("거절 사유를 입력해 주세요. (선택)") : "";
    if (decision === "reject" && reason === null) return;
    setBusy(true); setError("");
    try { await request("/api/admin/suggestions/" + item.id, "PATCH", { decision, reason }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function removeWord(item: Suggestion) {
    if (!window.confirm(item.spelling + " 단어를 공식 사전에서 제외할까요?")) return;
    setBusy(true); setError("");
    try { await request("/api/admin/suggestions/" + item.id, "DELETE"); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function saveNews(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await request(editingId ? "/api/admin/news/" + editingId : "/api/admin/news", editingId ? "PATCH" : "POST", { title, body: newsBody });
      setTitle(""); setNewsBody(""); setEditingId(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "게시하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function deleteNews(item: News) {
    if (!window.confirm("이 소식을 삭제할까요?")) return;
    setBusy(true); setError("");
    try { await request("/api/admin/news/" + item.id, "DELETE"); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
    finally { setBusy(false); }
  }
  const pending = suggestions.filter(item => item.status === "pending");
  const recent = suggestions.filter(item => item.status !== "pending");

  if (checking) return <main className="admin-page admin-loading"><p>관리자 화면을 불러오는 중입니다…</p></main>;
  if (!role) return <main className="admin-page login-page">
    <div className="login-shell">
      <a className="back-link" href="/">← 윤건언어로 돌아가기</a>
      <div className="login-card"><div className="login-mark">윤</div><p className="section-label">YOONGUN ADMIN</p><h1>관리자 로그인</h1><p className="login-intro">윤건언어의 새로운 단어와 소식을 관리합니다.</p>
        <form onSubmit={login}>
          <label htmlFor="role">직책을 선택하세요</label>
          <select id="role" value={selectedRole} onChange={e => setSelectedRole(e.target.value as Role)}><option value="chief">최고 관리자</option><option value="assistant">보조 관리자</option></select>
          <label htmlFor="pin">비밀번호를 입력하세요 <span>6자리</span></label>
          <input id="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="submit-button" disabled={busy} type="submit">{busy ? "확인 중…" : "관리자 화면으로 이동"} <span>→</span></button>
        </form>
      </div>
      <p className="login-foot">관리자 전용 · 모든 변경 사항은 사이트에 바로 반영됩니다.</p>
    </div>
  </main>;

  return <div className="admin-page dashboard">
    <header className="admin-header"><div className="shell admin-header-inner"><a className="brand" href="/"><span className="brand-mark">윤</span><span className="brand-text">윤건언어<small>ADMIN CONSOLE</small></span></a><div className="admin-user"><span className="role-badge">{role === "chief" ? "최고 관리자" : "보조 관리자"}</span><button type="button" onClick={logout}>로그아웃</button></div></div></header>
    <main className="shell admin-main"><div className="admin-welcome"><div><p className="section-label">DASHBOARD</p><h1>윤건언어 관리자</h1><p>새로운 단어를 검토하고 윤건언어 뉴스를 게시해 주세요.</p></div><a className="ghost-button" href="/" target="_blank" rel="noopener noreferrer">사이트 보기 ↗</a></div>
      <div className="admin-stats"><div><span>승인 대기</span><strong>{pending.length}</strong><small>검토가 필요한 단어</small></div><div><span>승인된 건의</span><strong>{suggestions.filter(x => x.status === "approved").length}</strong><small>공식 사전에 반영됨</small></div><div><span>게시된 뉴스</span><strong>{news.length}</strong><small>방문자에게 공개 중</small></div></div>
      <div className="admin-tabs" role="tablist"><button className={tab === "queue" ? "active" : ""} type="button" onClick={() => setTab("queue")}>단어 건의 <b>{pending.length}</b></button><button className={tab === "news" ? "active" : ""} type="button" onClick={() => setTab("news")}>윤건언어 뉴스</button><button className={tab === "grammar" ? "active" : ""} type="button" onClick={() => setTab("grammar")}>공식 문법서</button><button className={tab === "lab" ? "active" : ""} type="button" onClick={() => setTab("lab")}>연구소</button><button className={tab === "notices" ? "active" : ""} type="button" onClick={() => setTab("notices")}>공지센터</button>{role === "chief" && <button className={tab === "settings" ? "active" : ""} type="button" onClick={() => setTab("settings")}>권한·복구</button>}</div>
      {error && <p className="form-error admin-error" role="alert">{error}</p>}
      {tab === "grammar" || tab === "lab" || tab === "notices" || tab === "settings" ? <ContentAdmin key={tab} tab={tab} role={role} /> : tab === "queue" ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>승인 대기중</h2><p>철자·뜻·발음을 확인하고 결정하세요.</p></div><span className="live-label"><span /> 자동 갱신</span></div>
        {pending.length ? <div className="queue-list">{pending.map(item => <article className="queue-item" key={item.id}><div className="queue-meta"><span>#{item.id} · {date(item.submittedAt)}</span><span className="pending-badge">검토 대기</span></div><h3>{item.spelling}</h3><dl><div><dt>뜻</dt><dd>{item.meaning}</dd></div><div><dt>발음</dt><dd>{item.pronunciation}</dd></div></dl><div className="queue-actions"><button type="button" disabled={busy} onClick={() => decide(item, "approve")}>✓ 승인</button><button type="button" disabled={busy} onClick={() => decide(item, "reject")}>거절</button></div></article>)}</div> : <div className="admin-empty"><span>✓</span><strong>검토할 건의가 없습니다.</strong><p>새 단어가 접수되면 이곳에 바로 표시됩니다.</p></div>}
        <div className="history"><h3>최근 처리 기록</h3>{recent.length ? recent.slice(0, 20).map(item => <div className="history-row" key={item.id}><span>{item.spelling}<small>{item.pronunciation} · {item.meaning}</small></span><span className={"status-tag " + item.status}>{item.status === "approved" ? "승인" : item.status === "rejected" ? "거절" : "사전 제외"}</span>{role === "chief" && item.status === "approved" && <button type="button" disabled={busy} onClick={() => removeWord(item)}>사전에서 제외</button>}</div>) : <p className="muted">아직 처리 기록이 없습니다.</p>}</div>
      </section> : <section className="admin-panel"><div className="admin-panel-heading"><div><h2>윤건언어 뉴스</h2><p>게시 즉시 방문자 화면에 반영됩니다.</p></div></div>
        <form className="news-editor" onSubmit={saveNews}><label htmlFor="news-title">뉴스 제목</label><input id="news-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="새로운 소식의 제목" required /><label htmlFor="news-body">내용</label><textarea id="news-body" value={newsBody} onChange={e => setNewsBody(e.target.value)} maxLength={3000} rows={7} placeholder="윤건언어 소식을 적어 주세요." required /><div className="editor-actions"><button className="submit-button" disabled={busy} type="submit">{editingId ? "수정 내용 저장" : "뉴스 게시하기"} <span>→</span></button>{editingId && <button className="cancel-button" type="button" onClick={() => { setEditingId(null); setTitle(""); setNewsBody(""); }}>취소</button>}</div></form>
        <div className="history"><h3>게시된 뉴스</h3>{news.length ? news.map(item => <article className="published-news" key={item.id}><div><small>{date(item.createdAt)}</small><h4>{item.title}</h4><p>{item.body}</p></div><div className="published-actions"><button type="button" onClick={() => { setEditingId(item.id); setTitle(item.title); setNewsBody(item.body); window.scrollTo({ top: 240, behavior: "smooth" }); }}>수정</button><button type="button" disabled={busy} onClick={() => deleteNews(item)}>삭제</button></div></article>) : <p className="muted">아직 게시된 뉴스가 없습니다.</p>}</div>
      </section>}
      <p className="admin-rights">보조 관리자는 단어 승인·거절과 뉴스 게시·수정·삭제가 가능합니다. 승인된 단어를 공식 사전에서 제외하는 작업은 최고 관리자만 할 수 있습니다. 문법서·연구소·공지센터는 최고 관리자가 허용한 범위에서 보조 관리자가 작성·관리하며, 문법 공식 확정과 연구 승인·반려·반영은 최고 관리자만 할 수 있습니다.</p>
    </main>
  </div>;
}


