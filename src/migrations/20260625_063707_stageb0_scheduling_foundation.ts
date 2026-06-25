import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_seasons_standings_config_tiebreakers_criterion" AS ENUM('headToHead', 'winPct', 'pointDiff', 'pointsFor', 'fewestPointsAgainst', 'wins');
  CREATE TYPE "public"."enum_seasons_status" AS ENUM('setup', 'active', 'playoffs', 'complete', 'archived');
  CREATE TYPE "public"."enum_seasons_standings_config_points_for_basis" AS ENUM('capped', 'raw');
  CREATE TYPE "public"."enum_divisions_gender" AS ENUM('boys', 'girls', 'coed');
  CREATE TYPE "public"."enum_divisions_schedule_type" AS ENUM('round_robin_single', 'round_robin_double', 'custom');
  CREATE TYPE "public"."enum_divisions_required_ramp_level" AS ENUM('none', 'level1', 'level2', 'level3');
  CREATE TYPE "public"."enum_team_memberships_role" AS ENUM('rep', 'coach', 'manager');
  CREATE TYPE "public"."enum_import_batches_kind" AS ENUM('teams', 'venues', 'officials', 'games');
  CREATE TYPE "public"."enum_import_batches_publish_mode" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_import_batches_status" AS ENUM('pending', 'committed', 'undone');
  CREATE TABLE "seasons_standings_config_tiebreakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"criterion" "enum_seasons_standings_config_tiebreakers_criterion" NOT NULL
  );
  
  CREATE TABLE "seasons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"sport" varchar DEFAULT 'basketball',
  	"status" "enum_seasons_status" DEFAULT 'setup' NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"timezone" varchar DEFAULT 'America/Edmonton',
  	"default_game_length_minutes" numeric DEFAULT 60,
  	"buffer_minutes" numeric DEFAULT 15,
  	"season_seed" numeric,
  	"standings_config_points_win" numeric DEFAULT 2,
  	"standings_config_points_loss" numeric DEFAULT 0,
  	"standings_config_points_tie" numeric DEFAULT 1,
  	"standings_config_point_diff_cap" numeric DEFAULT 40,
  	"standings_config_mercy_enabled" boolean DEFAULT true,
  	"standings_config_include_forfeits" boolean DEFAULT true,
  	"standings_config_forfeit_score_for" numeric DEFAULT 20,
  	"standings_config_forfeit_score_against" numeric DEFAULT 0,
  	"standings_config_forfeit_win_points" numeric DEFAULT 2,
  	"standings_config_forfeit_penalty_points" numeric DEFAULT 0,
  	"standings_config_points_for_basis" "enum_seasons_standings_config_points_for_basis" DEFAULT 'capped',
  	"standings_config_legend" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "divisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_path" varchar NOT NULL,
  	"display_label" varchar,
  	"league_name" varchar NOT NULL,
  	"age_group" varchar NOT NULL,
  	"gender" "enum_divisions_gender",
  	"tier" varchar,
  	"season_id" integer NOT NULL,
  	"schedule_type" "enum_divisions_schedule_type" DEFAULT 'round_robin_single',
  	"required_ramp_level" "enum_divisions_required_ramp_level" DEFAULT 'none',
  	"sort_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "teams" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"club_id" integer,
  	"division_id" integer NOT NULL,
  	"color" varchar,
  	"logo_id" integer,
  	"external_id" varchar,
  	"active" boolean DEFAULT true,
  	"import_batch_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "venues_blackout_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"reason" varchar
  );
  
  CREATE TABLE "venues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"address" varchar,
  	"city" varchar,
  	"province" varchar DEFAULT 'AB',
  	"postal_code" varchar,
  	"maps_url" varchar,
  	"notes" varchar,
  	"external_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "courts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"venue_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"external_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_memberships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"team_id" integer NOT NULL,
  	"role" "enum_team_memberships_role" DEFAULT 'rep' NOT NULL,
  	"verified" boolean DEFAULT false,
  	"verified_by_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"invited_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "standings_cache" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"division_id" integer NOT NULL,
  	"rows" jsonb,
  	"inputs_hash" varchar,
  	"computed_at" timestamp(3) with time zone,
  	"legend" varchar,
  	"season_status" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_import_batches_kind" NOT NULL,
  	"file_name" varchar,
  	"counts" jsonb,
  	"publish_mode" "enum_import_batches_publish_mode",
  	"status" "enum_import_batches_status" DEFAULT 'pending' NOT NULL,
  	"created_records" jsonb,
  	"committed_by_id" integer,
  	"committed_at" timestamp(3) with time zone,
  	"undone_by_id" integer,
  	"undone_at" timestamp(3) with time zone,
  	"undo_expires_at" timestamp(3) with time zone,
  	"undo_window_minutes" numeric DEFAULT 60,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"actor_email" varchar,
  	"action" varchar NOT NULL,
  	"entity" varchar NOT NULL,
  	"entity_id" varchar NOT NULL,
  	"before" jsonb,
  	"after" jsonb,
  	"reason" varchar,
  	"at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "idempotency_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"scope" varchar NOT NULL,
  	"user_id" varchar,
  	"request_hash" varchar,
  	"status_code" numeric,
  	"response_body" jsonb,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "refresh_tokens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"family" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"revoked" boolean DEFAULT false,
  	"replaced_by" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_limit_hits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bucket" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "notification_prefs_game_reminders" boolean DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "seasons_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "divisions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "teams_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "venues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "courts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "team_memberships_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "standings_cache_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_batches_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_log_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "idempotency_keys_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "refresh_tokens_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_limit_hits_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "scheduling_admin_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "scheduling_admin_name" varchar;
  ALTER TABLE "seasons_standings_config_tiebreakers" ADD CONSTRAINT "seasons_standings_config_tiebreakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "venues_blackout_dates" ADD CONSTRAINT "venues_blackout_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "standings_cache" ADD CONSTRAINT "standings_cache_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_committed_by_id_users_id_fk" FOREIGN KEY ("committed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_undone_by_id_users_id_fk" FOREIGN KEY ("undone_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "seasons_standings_config_tiebreakers_order_idx" ON "seasons_standings_config_tiebreakers" USING btree ("_order");
  CREATE INDEX "seasons_standings_config_tiebreakers_parent_id_idx" ON "seasons_standings_config_tiebreakers" USING btree ("_parent_id");
  CREATE INDEX "seasons_updated_at_idx" ON "seasons" USING btree ("updated_at");
  CREATE INDEX "seasons_created_at_idx" ON "seasons" USING btree ("created_at");
  CREATE INDEX "divisions_season_idx" ON "divisions" USING btree ("season_id");
  CREATE INDEX "divisions_updated_at_idx" ON "divisions" USING btree ("updated_at");
  CREATE INDEX "divisions_created_at_idx" ON "divisions" USING btree ("created_at");
  CREATE UNIQUE INDEX "season_fullPath_idx" ON "divisions" USING btree ("season_id","full_path");
  CREATE INDEX "teams_club_idx" ON "teams" USING btree ("club_id");
  CREATE INDEX "teams_division_idx" ON "teams" USING btree ("division_id");
  CREATE INDEX "teams_logo_idx" ON "teams" USING btree ("logo_id");
  CREATE INDEX "teams_external_id_idx" ON "teams" USING btree ("external_id");
  CREATE INDEX "teams_import_batch_idx" ON "teams" USING btree ("import_batch_id");
  CREATE INDEX "teams_updated_at_idx" ON "teams" USING btree ("updated_at");
  CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");
  CREATE UNIQUE INDEX "division_name_idx" ON "teams" USING btree ("division_id","name");
  CREATE INDEX "venues_blackout_dates_order_idx" ON "venues_blackout_dates" USING btree ("_order");
  CREATE INDEX "venues_blackout_dates_parent_id_idx" ON "venues_blackout_dates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "venues_name_idx" ON "venues" USING btree ("name");
  CREATE INDEX "venues_external_id_idx" ON "venues" USING btree ("external_id");
  CREATE INDEX "venues_updated_at_idx" ON "venues" USING btree ("updated_at");
  CREATE INDEX "venues_created_at_idx" ON "venues" USING btree ("created_at");
  CREATE INDEX "courts_venue_idx" ON "courts" USING btree ("venue_id");
  CREATE INDEX "courts_updated_at_idx" ON "courts" USING btree ("updated_at");
  CREATE INDEX "courts_created_at_idx" ON "courts" USING btree ("created_at");
  CREATE UNIQUE INDEX "venue_name_idx" ON "courts" USING btree ("venue_id","name");
  CREATE INDEX "team_memberships_user_idx" ON "team_memberships" USING btree ("user_id");
  CREATE INDEX "team_memberships_team_idx" ON "team_memberships" USING btree ("team_id");
  CREATE INDEX "team_memberships_verified_by_idx" ON "team_memberships" USING btree ("verified_by_id");
  CREATE INDEX "team_memberships_updated_at_idx" ON "team_memberships" USING btree ("updated_at");
  CREATE INDEX "team_memberships_created_at_idx" ON "team_memberships" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_team_idx" ON "team_memberships" USING btree ("user_id","team_id");
  CREATE UNIQUE INDEX "standings_cache_division_idx" ON "standings_cache" USING btree ("division_id");
  CREATE INDEX "standings_cache_season_status_idx" ON "standings_cache" USING btree ("season_status");
  CREATE INDEX "standings_cache_updated_at_idx" ON "standings_cache" USING btree ("updated_at");
  CREATE INDEX "standings_cache_created_at_idx" ON "standings_cache" USING btree ("created_at");
  CREATE INDEX "import_batches_committed_by_idx" ON "import_batches" USING btree ("committed_by_id");
  CREATE INDEX "import_batches_committed_at_idx" ON "import_batches" USING btree ("committed_at");
  CREATE INDEX "import_batches_undone_by_idx" ON "import_batches" USING btree ("undone_by_id");
  CREATE INDEX "import_batches_updated_at_idx" ON "import_batches" USING btree ("updated_at");
  CREATE INDEX "import_batches_created_at_idx" ON "import_batches" USING btree ("created_at");
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_entity_id_idx" ON "audit_log" USING btree ("entity_id");
  CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys" USING btree ("key");
  CREATE INDEX "idempotency_keys_scope_idx" ON "idempotency_keys" USING btree ("scope");
  CREATE INDEX "idempotency_keys_user_id_idx" ON "idempotency_keys" USING btree ("user_id");
  CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys" USING btree ("created_at");
  CREATE INDEX "idempotency_keys_updated_at_idx" ON "idempotency_keys" USING btree ("updated_at");
  CREATE UNIQUE INDEX "key_scope_idx" ON "idempotency_keys" USING btree ("key","scope");
  CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");
  CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");
  CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family");
  CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");
  CREATE INDEX "refresh_tokens_updated_at_idx" ON "refresh_tokens" USING btree ("updated_at");
  CREATE INDEX "rate_limit_hits_bucket_idx" ON "rate_limit_hits" USING btree ("bucket");
  CREATE INDEX "rate_limit_hits_subject_idx" ON "rate_limit_hits" USING btree ("subject");
  CREATE INDEX "rate_limit_hits_at_idx" ON "rate_limit_hits" USING btree ("at");
  CREATE INDEX "rate_limit_hits_updated_at_idx" ON "rate_limit_hits" USING btree ("updated_at");
  CREATE INDEX "rate_limit_hits_created_at_idx" ON "rate_limit_hits" USING btree ("created_at");
  CREATE INDEX "bucket_subject_at_idx" ON "rate_limit_hits" USING btree ("bucket","subject","at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seasons_fk" FOREIGN KEY ("seasons_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_divisions_fk" FOREIGN KEY ("divisions_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teams_fk" FOREIGN KEY ("teams_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_venues_fk" FOREIGN KEY ("venues_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courts_fk" FOREIGN KEY ("courts_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_memberships_fk" FOREIGN KEY ("team_memberships_id") REFERENCES "public"."team_memberships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_standings_cache_fk" FOREIGN KEY ("standings_cache_id") REFERENCES "public"."standings_cache"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_batches_fk" FOREIGN KEY ("import_batches_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_idempotency_keys_fk" FOREIGN KEY ("idempotency_keys_id") REFERENCES "public"."idempotency_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_refresh_tokens_fk" FOREIGN KEY ("refresh_tokens_id") REFERENCES "public"."refresh_tokens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limit_hits_fk" FOREIGN KEY ("rate_limit_hits_id") REFERENCES "public"."rate_limit_hits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_seasons_id_idx" ON "payload_locked_documents_rels" USING btree ("seasons_id");
  CREATE INDEX "payload_locked_documents_rels_divisions_id_idx" ON "payload_locked_documents_rels" USING btree ("divisions_id");
  CREATE INDEX "payload_locked_documents_rels_teams_id_idx" ON "payload_locked_documents_rels" USING btree ("teams_id");
  CREATE INDEX "payload_locked_documents_rels_venues_id_idx" ON "payload_locked_documents_rels" USING btree ("venues_id");
  CREATE INDEX "payload_locked_documents_rels_courts_id_idx" ON "payload_locked_documents_rels" USING btree ("courts_id");
  CREATE INDEX "payload_locked_documents_rels_team_memberships_id_idx" ON "payload_locked_documents_rels" USING btree ("team_memberships_id");
  CREATE INDEX "payload_locked_documents_rels_standings_cache_id_idx" ON "payload_locked_documents_rels" USING btree ("standings_cache_id");
  CREATE INDEX "payload_locked_documents_rels_import_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("import_batches_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_locked_documents_rels_idempotency_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("idempotency_keys_id");
  CREATE INDEX "payload_locked_documents_rels_refresh_tokens_id_idx" ON "payload_locked_documents_rels" USING btree ("refresh_tokens_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limit_hits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limit_hits_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "seasons_standings_config_tiebreakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "seasons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "divisions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "venues_blackout_dates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "venues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "courts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_memberships" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "standings_cache" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_batches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "idempotency_keys" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "refresh_tokens" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_limit_hits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "seasons_standings_config_tiebreakers" CASCADE;
  DROP TABLE "seasons" CASCADE;
  DROP TABLE "divisions" CASCADE;
  DROP TABLE "teams" CASCADE;
  DROP TABLE "venues_blackout_dates" CASCADE;
  DROP TABLE "venues" CASCADE;
  DROP TABLE "courts" CASCADE;
  DROP TABLE "team_memberships" CASCADE;
  DROP TABLE "standings_cache" CASCADE;
  DROP TABLE "import_batches" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "idempotency_keys" CASCADE;
  DROP TABLE "refresh_tokens" CASCADE;
  DROP TABLE "rate_limit_hits" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_seasons_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_divisions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_teams_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_venues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_courts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_memberships_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_standings_cache_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_batches_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_log_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_idempotency_keys_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_refresh_tokens_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rate_limit_hits_fk";
  
  DROP INDEX "payload_locked_documents_rels_seasons_id_idx";
  DROP INDEX "payload_locked_documents_rels_divisions_id_idx";
  DROP INDEX "payload_locked_documents_rels_teams_id_idx";
  DROP INDEX "payload_locked_documents_rels_venues_id_idx";
  DROP INDEX "payload_locked_documents_rels_courts_id_idx";
  DROP INDEX "payload_locked_documents_rels_team_memberships_id_idx";
  DROP INDEX "payload_locked_documents_rels_standings_cache_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_batches_id_idx";
  DROP INDEX "payload_locked_documents_rels_audit_log_id_idx";
  DROP INDEX "payload_locked_documents_rels_idempotency_keys_id_idx";
  DROP INDEX "payload_locked_documents_rels_refresh_tokens_id_idx";
  DROP INDEX "payload_locked_documents_rels_rate_limit_hits_id_idx";
  ALTER TABLE "users" DROP COLUMN "notification_prefs_game_reminders";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "seasons_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "divisions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "teams_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "venues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "courts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "team_memberships_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "standings_cache_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_batches_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_log_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "idempotency_keys_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "refresh_tokens_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_limit_hits_id";
  ALTER TABLE "site_settings" DROP COLUMN "scheduling_admin_email";
  ALTER TABLE "site_settings" DROP COLUMN "scheduling_admin_name";
  DROP TYPE "public"."enum_seasons_standings_config_tiebreakers_criterion";
  DROP TYPE "public"."enum_seasons_status";
  DROP TYPE "public"."enum_seasons_standings_config_points_for_basis";
  DROP TYPE "public"."enum_divisions_gender";
  DROP TYPE "public"."enum_divisions_schedule_type";
  DROP TYPE "public"."enum_divisions_required_ramp_level";
  DROP TYPE "public"."enum_team_memberships_role";
  DROP TYPE "public"."enum_import_batches_kind";
  DROP TYPE "public"."enum_import_batches_publish_mode";
  DROP TYPE "public"."enum_import_batches_status";`)
}
