import { body, db, error, getRole, json, type AdminRole } from "./yg";

// 공식 문법서 · 윤건언어 연구소 · 공식 공지센터 API.
// route.ts에서 가장 먼저 호출되며, 이 모듈이 다루지 않는 경로는 null을 돌려 기존 처리로 넘긴다.

export const GRAMMAR_CATEGORIES = ["pos", "order", "tense", "structure", "notation", "etc"] as const;
export const RESEARCH_KINDS = ["grammar", "expression"] as const;
export const RESEARCH_STATUSES = ["proposed", "reviewing", "feedback", "approved", "rejected", "applied"] as const;
export const NOTICE_CATEGORIES = ["important", "general", "update", "maintenance", "policy"] as const;
export const PERMISSION_KEYS = ["assistant_grammar", "assistant_lab", "assistant_notice"] as const;
type PermissionKey = typeof PERMISSION_KEYS[number];
type ResearchStatus = typeof RESEARCH_STATUSES[number];
type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Row = Record<string, unknown>;

const MAX_BODY = 60000;
const forbidden = () => error("이 작업을 할 권한이 없습니다.", 403);
const notFound = (what: string) => error(what + "을(를) 찾을 수 없습니다.", 404);
const id = (value: string | undefined) => /^\d{1,9}$/.test(value || "") ? Number(value) : 0;

// 줄바꿈과 탭을 제외한 제어문자를 제거하고 길이를 제한한다. 화면에서는 항상 텍스트로만 출력한다.
export function text(value: unknown, max: number, multiline = false) {
  if (typeof value !== "string") return "";
  let out = value.normalize("NFKC").replace(/\r\n?/g, "\n");
  out = multiline ? out.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "") : out.replace(/[\u0000-\u001F\u007F]/g, " ");
  return out.trim().slice(0, max);
}
const oneOf = <T extends readonly string[]>(list: T, value: unknown): T[number] | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? value as T[number] : null;

type Example = { text: string; meaning: string; note: string };
function examples(value: unknown): Example[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map(item => {
    const row = item && typeof item === "object" ? item as Row : {};
    return { text: text(row.text, 300), meaning: text(row.meaning, 300), note: text(row.note, 300) };
  }).filter(item => item.text);
}
function ids(value: unknown, self = 0): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0 && v !== self))].slice(0, 20);
}
const parse = <T>(raw: unknown, fallback: T): T => { try { return typeof raw === "string" ? JSON.parse(raw) as T : fallback; } catch { return fallback; } };

async function allowed(role: AdminRole, key: PermissionKey) {
  if (role === "chief") return true;
  const row = await db().prepare("SELECT allowed FROM admin_permissions WHERE key = ?").bind(key).first<{ allowed: number }>();
  return row ? row.allowed === 1 : true; // 기본값: 허용 (최고 관리자가 끌 수 있음)
}
async function permissions() {
  const rows = await db().prepare("SELECT key, allowed FROM admin_permissions").all<{ key: string; allowed: number }>();
  const map = Object.fromEntries((rows.results || []).map(r => [r.key, r.allowed === 1]));
  return Object.fromEntries(PERMISSION_KEYS.map(k => [k, map[k] ?? true])) as Record<PermissionKey, boolean>;
}
const auditStmt = (actor: AdminRole, action: string, type: string, targetId: number, before: unknown) =>
  db().prepare("INSERT INTO admin_audit (actor, action, target_type, target_id, before, at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(actor, action, type, targetId, before === undefined ? null : JSON.stringify(before), Date.now());

// ───────── 공개 조회 ─────────

const OFFICIAL_SQL = `SELECT e.id, r.category, r.title, r.summary, r.body, r.examples, r.related, r.version, r.confirmed_at AS updatedAt, e.created_at AS createdAt
  FROM grammar_entries e JOIN grammar_revisions r ON r.entry_id = e.id AND r.version = e.official_version
  WHERE e.deleted_at IS NULL AND e.official_version > 0`;

async function publicGrammar() {
  const rows = (await db().prepare(OFFICIAL_SQL + " ORDER BY r.category, r.title").all<Row>()).results || [];
  const titles = new Map(rows.map(r => [Number(r.id), String(r.title)]));
  return rows.map(r => ({
    ...r,
    examples: parse<Example[]>(r.examples, []),
    related: parse<number[]>(r.related, []).filter(x => titles.has(x)).map(x => ({ id: x, title: titles.get(x) })),
  }));
}

async function publicLab() {
  const rows = await db().prepare(`SELECT p.id, p.kind, p.title, p.summary, p.status, p.created_at AS createdAt, p.updated_at AS updatedAt,
      (SELECT COUNT(*) FROM research_opinions o WHERE o.project_id = p.id AND o.status = 'visible') AS opinionCount
    FROM research_projects p WHERE p.deleted_at IS NULL AND p.is_public = 1 ORDER BY p.updated_at DESC LIMIT 300`).all<Row>();
  return rows.results || [];
}

async function publicLabDetail(projectId: number) {
  const project = await db().prepare(`SELECT id, kind, title, summary, body, status, proposal_category AS proposalCategory, proposal_title AS proposalTitle,
      proposal_summary AS proposalSummary, proposal_body AS proposalBody, proposal_examples AS proposalExamples, result, applied_grammar_id AS appliedGrammarId,
      created_at AS createdAt, updated_at AS updatedAt FROM research_projects WHERE id = ? AND deleted_at IS NULL AND is_public = 1`).bind(projectId).first<Row>();
  if (!project) return null;
  const [log, opinions, grammar] = await Promise.all([
    db().prepare("SELECT from_status AS fromStatus, to_status AS toStatus, note, changed_at AS changedAt FROM research_status_log WHERE project_id = ? ORDER BY changed_at ASC, id ASC").bind(projectId).all(),
    db().prepare("SELECT id, author_name AS authorName, body, created_at AS createdAt FROM research_opinions WHERE project_id = ? AND status = 'visible' ORDER BY created_at DESC LIMIT 200").bind(projectId).all(),
    project.appliedGrammarId ? db().prepare("SELECT id FROM grammar_entries WHERE id = ? AND deleted_at IS NULL AND official_version > 0").bind(project.appliedGrammarId).first() : null,
  ]);
  return { ...project, proposalExamples: parse<Example[]>(project.proposalExamples, []), appliedGrammarId: grammar ? project.appliedGrammarId : null, log: log.results || [], opinions: opinions.results || [] };
}

const NOTICE_FIELDS = "id, category, title, body, pinned, created_at AS createdAt, updated_at AS updatedAt";

// ───────── 관리자 조회 ─────────

async function adminOverview(role: AdminRole) {
  const [grammar, research, notices, opinions, perms] = await Promise.all([
    db().prepare(`SELECT id, category, title, summary, body, examples, related, status, official_version AS officialVersion, research_id AS researchId,
        created_at AS createdAt, updated_at AS updatedAt, updated_by AS updatedBy FROM grammar_entries WHERE deleted_at IS NULL ORDER BY updated_at DESC`).all<Row>(),
    db().prepare(`SELECT id, kind, title, summary, body, status, is_public AS isPublic, proposal_category AS proposalCategory, proposal_title AS proposalTitle,
        proposal_summary AS proposalSummary, proposal_body AS proposalBody, proposal_examples AS proposalExamples, target_grammar_id AS targetGrammarId,
        result, applied_grammar_id AS appliedGrammarId, created_at AS createdAt, updated_at AS updatedAt FROM research_projects WHERE deleted_at IS NULL ORDER BY updated_at DESC`).all<Row>(),
    db().prepare("SELECT " + NOTICE_FIELDS + ", author_role AS authorRole FROM notices WHERE deleted_at IS NULL ORDER BY pinned DESC, created_at DESC").all<Row>(),
    db().prepare(`SELECT o.id, o.project_id AS projectId, p.title AS projectTitle, o.author_name AS authorName, o.body, o.status, o.created_at AS createdAt
        FROM research_opinions o JOIN research_projects p ON p.id = o.project_id ORDER BY o.created_at DESC LIMIT 200`).all<Row>(),
    permissions(),
  ]);
  let trash: Row[] = [];
  if (role === "chief") {
    const rows = await db().prepare(`SELECT 'grammar' AS type, id, title, deleted_at AS deletedAt FROM grammar_entries WHERE deleted_at IS NOT NULL
        UNION ALL SELECT 'research', id, title, deleted_at FROM research_projects WHERE deleted_at IS NOT NULL
        UNION ALL SELECT 'notice', id, title, deleted_at FROM notices WHERE deleted_at IS NOT NULL ORDER BY deletedAt DESC LIMIT 100`).all<Row>();
    trash = rows.results || [];
  }
  return {
    role, permissions: perms, trash,
    grammar: (grammar.results || []).map(r => ({ ...r, examples: parse(r.examples, []), related: parse(r.related, []) })),
    research: (research.results || []).map(r => ({ ...r, proposalExamples: parse(r.proposalExamples, []) })),
    notices: notices.results || [], opinions: opinions.results || [],
  };
}

// ───────── 문법 ─────────

function grammarInput(input: Row, self = 0) {
  const category = oneOf(GRAMMAR_CATEGORIES, input.category);
  const title = text(input.title, 100), summary = text(input.summary, 300), content = text(input.body, 8000, true);
  if (!category) return { message: "문법 카테고리를 선택해 주세요." } as const;
  if (!title || !content) return { message: "문법 제목과 설명을 입력해 주세요." } as const;
  return { category, title, summary, body: content, examples: JSON.stringify(examples(input.examples)), related: JSON.stringify(ids(input.related, self)) } as const;
}

async function confirmGrammar(role: AdminRole, entryId: number, note: string) {
  const entry = await db().prepare("SELECT * FROM grammar_entries WHERE id = ? AND deleted_at IS NULL").bind(entryId).first<Row>();
  if (!entry) return notFound("문법 항목");
  if (entry.status === "official") return error("이미 공식 확정된 최신 내용입니다.", 409);
  const version = Number(entry.official_version) + 1, now = Date.now();
  const researchId = entry.research_id ? Number(entry.research_id) : null;
  const statements = [
    auditStmt(role, "confirm", "grammar", entryId, entry),
    db().prepare(`INSERT INTO grammar_revisions (entry_id, version, category, title, summary, body, examples, related, note, research_id, confirmed_by, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(entryId, version, entry.category, entry.title, entry.summary, entry.body, entry.examples, entry.related, note, researchId, role, now),
    db().prepare("UPDATE grammar_entries SET status = 'official', official_version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND official_version = ?")
      .bind(version, now, role, entryId, version - 1),
  ];
  if (researchId) {
    const project = await db().prepare("SELECT status FROM research_projects WHERE id = ? AND deleted_at IS NULL").bind(researchId).first<{ status: string }>();
    if (project?.status === "approved") {
      statements.push(
        db().prepare("UPDATE research_projects SET status = 'applied', applied_grammar_id = ?, updated_at = ? WHERE id = ?").bind(entryId, now, researchId),
        db().prepare("INSERT INTO research_status_log (project_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, 'approved', 'applied', ?, ?, ?)")
          .bind(researchId, "공식 문법서 v" + version + " 반영", role, now),
      );
    }
  }
  await db().batch(statements);
  return json({ ok: true, version });
}

// ───────── 연구 ─────────

const TRANSITIONS: Record<ResearchStatus, ResearchStatus[]> = {
  proposed: ["reviewing", "rejected"],
  reviewing: ["feedback", "approved", "rejected", "proposed"],
  feedback: ["approved", "rejected", "reviewing"],
  approved: ["applied", "feedback"],
  rejected: ["reviewing"],
  applied: [],
};
const CHIEF_ONLY: ResearchStatus[] = ["approved", "rejected", "applied"];

function researchInput(input: Row) {
  const kind = oneOf(RESEARCH_KINDS, input.kind);
  const title = text(input.title, 120), summary = text(input.summary, 300), content = text(input.body, 8000, true);
  if (!kind) return { message: "연구 종류를 선택해 주세요." } as const;
  if (!title || !content) return { message: "연구 제목과 상세 설명을 입력해 주세요." } as const;
  const proposalCategory = input.proposalCategory ? oneOf(GRAMMAR_CATEGORIES, input.proposalCategory) : "";
  if (proposalCategory === null) return { message: "개정안 문법 카테고리를 확인해 주세요." } as const;
  const target = Number(input.targetGrammarId);
  return {
    kind, title, summary, body: content, isPublic: input.isPublic === false ? 0 : 1,
    proposalCategory, proposalTitle: text(input.proposalTitle, 100), proposalSummary: text(input.proposalSummary, 300),
    proposalBody: text(input.proposalBody, 8000, true), proposalExamples: JSON.stringify(examples(input.proposalExamples)),
    targetGrammarId: Number.isInteger(target) && target > 0 ? target : null, result: text(input.result, 8000, true),
  } as const;
}

async function sendToGrammar(role: AdminRole, projectId: number) {
  const project = await db().prepare("SELECT * FROM research_projects WHERE id = ? AND deleted_at IS NULL").bind(projectId).first<Row>();
  if (!project) return notFound("연구 과제");
  if (project.status !== "approved") return error("승인된 연구 과제만 문법서 초안으로 보낼 수 있습니다.", 409);
  if (project.kind !== "grammar") return error("문법 연구 과제만 문법서로 보낼 수 있습니다.", 409);
  const category = oneOf(GRAMMAR_CATEGORIES, project.proposal_category);
  if (!category || !project.proposal_title || !project.proposal_body) return error("개정안의 카테고리, 제목, 본문을 먼저 입력해 주세요.");
  const now = Date.now();
  const targetId = Number(project.target_grammar_id) || Number(project.applied_grammar_id) || 0;
  const target = targetId ? await db().prepare("SELECT * FROM grammar_entries WHERE id = ? AND deleted_at IS NULL").bind(targetId).first<Row>() : null;
  if (target) {
    await db().batch([
      auditStmt(role, "research-draft", "grammar", targetId, target),
      db().prepare("UPDATE grammar_entries SET category = ?, title = ?, summary = ?, body = ?, examples = ?, status = 'draft', research_id = ?, updated_at = ?, updated_by = ? WHERE id = ?")
        .bind(category, project.proposal_title, project.proposal_summary, project.proposal_body, project.proposal_examples, projectId, now, role, targetId),
      db().prepare("UPDATE research_projects SET applied_grammar_id = ?, updated_at = ? WHERE id = ?").bind(targetId, now, projectId),
    ]);
    return json({ grammarId: targetId });
  }
  const created = await db().prepare(`INSERT INTO grammar_entries (category, title, summary, body, examples, related, status, official_version, research_id, created_at, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, '[]', 'draft', 0, ?, ?, ?, ?)`).bind(category, project.proposal_title, project.proposal_summary, project.proposal_body, project.proposal_examples, projectId, now, now, role).run();
  const grammarId = Number(created.meta.last_row_id);
  await db().prepare("UPDATE research_projects SET applied_grammar_id = ?, updated_at = ? WHERE id = ?").bind(grammarId, now, projectId).run();
  return json({ grammarId }, 201);
}

// ───────── 라우터 ─────────

export async function contentRoutes(request: Request, method: Method, parts: string[]): Promise<Response | null> {
  const response = await routeContent(request, method, parts);
  // 권한 오류 등으로 본문을 읽지 않고 응답할 때도 요청 본문을 정리한다.
  if (response && method !== "GET" && request.body && !request.bodyUsed) await request.body.cancel().catch(() => undefined);
  return response;
}

async function routeContent(request: Request, method: Method, parts: string[]): Promise<Response | null> {
  const [head, a, b, c] = parts;

  // 공개 API
  if (head === "grammar" && method === "GET") {
    if (!a) return json({ categories: GRAMMAR_CATEGORIES, entries: await publicGrammar() });
    if (id(a) && b === "history" && !c) {
      const visible = await db().prepare("SELECT id FROM grammar_entries WHERE id = ? AND deleted_at IS NULL AND official_version > 0").bind(id(a)).first();
      if (!visible) return notFound("문법 항목");
      const rows = await db().prepare("SELECT version, title, note, research_id AS researchId, confirmed_at AS confirmedAt FROM grammar_revisions WHERE entry_id = ? ORDER BY version DESC").bind(id(a)).all();
      return json({ history: rows.results || [] });
    }
    return null;
  }
  if (head === "lab") {
    if (method === "GET" && !a) return json({ projects: await publicLab() });
    if (method === "GET" && id(a) && !b) {
      const detail = await publicLabDetail(id(a));
      return detail ? json({ project: detail }) : notFound("연구 과제");
    }
    if (method === "POST" && id(a) && b === "opinions" && !c) return submitOpinion(request, id(a));
    return null;
  }
  if (head === "notices" && method === "GET") {
    if (!a) {
      const limit = Math.min(200, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 200));
      const rows = await db().prepare("SELECT " + NOTICE_FIELDS + " FROM notices WHERE deleted_at IS NULL ORDER BY pinned DESC, created_at DESC LIMIT ?").bind(limit).all();
      return json({ notices: rows.results || [] });
    }
    if (id(a) && !b) {
      const row = await db().prepare("SELECT " + NOTICE_FIELDS + " FROM notices WHERE id = ? AND deleted_at IS NULL").bind(id(a)).first();
      return row ? json({ notice: row }) : notFound("공지");
    }
    return null;
  }

  // 관리자 API — 이 모듈이 담당하는 경로만 처리
  if (head !== "admin" || !["content", "grammar", "research", "opinions", "notices", "permissions", "restore"].includes(a)) return null;
  const role = await getRole(request);
  if (!role) return error("관리자 권한이 필요합니다.", 403);
  const target = id(b);

  if (a === "content" && method === "GET" && !b) return json(await adminOverview(role));

  if (a === "grammar") {
    if (method === "GET" && target && c === "revisions") {
      const rows = await db().prepare("SELECT version, title, note, research_id AS researchId, confirmed_by AS confirmedBy, confirmed_at AS confirmedAt FROM grammar_revisions WHERE entry_id = ? ORDER BY version DESC").bind(target).all();
      return json({ revisions: rows.results || [] });
    }
    if (method === "POST" && target && c === "confirm") {
      if (role !== "chief") return error("공식 확정은 최고 관리자만 할 수 있습니다.", 403);
      const input = await body(request, MAX_BODY);
      return confirmGrammar(role, target, text(input.note, 300));
    }
    if (!await allowed(role, "assistant_grammar")) return forbidden();
    if (method === "POST" && !b) {
      const input = grammarInput(await body(request, MAX_BODY));
      if (input.message !== undefined) return error(input.message);
      const now = Date.now();
      const result = await db().prepare(`INSERT INTO grammar_entries (category, title, summary, body, examples, related, status, official_version, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?)`).bind(input.category, input.title, input.summary, input.body, input.examples, input.related, now, now, role).run();
      return json({ id: result.meta.last_row_id }, 201);
    }
    if (target && !c && (method === "PATCH" || method === "DELETE")) {
      const before = await db().prepare("SELECT * FROM grammar_entries WHERE id = ? AND deleted_at IS NULL").bind(target).first<Row>();
      if (!before) return notFound("문법 항목");
      if (method === "DELETE") {
        if (Number(before.official_version) > 0 && role !== "chief") return error("공식 확정된 문법은 최고 관리자만 삭제할 수 있습니다.", 403);
        await db().batch([auditStmt(role, "delete", "grammar", target, before), db().prepare("UPDATE grammar_entries SET deleted_at = ? WHERE id = ?").bind(Date.now(), target)]);
        return json({ ok: true });
      }
      const input = grammarInput(await body(request, MAX_BODY), target);
      if (input.message !== undefined) return error(input.message);
      await db().batch([
        auditStmt(role, "update", "grammar", target, before),
        db().prepare("UPDATE grammar_entries SET category = ?, title = ?, summary = ?, body = ?, examples = ?, related = ?, status = 'draft', updated_at = ?, updated_by = ? WHERE id = ?")
          .bind(input.category, input.title, input.summary, input.body, input.examples, input.related, Date.now(), role, target),
      ]);
      return json({ ok: true });
    }
    return null;
  }

  if (a === "research") {
    if (method === "POST" && target && c === "draft") {
      if (role !== "chief") return error("문법서 반영은 최고 관리자만 할 수 있습니다.", 403);
      return sendToGrammar(role, target);
    }
    if (!await allowed(role, "assistant_lab")) return forbidden();
    if (method === "POST" && !b) {
      const input = researchInput(await body(request, MAX_BODY));
      if (input.message !== undefined) return error(input.message);
      const now = Date.now();
      const result = await db().prepare(`INSERT INTO research_projects (kind, title, summary, body, status, is_public, proposal_category, proposal_title, proposal_summary, proposal_body, proposal_examples, target_grammar_id, result, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(input.kind, input.title, input.summary, input.body, input.isPublic, input.proposalCategory, input.proposalTitle,
        input.proposalSummary, input.proposalBody, input.proposalExamples, input.targetGrammarId, input.result, role, now, now).run();
      const projectId = Number(result.meta.last_row_id);
      await db().prepare("INSERT INTO research_status_log (project_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, NULL, 'proposed', '연구 과제 등록', ?, ?)").bind(projectId, role, now).run();
      return json({ id: projectId }, 201);
    }
    if (method === "POST" && target && c === "status") {
      const input = await body(request);
      const next = oneOf(RESEARCH_STATUSES, input.status);
      const note = text(input.note, 300);
      const project = await db().prepare("SELECT * FROM research_projects WHERE id = ? AND deleted_at IS NULL").bind(target).first<Row>();
      if (!project) return notFound("연구 과제");
      const current = project.status as ResearchStatus;
      if (!next || !TRANSITIONS[current]?.includes(next)) return error("현재 단계에서 바꿀 수 없는 상태입니다.", 409);
      if ((CHIEF_ONLY.includes(next) || CHIEF_ONLY.includes(current)) && role !== "chief") return error("승인·반려·공식 반영은 최고 관리자만 할 수 있습니다.", 403);
      if (next === "applied" && project.kind === "grammar") return error("문법 연구는 문법서 초안을 공식 확정하면 자동으로 공식 반영됩니다.", 409);
      const now = Date.now();
      await db().batch([
        auditStmt(role, "status", "research", target, project),
        db().prepare("UPDATE research_projects SET status = ?, updated_at = ? WHERE id = ? AND status = ?").bind(next, now, target, current),
        db().prepare("INSERT INTO research_status_log (project_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)").bind(target, current, next, note, role, now),
      ]);
      return json({ ok: true });
    }
    if (target && !c && (method === "PATCH" || method === "DELETE")) {
      const before = await db().prepare("SELECT * FROM research_projects WHERE id = ? AND deleted_at IS NULL").bind(target).first<Row>();
      if (!before) return notFound("연구 과제");
      if (method === "DELETE") {
        if (role !== "chief" && ["approved", "rejected", "applied"].includes(String(before.status))) return error("확정된 연구 기록은 최고 관리자만 삭제할 수 있습니다.", 403);
        await db().batch([auditStmt(role, "delete", "research", target, before), db().prepare("UPDATE research_projects SET deleted_at = ? WHERE id = ?").bind(Date.now(), target)]);
        return json({ ok: true });
      }
      if (before.status === "applied" && role !== "chief") return error("공식 반영된 연구는 최고 관리자만 수정할 수 있습니다.", 403);
      const input = researchInput(await body(request, MAX_BODY));
      if (input.message !== undefined) return error(input.message);
      await db().batch([
        auditStmt(role, "update", "research", target, before),
        db().prepare(`UPDATE research_projects SET kind = ?, title = ?, summary = ?, body = ?, is_public = ?, proposal_category = ?, proposal_title = ?, proposal_summary = ?,
          proposal_body = ?, proposal_examples = ?, target_grammar_id = ?, result = ?, updated_at = ? WHERE id = ?`).bind(input.kind, input.title, input.summary, input.body, input.isPublic,
          input.proposalCategory, input.proposalTitle, input.proposalSummary, input.proposalBody, input.proposalExamples, input.targetGrammarId, input.result, Date.now(), target),
      ]);
      return json({ ok: true });
    }
    return null;
  }

  if (a === "opinions" && method === "PATCH" && target && !c) {
    if (!await allowed(role, "assistant_lab")) return forbidden();
    const input = await body(request);
    const status = input.status === "hidden" ? "hidden" : input.status === "visible" ? "visible" : null;
    if (!status) return error("표시 상태를 선택해 주세요.");
    const result = await db().prepare("UPDATE research_opinions SET status = ? WHERE id = ?").bind(status, target).run();
    return result.meta.changes ? json({ ok: true }) : notFound("의견");
  }

  if (a === "notices") {
    if (!await allowed(role, "assistant_notice")) return forbidden();
    const read = async () => {
      const input = await body(request, MAX_BODY);
      const category = oneOf(NOTICE_CATEGORIES, input.category), title = text(input.title, 120), content = text(input.body, 8000, true);
      if (!category) return { message: "공지 카테고리를 선택해 주세요." } as const;
      if (!title || !content) return { message: "공지 제목과 내용을 입력해 주세요." } as const;
      return { category, title, body: content, pinned: input.pinned === true ? 1 : 0 } as const;
    };
    if (method === "POST" && !b) {
      const input = await read();
      if (input.message !== undefined) return error(input.message);
      const now = Date.now();
      const result = await db().prepare("INSERT INTO notices (category, title, body, pinned, author_role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(input.category, input.title, input.body, input.pinned, role, now, now).run();
      return json({ id: result.meta.last_row_id }, 201);
    }
    if (target && !c && (method === "PATCH" || method === "DELETE")) {
      const before = await db().prepare("SELECT * FROM notices WHERE id = ? AND deleted_at IS NULL").bind(target).first<Row>();
      if (!before) return notFound("공지");
      if (method === "DELETE") {
        await db().batch([auditStmt(role, "delete", "notice", target, before), db().prepare("UPDATE notices SET deleted_at = ? WHERE id = ?").bind(Date.now(), target)]);
        return json({ ok: true });
      }
      const input = await read();
      if (input.message !== undefined) return error(input.message);
      await db().batch([
        auditStmt(role, "update", "notice", target, before),
        db().prepare("UPDATE notices SET category = ?, title = ?, body = ?, pinned = ?, updated_at = ? WHERE id = ?").bind(input.category, input.title, input.body, input.pinned, Date.now(), target),
      ]);
      return json({ ok: true });
    }
    return null;
  }

  if (a === "permissions" && method === "PATCH" && !b) {
    if (role !== "chief") return error("권한 설정은 최고 관리자만 할 수 있습니다.", 403);
    const input = await body(request);
    const now = Date.now();
    const changes = PERMISSION_KEYS.filter(key => typeof input[key] === "boolean").map(key =>
      db().prepare("INSERT INTO admin_permissions (key, allowed, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET allowed = excluded.allowed, updated_at = excluded.updated_at")
        .bind(key, input[key] ? 1 : 0, now));
    if (!changes.length) return error("변경할 권한을 선택해 주세요.");
    await db().batch([auditStmt(role, "permissions", "permissions", 0, await permissions()), ...changes]);
    return json({ permissions: await permissions() });
  }

  if (a === "restore" && method === "POST" && !b) {
    if (role !== "chief") return error("복구는 최고 관리자만 할 수 있습니다.", 403);
    const input = await body(request);
    const table = input.type === "grammar" ? "grammar_entries" : input.type === "research" ? "research_projects" : input.type === "notice" ? "notices" : "";
    const targetId = Number(input.id);
    if (!table || !Number.isInteger(targetId) || targetId <= 0) return error("복구할 항목을 확인해 주세요.");
    const result = await db().prepare("UPDATE " + table + " SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL").bind(targetId).run();
    if (!result.meta.changes) return notFound("삭제된 항목");
    await auditStmt(role, "restore", String(input.type), targetId, undefined).run();
    return json({ ok: true });
  }

  return null;
}

async function submitOpinion(request: Request, projectId: number) {
  const input = await body(request);
  const name = text(input.name, 20), content = text(input.body, 1000, true);
  if (!name || content.length < 2) return error("이름과 의견(2자 이상)을 입력해 주세요.");
  const project = await db().prepare("SELECT status FROM research_projects WHERE id = ? AND deleted_at IS NULL AND is_public = 1").bind(projectId).first<{ status: string }>();
  if (!project) return notFound("연구 과제");
  if (project.status !== "feedback") return error("지금은 의견을 받는 단계가 아닙니다.", 409);
  const ip = request.headers.get("CF-Connecting-IP") || "local", key = "op:" + ip, now = Date.now();
  const prior = await db().prepare("SELECT count, reset_at AS resetAt FROM admin_attempts WHERE ip_key = ?").bind(key).first<{ count: number; resetAt: number }>();
  if (prior && prior.resetAt > now && prior.count >= 5) return error("의견 제출이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  const count = prior && prior.resetAt > now ? prior.count + 1 : 1, resetAt = prior && prior.resetAt > now ? prior.resetAt : now + 10 * 60 * 1000;
  const [, created] = await db().batch([
    db().prepare("INSERT INTO admin_attempts (ip_key, count, reset_at) VALUES (?, ?, ?) ON CONFLICT(ip_key) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at").bind(key, count, resetAt),
    db().prepare("INSERT INTO research_opinions (project_id, author_name, body, status, created_at) VALUES (?, ?, ?, 'visible', ?)").bind(projectId, name, content, now),
  ]);
  return json({ id: created.meta.last_row_id }, 201);
}
