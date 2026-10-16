"use client";

import { useEffect, useState } from "react";
import { NOTICE_CATEGORY, shortDate } from "./labels";
import { SiteFooter, SiteHeader } from "./site-header";

type News = { id: number; title: string; body: string; createdAt: number };
type Notice = { id: number; category: string; title: string; pinned: number; createdAt: number };
type Receipt = { id: number; spelling: string };
const date = (stamp: number) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(stamp);

export default function Home() {
  const [spelling, setSpelling] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [stage, setStage] = useState<"idle" | "checking" | "pending">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [words, setWords] = useState<string[][]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [newsResponse, wordsResponse] = await Promise.all([
          fetch("/api/news", { cache: "no-store" }),
          fetch("/api/words", { cache: "no-store" }),
        ]);
        if (newsResponse.ok) setNews(((await newsResponse.json()) as { news: News[] }).news || []);
        if (wordsResponse.ok) setWords((await wordsResponse.json()) as string[][]);
      } catch { /* keep current content until the next refresh */ }
      // 공지는 별도로 불러와 실패해도 뉴스·사전 표시에 영향이 없게 한다.
      try {
        const noticeResponse = await fetch("/api/notices?limit=3", { cache: "no-store" });
        if (noticeResponse.ok) setNotices(((await noticeResponse.json()) as { notices: Notice[] }).notices || []);
      } catch { /* keep current notices */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setStage("checking");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spelling, meaning, pronunciation }),
      });
      const result = (await response.json()) as { error?: string; id: number; spelling: string };
      if (!response.ok) throw new Error(result.error || "접수하지 못했습니다.");
      setReceipt({ id: result.id, spelling: result.spelling });
      setStage("pending");
    } catch (e) {
      setStage("idle");
      setMessage(e instanceof Error ? e.message : "접수하지 못했습니다.");
    }
  }

  return <div className="site">
    <SiteHeader home />

    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="pill"><span className="pulse-dot" /> OPEN LANGUAGE PROJECT</p>
            <h1>함께 만들어가는<br /><em>새로운 언어.</em></h1>
            <p className="hero-sub">당신이 떠올린 한 단어가 윤건언어의 내일이 됩니다.<br className="desktop-break" /> 철자와 뜻, 발음을 적어 새로운 표현을 제안해 주세요.</p>
            <div className="hero-actions"><a className="primary-button" href="#make">새 단어 만들기 <span aria-hidden="true">↗</span></a><a className="ghost-button" href="/dictionary.html">사전 둘러보기 <span aria-hidden="true">→</span></a><a className="ghost-button" href="/kidszone.html">윤봇 키즈존 <span aria-hidden="true">★</span></a></div>
            <div className="hero-facts"><span><strong>{words.length || "—"}</strong>개의 공식 단어</span><i /><span>누구나 참여할 수 있어요</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-card card-one"><span>✳</span><strong>새로운 생각</strong><small>아이디어를 적고</small></div>
            <div className="art-card card-two"><span>가</span><strong>새로운 단어</strong><small>함께 다듬어요</small></div>
            <div className="art-center"><span>윤</span><small>WORDS BECOME<br />A LANGUAGE</small></div>
            <div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✦</div>
          </div>
        </div>
      </section>

      <section className="process-bar"><div className="shell process-inner"><span><b>01</b> 단어 제안</span><span className="process-line" /><span><b>02</b> 관리자 검토</span><span className="process-line" /><span><b>03</b> 공식 사전 등록</span></div></section>

      <section className="home-notices" aria-labelledby="home-notices-title"><div className="shell home-notices-inner">
        <div className="home-notices-head"><p className="section-label">OFFICIAL NOTICE</p><h2 id="home-notices-title">공식 공지</h2><a href="/notices">전체 보기 →</a></div>
        <div className="home-notices-list">{notices.length ? notices.slice(0, 3).map(item => <a key={item.id} href={"/notices?id=" + item.id} className={"home-notice" + (item.pinned ? " pinned" : "")}>
          <span className={"notice-badge " + item.category}>{item.pinned ? "고정 · " : ""}{NOTICE_CATEGORY[item.category] || "공지"}</span><strong>{item.title}</strong><time dateTime={new Date(item.createdAt).toISOString()}>{shortDate(item.createdAt)}</time>
        </a>) : <p className="home-notice-empty">등록된 공지가 없습니다.</p>}</div>
      </div></section>

      <div className="shell content-grid">
        <section className="make-section" id="make" aria-labelledby="make-title">
          <div className="section-heading"><p className="section-label">MAKE A NEW WORD</p><h2 id="make-title">새로운 단어를 만들어 봐!</h2><p>여러분의 아이디어가 윤건언어의 새로운 단어가 됩니다.</p></div>
          {stage === "pending" && receipt ? <div className="receipt-card" role="status">
            <div className="success-symbol">✓</div><p className="section-label">SUGGESTION RECEIVED</p><h3>승인 대기중</h3>
            <p><strong>{receipt.spelling}</strong> 건의가 접수되었습니다.<br />관리자가 확인한 뒤 공식 사전에 등록됩니다.</p>
            <span className="receipt-number">건의 번호 #{receipt.id}</span>
            <button className="secondary-button" type="button" onClick={() => { setStage("idle"); setSpelling(""); setMeaning(""); setPronunciation(""); setReceipt(null); }}>다른 단어 건의하기</button>
          </div> : <form className="word-form" onSubmit={submit}>
            <div className="form-top"><span className="form-icon">✦</span><div><strong>나만의 단어 건의하기</strong><small>세 가지를 채우면 접수할 수 있어요</small></div><span className="form-counter">01 / 03</span></div>
            <label htmlFor="spelling">철자 <span>어떻게 쓰나요?</span></label>
            <input id="spelling" name="spelling" type="text" maxLength={80} placeholder="예: marino" value={spelling} onChange={e => setSpelling(e.target.value)} required disabled={stage === "checking"} />
            <label htmlFor="meaning">뜻 <span>무슨 의미인가요?</span></label>
            <textarea id="meaning" name="meaning" maxLength={300} rows={3} placeholder="예: 함께 걸어가는 마음" value={meaning} onChange={e => setMeaning(e.target.value)} required disabled={stage === "checking"} />
            <label htmlFor="pronunciation">발음 <span>어떻게 읽나요?</span></label>
            <input id="pronunciation" name="pronunciation" type="text" maxLength={120} placeholder="예: 마리노" value={pronunciation} onChange={e => setPronunciation(e.target.value)} required disabled={stage === "checking"} />
            {message && <p className="form-error" role="alert">{message}</p>}
            <button className="submit-button" type="submit" disabled={stage === "checking"}>{stage === "checking" ? "중복 확인중입니다…" : "완료 · 단어 건의하기"} <span aria-hidden="true">→</span></button>
            <p className="form-note">같은 철자의 공식 단어 또는 기존 건의가 있으면 접수되지 않습니다.</p>
          </form>}
        </section>

        <aside className="news-section" id="news" aria-labelledby="news-title">
          <div className="section-heading news-heading"><p className="section-label">YOONGUN NEWS</p><div><h2 id="news-title">윤건언어 뉴스</h2><span className="live-label"><span /> LIVE</span></div><p>윤건언어의 새로운 소식을 만나보세요.</p></div>
          <div className="news-list">{news.length ? news.slice(0, 5).map(item => <article className="news-card" key={item.id}><div className="news-meta"><span>새 소식</span><time dateTime={new Date(item.createdAt).toISOString()}>{date(item.createdAt)}</time></div><h3>{item.title}</h3><p>{item.body}</p></article>) : <div className="news-empty"><span>✉</span><strong>첫 소식을 기다리고 있어요</strong><p>새로운 단어와 프로젝트 소식이 이곳에 올라옵니다.</p></div>}</div>
          <div className="side-note"><span>✦</span><p>오늘의 아이디어가<br /><strong>내일의 언어가 됩니다.</strong></p></div>
        </aside>
      </div>
    </main>
    <SiteFooter />
  </div>;
}

