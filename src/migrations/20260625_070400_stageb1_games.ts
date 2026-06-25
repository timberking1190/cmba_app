import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_games_status" AS ENUM('scheduled', 'reported', 'contested', 'final', 'postponed', 'cancelled', 'forfeit');
  CREATE TYPE "public"."enum_games_publish_state" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_games_forfeit_outcome" AS ENUM('home_forfeit', 'away_forfeit', 'double_forfeit', 'no_contest');
  CREATE TABLE "games_period_scores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"period" numeric,
  	"home" numeric,
  	"away" numeric
  );
  
  CREATE TABLE "games_change_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"actor_id" integer,
  	"actor_email" varchar,
  	"field" varchar,
  	"from" varchar,
  	"to" varchar,
  	"reason" varchar
  );
  
  CREATE TABLE "games" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"season_id" integer NOT NULL,
  	"division_id" integer NOT NULL,
  	"home_team_id" integer NOT NULL,
  	"away_team_id" integer NOT NULL,
  	"venue_id" integer,
  	"court_id" integer,
  	"start_at" timestamp(3) with time zone NOT NULL,
  	"end_at" timestamp(3) with time zone,
  	"status" "enum_games_status" DEFAULT 'scheduled' NOT NULL,
  	"publish_state" "enum_games_publish_state" DEFAULT 'draft' NOT NULL,
  	"version" numeric DEFAULT 1,
  	"home_score" numeric,
  	"away_score" numeric,
  	"forfeit_is_forfeit" boolean DEFAULT false,
  	"forfeit_outcome" "enum_games_forfeit_outcome",
  	"forfeit_forfeiting_team_id" integer,
  	"forfeit_reason" varchar,
  	"is_bye" boolean DEFAULT false,
  	"locked_at" timestamp(3) with time zone,
  	"external_id" varchar,
  	"notes" varchar,
  	"import_batch_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "games_id" integer;
  ALTER TABLE "games_period_scores" ADD CONSTRAINT "games_period_scores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games_change_log" ADD CONSTRAINT "games_change_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games_change_log" ADD CONSTRAINT "games_change_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_forfeit_forfeiting_team_id_teams_id_fk" FOREIGN KEY ("forfeit_forfeiting_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "games" ADD CONSTRAINT "games_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "games_period_scores_order_idx" ON "games_period_scores" USING btree ("_order");
  CREATE INDEX "games_period_scores_parent_id_idx" ON "games_period_scores" USING btree ("_parent_id");
  CREATE INDEX "games_change_log_order_idx" ON "games_change_log" USING btree ("_order");
  CREATE INDEX "games_change_log_parent_id_idx" ON "games_change_log" USING btree ("_parent_id");
  CREATE INDEX "games_change_log_actor_idx" ON "games_change_log" USING btree ("actor_id");
  CREATE INDEX "games_season_idx" ON "games" USING btree ("season_id");
  CREATE INDEX "games_division_idx" ON "games" USING btree ("division_id");
  CREATE INDEX "games_home_team_idx" ON "games" USING btree ("home_team_id");
  CREATE INDEX "games_away_team_idx" ON "games" USING btree ("away_team_id");
  CREATE INDEX "games_venue_idx" ON "games" USING btree ("venue_id");
  CREATE INDEX "games_court_idx" ON "games" USING btree ("court_id");
  CREATE INDEX "games_start_at_idx" ON "games" USING btree ("start_at");
  CREATE INDEX "games_forfeit_forfeit_forfeiting_team_idx" ON "games" USING btree ("forfeit_forfeiting_team_id");
  CREATE INDEX "games_external_id_idx" ON "games" USING btree ("external_id");
  CREATE INDEX "games_import_batch_idx" ON "games" USING btree ("import_batch_id");
  CREATE INDEX "games_updated_at_idx" ON "games" USING btree ("updated_at");
  CREATE INDEX "games_created_at_idx" ON "games" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_games_fk" FOREIGN KEY ("games_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_games_id_idx" ON "payload_locked_documents_rels" USING btree ("games_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "games_period_scores" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "games_change_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "games" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "games_period_scores" CASCADE;
  DROP TABLE "games_change_log" CASCADE;
  DROP TABLE "games" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_games_fk";
  
  DROP INDEX "payload_locked_documents_rels_games_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "games_id";
  DROP TYPE "public"."enum_games_status";
  DROP TYPE "public"."enum_games_publish_state";
  DROP TYPE "public"."enum_games_forfeit_outcome";`)
}
