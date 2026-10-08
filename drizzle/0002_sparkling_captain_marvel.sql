CREATE TYPE "public"."project_status" AS ENUM('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rag" AS ENUM('GREEN', 'YELLOW', 'RED');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"sponsor" varchar(160),
	"project_manager" varchar(160),
	"department" varchar(120),
	"start_date" date,
	"target_end_date" date,
	"status" "project_status" DEFAULT 'ACTIVE' NOT NULL,
	"rag" "rag" DEFAULT 'GREEN' NOT NULL,
	"percent_complete" integer DEFAULT 0 NOT NULL,
	"budget" double precision DEFAULT 0 NOT NULL,
	"actual_cost" double precision DEFAULT 0 NOT NULL,
	"next_milestone" varchar(200),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_rag_idx" ON "projects" USING btree ("rag");--> statement-breakpoint
CREATE INDEX "projects_start_idx" ON "projects" USING btree ("start_date");