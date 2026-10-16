import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  spelling: text("spelling").notNull(),
  spellingKey: text("spelling_key").notNull().unique(),
  meaning: text("meaning").notNull(),
  pronunciation: text("pronunciation").notNull(),
  status: text("status").notNull().default("pending"),
  submittedAt: integer("submitted_at").notNull(),
  reviewedAt: integer("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  rejectionReason: text("rejection_reason"),
});

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorRole: text("author_role").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminAttempts = sqliteTable("admin_attempts", {
  ipKey: text("ip_key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

// 공식 문법서: 작업본(초안)과 공식 확정본(개정 이력)을 분리해 초안이 공개되지 않도록 한다.
export const grammarEntries = sqliteTable("grammar_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull(),
  examples: text("examples").notNull().default("[]"),
  related: text("related").notNull().default("[]"),
  status: text("status").notNull().default("draft"),
  officialVersion: integer("official_version").notNull().default(0),
  researchId: integer("research_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
  deletedAt: integer("deleted_at"),
});

export const grammarRevisions = sqliteTable("grammar_revisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: integer("entry_id").notNull(),
  version: integer("version").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull(),
  examples: text("examples").notNull().default("[]"),
  related: text("related").notNull().default("[]"),
  note: text("note").notNull().default(""),
  researchId: integer("research_id"),
  confirmedBy: text("confirmed_by").notNull(),
  confirmedAt: integer("confirmed_at").notNull(),
});

export const researchProjects = sqliteTable("research_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull(),
  status: text("status").notNull().default("proposed"),
  isPublic: integer("is_public").notNull().default(1),
  proposalCategory: text("proposal_category").notNull().default(""),
  proposalTitle: text("proposal_title").notNull().default(""),
  proposalSummary: text("proposal_summary").notNull().default(""),
  proposalBody: text("proposal_body").notNull().default(""),
  proposalExamples: text("proposal_examples").notNull().default("[]"),
  targetGrammarId: integer("target_grammar_id"),
  result: text("result").notNull().default(""),
  appliedGrammarId: integer("applied_grammar_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const researchStatusLog = sqliteTable("research_status_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note").notNull().default(""),
  changedBy: text("changed_by").notNull(),
  changedAt: integer("changed_at").notNull(),
});

export const researchOpinions = sqliteTable("research_opinions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: integer("created_at").notNull(),
});

export const notices = sqliteTable("notices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  pinned: integer("pinned").notNull().default(0),
  authorRole: text("author_role").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const adminPermissions = sqliteTable("admin_permissions", {
  key: text("key").primaryKey(),
  allowed: integer("allowed").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// 관리자 변경 직전 데이터를 JSON으로 보관해 필요 시 복구한다.
export const adminAudit = sqliteTable("admin_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  before: text("before"),
  at: integer("at").notNull(),
});
