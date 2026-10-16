CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`before` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_permissions` (
	`key` text PRIMARY KEY NOT NULL,
	`allowed` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grammar_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`examples` text DEFAULT '[]' NOT NULL,
	`related` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`official_version` integer DEFAULT 0 NOT NULL,
	`research_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `grammar_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`version` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`examples` text DEFAULT '[]' NOT NULL,
	`related` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`research_id` integer,
	`confirmed_by` text NOT NULL,
	`confirmed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`author_role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `research_opinions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`is_public` integer DEFAULT 1 NOT NULL,
	`proposal_category` text DEFAULT '' NOT NULL,
	`proposal_title` text DEFAULT '' NOT NULL,
	`proposal_summary` text DEFAULT '' NOT NULL,
	`proposal_body` text DEFAULT '' NOT NULL,
	`proposal_examples` text DEFAULT '[]' NOT NULL,
	`target_grammar_id` integer,
	`result` text DEFAULT '' NOT NULL,
	`applied_grammar_id` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `research_status_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`changed_by` text NOT NULL,
	`changed_at` integer NOT NULL
);
