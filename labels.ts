export const GRAMMAR_CATEGORY: Record<string, string> = {
  pos: "품사", order: "어순", tense: "시제", structure: "문장 구조", notation: "표기법", etc: "기타",
};
export const GRAMMAR_ORDER = ["pos", "order", "tense", "structure", "notation", "etc"];

export const RESEARCH_KIND: Record<string, string> = { grammar: "문법 연구", expression: "표현 연구" };
export const RESEARCH_STATUS: Record<string, string> = {
  proposed: "제안 접수", reviewing: "검토 중", feedback: "의견 수렴", approved: "승인", rejected: "반려", applied: "공식 반영",
};
// 진행 단계 표시용 (승인/반려는 같은 단계)
export const RESEARCH_STEPS = [
  { key: ["proposed"], label: "제안 접수" },
  { key: ["reviewing"], label: "검토 중" },
  { key: ["feedback"], label: "의견 수렴" },
  { key: ["approved", "rejected"], label: "승인 또는 반려" },
  { key: ["applied"], label: "공식 반영" },
];
export const stepIndex = (status: string) => RESEARCH_STEPS.findIndex(step => step.key.includes(status));
export const RESEARCH_DONE = ["approved", "rejected", "applied"];

export const NOTICE_CATEGORY: Record<string, string> = {
  important: "중요 공지", general: "일반 공지", update: "업데이트 안내", maintenance: "서버 점검·장애", policy: "운영 정책",
};
export const NOTICE_ORDER = ["important", "general", "update", "maintenance", "policy"];

export type Example = { text: string; meaning: string; note: string };

export const fullDate = (stamp: number) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(stamp);
export const shortDate = (stamp: number) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(stamp);
export const dateTime = (stamp: number) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(stamp);

export const norm = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");

// ?id= 쿼리로 목록/상세를 전환한다.
export function readId() {
  if (typeof window === "undefined") return 0;
  const value = Number(new URLSearchParams(window.location.search).get("id"));
  return Number.isInteger(value) && value > 0 ? value : 0;
}
export function pushId(id: number) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", String(id)); else url.searchParams.delete("id");
  window.history.pushState({}, "", url);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
