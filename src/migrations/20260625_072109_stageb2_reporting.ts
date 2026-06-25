import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_score_reports_source" AS ENUM('web', 'mobile');
  CREATE TYPE "public"."enum_confirmations_decision" AS ENUM('confirmed', 'disputed');
  CREATE TYPE "public"."enum_disputes_status" AS ENUM('open', 'resolved');
  CREATE TABLE "score_reports_period_scores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"period" numeric,
  	"home" numeric,
  	"away" numeric
  );
  
  CREATE TABLE "score_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"submitted_by_id" integer NOT NULL,
  	"submitted_for_team_id" integer NOT NULL,
  	"home_score" numeric NOT NULL,
  	"away_score" numeric NOT NULL,
  	"scoresheet_photo_id" integer,
  	"notes" varchar,
  	"source" "enum_score_reports_source" DEFAULT 'web',
  	"submitted_at" timestamp(3) with time zone,
  	"idempotency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "scoresheet_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"game_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "confirmations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"score_report_id" integer NOT NULL,
  	"confirming_user_id" integer NOT NULL,
  	"confirming_team_id" integer NOT NULL,
  	"decision" "enum_confirmations_decision" NOT NULL,
  	"photo_acknowledged" boolean DEFAULT false,
  	"notes" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"idempotency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "disputes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"raised_by_id" integer NOT NULL,
  	"reason" varchar NOT NULL,
  	"status" "enum_disputes_status" DEFAULT 'open' NOT NULL,
  	"assigned_admin_email" varchar,
  	"resolved_by_id" integer,
  	"resolution" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"resolved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "incident_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"game_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "score_reports_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scoresheet_files_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "confirmations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "disputes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "incident_files_id" integer;
  ALTER TABLE "score_reports_period_scores" ADD CONSTRAINT "score_reports_period_scores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."score_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "score_reports" ADD CONSTRAINT "score_reports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "score_reports" ADD CONSTRAINT "score_reports_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "score_reports" ADD CONSTRAINT "score_reports_submitted_for_team_id_teams_id_fk" FOREIGN KEY ("submitted_for_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "score_reports" ADD CONSTRAINT "score_reports_scoresheet_photo_id_scoresheet_files_id_fk" FOREIGN KEY ("scoresheet_photo_id") REFERENCES "public"."scoresheet_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scoresheet_files" ADD CONSTRAINT "scoresheet_files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scoresheet_files" ADD CONSTRAINT "scoresheet_files_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_score_report_id_score_reports_id_fk" FOREIGN KEY ("score_report_id") REFERENCES "public"."score_reports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_confirming_user_id_users_id_fk" FOREIGN KEY ("confirming_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_confirming_team_id_teams_id_fk" FOREIGN KEY ("confirming_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_id_users_id_fk" FOREIGN KEY ("raised_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "incident_files" ADD CONSTRAINT "incident_files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "incident_files" ADD CONSTRAINT "incident_files_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "score_reports_period_scores_order_idx" ON "score_reports_period_scores" USING btree ("_order");
  CREATE INDEX "score_reports_period_scores_parent_id_idx" ON "score_reports_period_scores" USING btree ("_parent_id");
  CREATE INDEX "score_reports_game_idx" ON "score_reports" USING btree ("game_id");
  CREATE INDEX "score_reports_submitted_by_idx" ON "score_reports" USING btree ("submitted_by_id");
  CREATE INDEX "score_reports_submitted_for_team_idx" ON "score_reports" USING btree ("submitted_for_team_id");
  CREATE INDEX "score_reports_scoresheet_photo_idx" ON "score_reports" USING btree ("scoresheet_photo_id");
  CREATE INDEX "score_reports_idempotency_key_idx" ON "score_reports" USING btree ("idempotency_key");
  CREATE INDEX "score_reports_updated_at_idx" ON "score_reports" USING btree ("updated_at");
  CREATE INDEX "score_reports_created_at_idx" ON "score_reports" USING btree ("created_at");
  CREATE UNIQUE INDEX "game_submittedForTeam_idx" ON "score_reports" USING btree ("game_id","submitted_for_team_id");
  CREATE INDEX "scoresheet_files_owner_idx" ON "scoresheet_files" USING btree ("owner_id");
  CREATE INDEX "scoresheet_files_game_idx" ON "scoresheet_files" USING btree ("game_id");
  CREATE INDEX "scoresheet_files_updated_at_idx" ON "scoresheet_files" USING btree ("updated_at");
  CREATE INDEX "scoresheet_files_created_at_idx" ON "scoresheet_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "scoresheet_files_filename_idx" ON "scoresheet_files" USING btree ("filename");
  CREATE INDEX "confirmations_game_idx" ON "confirmations" USING btree ("game_id");
  CREATE INDEX "confirmations_score_report_idx" ON "confirmations" USING btree ("score_report_id");
  CREATE INDEX "confirmations_confirming_user_idx" ON "confirmations" USING btree ("confirming_user_id");
  CREATE INDEX "confirmations_confirming_team_idx" ON "confirmations" USING btree ("confirming_team_id");
  CREATE INDEX "confirmations_idempotency_key_idx" ON "confirmations" USING btree ("idempotency_key");
  CREATE INDEX "confirmations_updated_at_idx" ON "confirmations" USING btree ("updated_at");
  CREATE UNIQUE INDEX "scoreReport_confirmingUser_idx" ON "confirmations" USING btree ("score_report_id","confirming_user_id");
  CREATE INDEX "disputes_game_idx" ON "disputes" USING btree ("game_id");
  CREATE INDEX "disputes_raised_by_idx" ON "disputes" USING btree ("raised_by_id");
  CREATE INDEX "disputes_resolved_by_idx" ON "disputes" USING btree ("resolved_by_id");
  CREATE INDEX "disputes_updated_at_idx" ON "disputes" USING btree ("updated_at");
  CREATE INDEX "incident_files_owner_idx" ON "incident_files" USING btree ("owner_id");
  CREATE INDEX "incident_files_game_idx" ON "incident_files" USING btree ("game_id");
  CREATE INDEX "incident_files_updated_at_idx" ON "incident_files" USING btree ("updated_at");
  CREATE INDEX "incident_files_created_at_idx" ON "incident_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "incident_files_filename_idx" ON "incident_files" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_score_reports_fk" FOREIGN KEY ("score_reports_id") REFERENCES "public"."score_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scoresheet_files_fk" FOREIGN KEY ("scoresheet_files_id") REFERENCES "public"."scoresheet_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_confirmations_fk" FOREIGN KEY ("confirmations_id") REFERENCES "public"."confirmations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_disputes_fk" FOREIGN KEY ("disputes_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_incident_files_fk" FOREIGN KEY ("incident_files_id") REFERENCES "public"."incident_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_score_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("score_reports_id");
  CREATE INDEX "payload_locked_documents_rels_scoresheet_files_id_idx" ON "payload_locked_documents_rels" USING btree ("scoresheet_files_id");
  CREATE INDEX "payload_locked_documents_rels_confirmations_id_idx" ON "payload_locked_documents_rels" USING btree ("confirmations_id");
  CREATE INDEX "payload_locked_documents_rels_disputes_id_idx" ON "payload_locked_documents_rels" USING btree ("disputes_id");
  CREATE INDEX "payload_locked_documents_rels_incident_files_id_idx" ON "payload_locked_documents_rels" USING btree ("incident_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "score_reports_period_scores" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "score_reports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scoresheet_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "confirmations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "disputes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "incident_files" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "score_reports_period_scores" CASCADE;
  DROP TABLE "score_reports" CASCADE;
  DROP TABLE "scoresheet_files" CASCADE;
  DROP TABLE "confirmations" CASCADE;
  DROP TABLE "disputes" CASCADE;
  DROP TABLE "incident_files" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_score_reports_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scoresheet_files_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_confirmations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_disputes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_incident_files_fk";
  
  DROP INDEX "payload_locked_documents_rels_score_reports_id_idx";
  DROP INDEX "payload_locked_documents_rels_scoresheet_files_id_idx";
  DROP INDEX "payload_locked_documents_rels_confirmations_id_idx";
  DROP INDEX "payload_locked_documents_rels_disputes_id_idx";
  DROP INDEX "payload_locked_documents_rels_incident_files_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "score_reports_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scoresheet_files_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "confirmations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "disputes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "incident_files_id";
  DROP TYPE "public"."enum_score_reports_source";
  DROP TYPE "public"."enum_confirmations_decision";
  DROP TYPE "public"."enum_disputes_status";`)
}
