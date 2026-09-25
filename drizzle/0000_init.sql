CREATE TYPE "public"."asset_status" AS ENUM('OPERATIONAL', 'DEGRADED', 'DOWN', 'MAINTENANCE', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."ticket_channel" AS ENUM('QR_SCAN', 'PORTAL', 'API', 'PHONE', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."criticality" AS ENUM('CRITICAL', 'HIGH', 'STANDARD', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."impact_scope" AS ENUM('SINGLE', 'UNIT', 'FLOOR', 'BUILDING');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('COMMENT', 'STATUS_CHANGE', 'AUDIT_CAPTURE', 'ASSIGNMENT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('P1', 'P2', 'P3', 'P4');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'MANAGER', 'TECHNICIAN', 'TENANT');--> statement-breakpoint
CREATE TYPE "public"."system_domain" AS ENUM('HVAC', 'PLUMBING', 'ELECTRICAL', 'SUB_METER', 'WATER_PUMP', 'ACCESS_CONTROL', 'LOCK_ENCODER', 'VOIP_PBX', 'POS_PRINTER', 'CCTV', 'NETWORK');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('RESIDENTIAL', 'COMMERCIAL', 'COMMON_AREA', 'TECHNICAL');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"prefix" varchar(24) NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"created_by_id" uuid,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag" varchar(40) NOT NULL,
	"qr_token" varchar(24) NOT NULL,
	"name" varchar(160) NOT NULL,
	"domain" "system_domain" NOT NULL,
	"unit_id" uuid,
	"location_detail" varchar(200),
	"manufacturer" varchar(80),
	"model" varchar(120),
	"serial_number" varchar(120),
	"ip_address" varchar(64),
	"firmware" varchar(80),
	"criticality" "criticality" DEFAULT 'STANDARD' NOT NULL,
	"status" "asset_status" DEFAULT 'OPERATIONAL' NOT NULL,
	"environment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"meter_unit" varchar(16),
	"installed_at" date,
	"warranty_until" date,
	"last_service_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_tag_unique" UNIQUE("tag"),
	CONSTRAINT "assets_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_name" varchar(160),
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" varchar(64),
	"summary" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"value" double precision NOT NULL,
	"reading_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_id" uuid,
	"anomaly" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" varchar(160),
	"type" "note_type" DEFAULT 'COMMENT' NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"domain" "system_domain" NOT NULL,
	"issue_code" varchar(64) NOT NULL,
	"priority" "priority" NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"channel" "ticket_channel" DEFAULT 'PORTAL' NOT NULL,
	"impact_scope" "impact_scope" DEFAULT 'UNIT' NOT NULL,
	"safety_hazard" boolean DEFAULT false NOT NULL,
	"sla_trace" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority_overridden" boolean DEFAULT false NOT NULL,
	"asset_id" uuid,
	"unit_id" uuid,
	"reporter_name" varchar(160),
	"reporter_contact" varchar(160),
	"reporter_user_id" uuid,
	"assignee_id" uuid,
	"response_due_at" timestamp with time zone NOT NULL,
	"resolution_due_at" timestamp with time zone NOT NULL,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"sla_paused_at" timestamp with time zone,
	"sla_paused_minutes" integer DEFAULT 0 NOT NULL,
	"resolution_summary" text,
	"external_ref" varchar(120),
	"public_token" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_seq_unique" UNIQUE("seq"),
	CONSTRAINT "tickets_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" "unit_type" DEFAULT 'RESIDENTIAL' NOT NULL,
	"floor" varchar(64) NOT NULL,
	"floor_level" integer DEFAULT 0 NOT NULL,
	"occupant_name" varchar(160),
	"contact_phone" varchar(40),
	"contact_email" varchar(160),
	"area_sqm" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(160) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'TECHNICIAN' NOT NULL,
	"title" varchar(120),
	"phone" varchar(40),
	"unit_id" uuid,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_domain_idx" ON "assets" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "assets_unit_idx" ON "assets" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "meter_readings_asset_idx" ON "meter_readings" USING btree ("asset_id","reading_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_notes_ticket_idx" ON "ticket_notes" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_assignee_idx" ON "tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tickets_asset_idx" ON "tickets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "tickets_created_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_external_idx" ON "tickets" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "units_type_idx" ON "units" USING btree ("type");