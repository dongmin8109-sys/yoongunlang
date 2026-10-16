import { env } from "cloudflare:workers";
import { body, clean, clearCookie, db, equalPin, error, existingWords, getRole, json, sameOrigin, sessionCookie, spellingKey } from "../../../lib/yg";
import { contentRoutes } from "../../../lib/content";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Method = "GET" | "POST" | "PATCH" | "DELETE";
const officialKeys = new Set(existingWords.map(item => spellingKey(item[0])));
const num = (value: string | undefined) => /^\d+$/.test(value || "") ? Number(value) : 0;
const badRequest = () => error("요청을 처리하지 못했습니다.", 500);
const forbidden = () => error("관리자 권한이 필요합니다.", 403);

async function handle(request: Request, method: Method) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean).slice(1);
  const path = parts.join("/");
  if (method !== "GET" && !sameOrigin(request)) return error("허용되지 않은 요청입니다.", 403);
  try {
    // 공식 문법서·연구소·공지센터 (기존 경로와 겹치지 않으며, 해당하지 않으면 null)
    const content = await contentRoutes(request, method, parts);
    if (content) return content;
    if (method === "GET" && path === "words") {
      const rows = await db().prepare("SELECT spelling, pronunciation, meaning FROM suggestions WHERE status = 'approved' ORDER BY reviewed_at DESC").all<{ spelling: string; pronunciation: string; meaning: string }>();
      return json([...existingWords, ...(rows.results || []).map(row => [row.spelling, row.pronunciation, row.meaning])]);
    }
    if (method === "GET" && path === "news") {
      const rows = await db().prepare("SELECT id, title, body, author_role AS authorRole, created_at AS createdAt, updated_at AS updatedAt FROM news ORDER BY created_at DESC LIMIT 30").all();
      return json({ news: rows.results || [] });
    }
    if (method === "POST" && path === "suggestions") {
      const input = await body(request);
      const spelling = clean(input.spelling, 80), meaning = clean(input.meaning, 300), pronunciation = clean(input.pronunciation, 120);
      const key = spellingKey(spelling);
      if (!spelling || !meaning || !pronunciation || !key) return error("철자, 뜻, 발음을 모두 입력해 주세요.");
      if (spelling.length < 2 || key.length < 2) return error("철자는 두 글자 이상 입력해 주세요.");
      if (officialKeys.has(key)) return error("이미 사전에 등록된 철자입니다.", 409);
      const result = await db().prepare("INSERT OR IGNORE INTO suggestions (spelling, spelling_key, meaning, pronunciation, status, submitted_at) VALUES (?, ?, ?, ?, 'pending', ?)").bind(spelling, key, meaning, pronunciation, Date.now()).run();
      if (!result.meta.changes) return error("같은 철자의 건의가 이미 접수되었습니다.", 409);
      return json({ id: result.meta.last_row_id, status: "pending", spelling }, 201);
    }
    if (method === "POST" && path === "admin/login") {
      const input = await body(request);
      const role = input.role === "chief" || input.role === "assistant" ? input.role : null;
      const pin = typeof input.pin === "string" ? input.pin : "";
      if (!role || !/^\d{6}$/.test(pin)) return error("직책과 6자리 비밀번호를 확인해 주세요.");
      const ip = request.headers.get("CF-Connecting-IP") || "local";
      const ipKey = role + ":" + ip;
      const now = Date.now();
      const prior = await db().prepare("SELECT count, reset_at AS resetAt FROM admin_attempts WHERE ip_key = ?").bind(ipKey).first<{ count: number; resetAt: number }>();
      if (prior && prior.resetAt > now && prior.count >= 5) return error("로그인 시도가 많습니다. 15분 뒤 다시 시도해 주세요.", 429);
      const expected = role === "chief" ? env.ADMIN_CHIEF_PIN : env.ADMIN_ASSISTANT_PIN;
      if (!expected || !env.ADMIN_SESSION_SECRET) return error("관리자 로그인이 아직 설정되지 않았습니다.", 503);
      if (!await equalPin(pin, expected)) {
        const count = prior && prior.resetAt > now ? prior.count + 1 : 1;
        const resetAt = prior && prior.resetAt > now ? prior.resetAt : now + 15 * 60 * 1000;
        await db().prepare("INSERT INTO admin_attempts (ip_key, count, reset_at) VALUES (?, ?, ?) ON CONFLICT(ip_key) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at").bind(ipKey, count, resetAt).run();
        return error("직책 또는 비밀번호가 올바르지 않습니다.", 401);
      }
      await db().prepare("DELETE FROM admin_attempts WHERE ip_key = ?").bind(ipKey).run();
      return json({ role }, 200, { "Set-Cookie": await sessionCookie(role, new URL(request.url).protocol === "https:") });
    }
    if (method === "POST" && path === "admin/logout") return json({ ok: true }, 200, { "Set-Cookie": clearCookie });
    if (path.startsWith("admin/")) {
      const role = await getRole(request);
      if (!role) return forbidden();
      if (method === "GET" && path === "admin/me") return json({ role });
      if (method === "GET" && path === "admin/queue") {
        const rows = await db().prepare("SELECT id, spelling, meaning, pronunciation, status, submitted_at AS submittedAt, reviewed_at AS reviewedAt, reviewed_by AS reviewedBy, rejection_reason AS rejectionReason FROM suggestions ORDER BY submitted_at DESC LIMIT 200").all();
        return json({ suggestions: rows.results || [] });
      }
      if (method === "PATCH" && parts[1] === "suggestions" && num(parts[2])) {
        const input = await body(request);
        const decision = input.decision;
        if (decision !== "approve" && decision !== "reject") return error("승인 또는 거절을 선택해 주세요.");
        const reason = decision === "reject" ? clean(input.reason, 200) : "";
        const result = await db().prepare("UPDATE suggestions SET status = ?, reviewed_at = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ? AND status = 'pending'")
          .bind(decision === "approve" ? "approved" : "rejected", Date.now(), role, reason, num(parts[2])).run();
        if (!result.meta.changes) return error("이미 처리되었거나 존재하지 않는 건의입니다.", 409);
        return json({ ok: true });
      }
      if (method === "DELETE" && parts[1] === "suggestions" && num(parts[2])) {
        if (role !== "chief") return forbidden();
        const result = await db().prepare("UPDATE suggestions SET status = 'removed', reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status = 'approved'")
          .bind(Date.now(), role, num(parts[2])).run();
        if (!result.meta.changes) return error("삭제할 승인 단어가 없습니다.", 404);
        return json({ ok: true });
      }
      if (method === "POST" && path === "admin/news") {
        const input = await body(request), title = clean(input.title, 100), newsBody = clean(input.body, 3000);
        if (!title || !newsBody) return error("제목과 내용을 입력해 주세요.");
        const now = Date.now();
        const result = await db().prepare("INSERT INTO news (title, body, author_role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(title, newsBody, role, now, now).run();
        return json({ id: result.meta.last_row_id }, 201);
      }
      if ((method === "PATCH" || method === "DELETE") && parts[1] === "news" && num(parts[2])) {
        if (method === "DELETE") {
          const result = await db().prepare("DELETE FROM news WHERE id = ?").bind(num(parts[2])).run();
          return result.meta.changes ? json({ ok: true }) : error("소식을 찾을 수 없습니다.", 404);
        }
        const input = await body(request), title = clean(input.title, 100), newsBody = clean(input.body, 3000);
        if (!title || !newsBody) return error("제목과 내용을 입력해 주세요.");
        const result = await db().prepare("UPDATE news SET title = ?, body = ?, updated_at = ? WHERE id = ?").bind(title, newsBody, Date.now(), num(parts[2])).run();
        return result.meta.changes ? json({ ok: true }) : error("소식을 찾을 수 없습니다.", 404);
      }
    }
    return error("찾을 수 없습니다.", 404);
  } catch (e) {
    if (e instanceof SyntaxError) return error("입력 형식을 확인해 주세요.");
    if (e instanceof Error && ["JSON 요청이 필요합니다.", "입력 내용이 너무 깁니다.", "입력 형식을 확인해 주세요."].includes(e.message)) return error(e.message);
    console.error(e);
    return badRequest();
  }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const PATCH = (request: Request) => handle(request, "PATCH");
export const DELETE = (request: Request) => handle(request, "DELETE");




