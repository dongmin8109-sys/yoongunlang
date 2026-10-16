import { env } from "cloudflare:workers";
import baseWords from "../data/words.json";

export type AdminRole = "chief" | "assistant";
export const db = () => {
  if (!env.DB) throw new Error("D1 DB binding is missing");
  return env.DB;
};
export const existingWords = baseWords as string[][];
export const spellingKey = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[’'\x60]/g, "").replace(/\s+/g, "").trim();
export const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
export const error = (message: string, status = 400) => json({ error: message }, status);
export const clean = (value: unknown, max: number) => typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : "";
export async function body(request: Request, max = 10000): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("JSON 요청이 필요합니다.");
  if (Number(request.headers.get("content-length") || 0) > max) throw new Error("입력 내용이 너무 깁니다.");
  const raw = await request.text();
  if (raw.length > max) throw new Error("입력 내용이 너무 깁니다.");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("입력 형식을 확인해 주세요.");
  return parsed as Record<string, unknown>;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join(""); }
async function hmac(value: string) {
  if (!env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is missing");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}
export async function sessionCookie(role: AdminRole, secure = true) {
  const payload = role + ":" + String(Date.now() + 12 * 60 * 60 * 1000);
  const signature = await hmac(payload);
  return "yg_admin=" + encodeURIComponent(payload + "." + signature) + "; HttpOnly; " + (secure ? "Secure; " : "") + "SameSite=Strict; Path=/; Max-Age=43200";
}
export const clearCookie = "yg_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
export async function getRole(request: Request): Promise<AdminRole | null> {
  const raw = request.headers.get("cookie")?.match(/(?:^|;\s*)yg_admin=([^;]+)/)?.[1];
  if (!raw) return null;
  try {
    const token = decodeURIComponent(raw);
    const at = token.lastIndexOf(".");
    if (at < 0) return null;
    const payload = token.slice(0, at), signature = token.slice(at + 1);
    const [role, expires] = payload.split(":");
    if ((role !== "chief" && role !== "assistant") || !Number.isFinite(Number(expires)) || Number(expires) < Date.now()) return null;
    const expected = await hmac(payload);
    if (signature.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < signature.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0 ? role : null;
  } catch { return null; }
}
export async function equalPin(a: string, b: string) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)), crypto.subtle.digest("SHA-256", new TextEncoder().encode(b))]);
  let diff = 0;
  const xb = new Uint8Array(x), yb = new Uint8Array(y);
  for (let i = 0; i < xb.length; i++) diff |= xb[i] ^ yb[i];
  return diff === 0;
}

