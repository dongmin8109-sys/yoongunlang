const MENU = [
  { href: "/#make", label: "단어 건의" },
  { href: "/dictionary.html", label: "공식 사전" },
  { href: "/grammar", label: "공식 문법서" },
  { href: "/lab", label: "윤건언어 연구소" },
  { href: "/notices", label: "공식 공지센터" },
  { href: "/kidszone.html", label: "키즈존" },
  { href: "/#news", label: "윤건언어 뉴스" },
  { href: "/portal.html", label: "포털" },
];

export function SiteHeader({ current, home = false }: { current?: string; home?: boolean }) {
  // 홈 화면에서는 같은 페이지 안의 앵커로 이동한다.
  const items = MENU.map(item => ({ ...item, href: home && item.href.startsWith("/#") ? item.href.slice(1) : item.href }));
  const links = items.map(item => <a key={item.href} href={item.href} aria-current={current === item.href ? "page" : undefined}>{item.label}</a>);
  return <>
    <div className="top-ribbon"><span className="ribbon-dot" /> 누구나 만들고, 함께 완성하는 윤건언어</div>
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="/" aria-label="윤건언어 홈"><span className="brand-mark">윤</span><span className="brand-text">윤건언어<small>YOONGUN LANGUAGE</small></span></a>
        <nav className="header-nav" aria-label="주요 메뉴">{links}</nav>
        <a className="admin-link" href="/admin">admin 관리자 <span aria-hidden="true">↗</span></a>
      </div>
    </header>
    <nav className="mobile-nav" aria-label="주요 메뉴 (모바일)"><div className="shell mobile-nav-inner">{links}</div></nav>
  </>;
}

export function SiteFooter() {
  return <footer className="footer"><div className="shell footer-inner"><div><strong>윤건언어</strong><span>함께 만들어가는 새로운 언어</span></div><div><a href="/dictionary.html">온라인 사전</a><a href="/grammar">공식 문법서</a><a href="/lab">연구소</a><a href="/notices">공지센터</a><a href="/portal.html">윤건언어 포털</a><a href="mailto:yungunlang@naver.com">문의</a></div><small>© YOONGUN LANGUAGE</small></div></footer>;
}
