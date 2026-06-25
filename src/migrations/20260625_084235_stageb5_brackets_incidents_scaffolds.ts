import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_playoff_brackets_format" AS ENUM('single_elim', 'double_elim');
  CREATE TYPE "public"."enum_playoff_brackets_status" AS ENUM('draft', 'published', 'complete');
  CREATE TYPE "public"."enum_playoff_brackets_publish_state" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_bracket_series_feeds_into_slot" AS ENUM('home', 'away');
  CREATE TYPE "public"."enum_sanctions_type" AS ENUM('suspension', 'warning', 'technical_accumulation', 'ejection');
  CREATE TYPE "public"."enum_sanctions_status" AS ENUM('active', 'served', 'overturned');
  CREATE TYPE "public"."enum_availability_response" AS ENUM('yes', 'no', 'maybe', 'unknown');
  CREATE TYPE "public"."enum_game_incidents_filed_by_role" AS ENUM('rep', 'coach', 'official', 'admin');
  CREATE TYPE "public"."enum_game_incidents_type" AS ENUM('injury', 'conduct', 'ejection', 'other');
  CREATE TYPE "public"."enum_game_incidents_status" AS ENUM('new', 'reviewing', 'closed');
  CREATE TABLE "playoff_brackets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"division_id" integer NOT NULL,
  	"season_id" integer,
  	"format" "enum_playoff_brackets_format" DEFAULT 'single_elim' NOT NULL,
  	"status" "enum_playoff_brackets_status" DEFAULT 'draft',
  	"seed_snapshot" jsonb,
  	"seeded_at" timestamp(3) with time zone,
  	"publish_state" "enum_playoff_brackets_publish_state" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bracket_series" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bracket_id" integer NOT NULL,
  	"round" numeric NOT NULL,
  	"slot" numeric NOT NULL,
  	"home_seed" numeric,
  	"away_seed" numeric,
  	"home_team_id" integer,
  	"away_team_id" integer,
  	"game_id" integer,
  	"feeds_into_id" integer,
  	"feeds_into_slot" "enum_bracket_series_feeds_into_slot",
  	"is_losers_bracket" boolean DEFAULT false,
  	"winner_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sanctions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject_membership_id" integer,
  	"game_id" integer,
  	"type" "enum_sanctions_type",
  	"games_suspended" numeric,
  	"status" "enum_sanctions_status" DEFAULT 'active',
  	"notes" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "availability" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membership_id" integer NOT NULL,
  	"game_id" integer NOT NULL,
  	"response" "enum_availability_response" DEFAULT 'unknown',
  	"note" varchar,
  	"responded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "player_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"team_id" integer,
  	"membership_id" integer NOT NULL,
  	"points" numeric,
  	"fouls" numeric,
  	"rebounds" numeric,
  	"assists" numeric,
  	"minutes" numeric,
  	"entered_by_id" integer,
  	"enabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "game_incidents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"filed_by_id" integer NOT NULL,
  	"filed_by_role" "enum_game_incidents_filed_by_role" DEFAULT 'rep' NOT NULL,
  	"type" "enum_game_incidents_type" NOT NULL,
  	"involved_team_id" integer,
  	"description" varchar NOT NULL,
  	"occurred_at" timestamp(3) with time zone,
  	"attachment_id" integer,
  	"status" "enum_game_incidents_status" DEFAULT 'new',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "playoff_brackets_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bracket_series_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sanctions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "availability_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "player_stats_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_incidents_id" integer;
  ALTER TABLE "playoff_brackets" ADD CONSTRAINT "playoff_brackets_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "playoff_brackets" ADD CONSTRAINT "playoff_brackets_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_bracket_id_playoff_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."playoff_brackets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_feeds_into_id_bracket_series_id_fk" FOREIGN KEY ("feeds_into_id") REFERENCES "public"."bracket_series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bracket_series" ADD CONSTRAINT "bracket_series_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_subject_membership_id_team_memberships_id_fk" FOREIGN KEY ("subject_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability" ADD CONSTRAINT "availability_membership_id_team_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability" ADD CONSTRAINT "availability_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_membership_id_team_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_entered_by_id_users_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_incidents" ADD CONSTRAINT "game_incidents_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_incidents" ADD CONSTRAINT "game_incidents_filed_by_id_users_id_fk" FOREIGN KEY ("filed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_incidents" ADD CONSTRAINT "game_incidents_involved_team_id_teams_id_fk" FOREIGN KEY ("involved_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_incidents" ADD CONSTRAINT "game_incidents_attachment_id_incident_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."incident_files"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "playoff_brackets_division_idx" ON "playoff_brackets" USING btree ("division_id");
  CREATE INDEX "playoff_brackets_season_idx" ON "playoff_brackets" USING btree ("season_id");
  CREATE INDEX "playoff_brackets_updated_at_idx" ON "playoff_brackets" USING btree ("updated_at");
  CREATE INDEX "playoff_brackets_created_at_idx" ON "playoff_brackets" USING btree ("created_at");
  CREATE INDEX "bracket_series_bracket_idx" ON "bracket_series" USING btree ("bracket_id");
  CREATE INDEX "bracket_series_home_team_idx" ON "bracket_series" USING btree ("home_team_id");
  CREATE INDEX "bracket_series_away_team_idx" ON "bracket_series" USING btree ("away_team_id");
  CREATE INDEX "bracket_series_game_idx" ON "bracket_series" USING btree ("game_id");
  CREATE INDEX "bracket_series_feeds_into_idx" ON "bracket_series" USING btree ("feeds_into_id");
  CREATE INDEX "bracket_series_winner_idx" ON "bracket_series" USING btree ("winner_id");
  CREATE INDEX "bracket_series_updated_at_idx" ON "bracket_series" USING btree ("updated_at");
  CREATE INDEX "bracket_series_created_at_idx" ON "bracket_series" USING btree ("created_at");
  CREATE INDEX "sanctions_subject_membership_idx" ON "sanctions" USING btree ("subject_membership_id");
  CREATE INDEX "sanctions_game_idx" ON "sanctions" USING btree ("game_id");
  CREATE INDEX "sanctions_updated_at_idx" ON "sanctions" USING btree ("updated_at");
  CREATE INDEX "availability_membership_idx" ON "availability" USING btree ("membership_id");
  CREATE INDEX "availability_game_idx" ON "availability" USING btree ("game_id");
  CREATE INDEX "availability_updated_at_idx" ON "availability" USING btree ("updated_at");
  CREATE INDEX "availability_created_at_idx" ON "availability" USING btree ("created_at");
  CREATE UNIQUE INDEX "membership_game_idx" ON "availability" USING btree ("membership_id","game_id");
  CREATE INDEX "player_stats_game_idx" ON "player_stats" USING btree ("game_id");
  CREATE INDEX "player_stats_team_idx" ON "player_stats" USING btree ("team_id");
  CREATE INDEX "player_stats_membership_idx" ON "player_stats" USING btree ("membership_id");
  CREATE INDEX "player_stats_entered_by_idx" ON "player_stats" USING btree ("entered_by_id");
  CREATE INDEX "player_stats_updated_at_idx" ON "player_stats" USING btree ("updated_at");
  CREATE INDEX "player_stats_created_at_idx" ON "player_stats" USING btree ("created_at");
  CREATE INDEX "game_incidents_game_idx" ON "game_incidents" USING btree ("game_id");
  CREATE INDEX "game_incidents_filed_by_idx" ON "game_incidents" USING btree ("filed_by_id");
  CREATE INDEX "game_incidents_involved_team_idx" ON "game_incidents" USING btree ("involved_team_id");
  CREATE INDEX "game_incidents_attachment_idx" ON "game_incidents" USING btree ("attachment_id");
  CREATE INDEX "game_incidents_updated_at_idx" ON "game_incidents" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_playoff_brackets_fk" FOREIGN KEY ("playoff_brackets_id") REFERENCES "public"."playoff_brackets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bracket_series_fk" FOREIGN KEY ("bracket_series_id") REFERENCES "public"."bracket_series"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sanctions_fk" FOREIGN KEY ("sanctions_id") REFERENCES "public"."sanctions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_availability_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_player_stats_fk" FOREIGN KEY ("player_stats_id") REFERENCES "public"."player_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_incidents_fk" FOREIGN KEY ("game_incidents_id") REFERENCES "public"."game_incidents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_playoff_brackets_id_idx" ON "payload_locked_documents_rels" USING btree ("playoff_brackets_id");
  CREATE INDEX "payload_locked_documents_rels_bracket_series_id_idx" ON "payload_locked_documents_rels" USING btree ("bracket_series_id");
  CREATE INDEX "payload_locked_documents_rels_sanctions_id_idx" ON "payload_locked_documents_rels" USING btree ("sanctions_id");
  CREATE INDEX "payload_locked_documents_rels_availability_id_idx" ON "payload_locked_documents_rels" USING btree ("availability_id");
  CREATE INDEX "payload_locked_documents_rels_player_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("player_stats_id");
  CREATE INDEX "payload_locked_documents_rels_game_incidents_id_idx" ON "payload_locked_documents_rels" USING btree ("game_incidents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "playoff_brackets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bracket_series" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sanctions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "availability" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "player_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_incidents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "playoff_brackets" CASCADE;
  DROP TABLE "bracket_series" CASCADE;
  DROP TABLE "sanctions" CASCADE;
  DROP TABLE "availability" CASCADE;
  DROP TABLE "player_stats" CASCADE;
  DROP TABLE "game_incidents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_playoff_brackets_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bracket_series_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sanctions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_availability_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_player_stats_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_incidents_fk";
  
  DROP INDEX "payload_locked_documents_rels_playoff_brackets_id_idx";
  DROP INDEX "payload_locked_documents_rels_bracket_series_id_idx";
  DROP INDEX "payload_locked_documents_rels_sanctions_id_idx";
  DROP INDEX "payload_locked_documents_rels_availability_id_idx";
  DROP INDEX "payload_locked_documents_rels_player_stats_id_idx";
  DROP INDEX "payload_locked_documents_rels_game_incidents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "playoff_brackets_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bracket_series_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sanctions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "availability_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "player_stats_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_incidents_id";
  DROP TYPE "public"."enum_playoff_brackets_format";
  DROP TYPE "public"."enum_playoff_brackets_status";
  DROP TYPE "public"."enum_playoff_brackets_publish_state";
  DROP TYPE "public"."enum_bracket_series_feeds_into_slot";
  DROP TYPE "public"."enum_sanctions_type";
  DROP TYPE "public"."enum_sanctions_status";
  DROP TYPE "public"."enum_availability_response";
  DROP TYPE "public"."enum_game_incidents_filed_by_role";
  DROP TYPE "public"."enum_game_incidents_type";
  DROP TYPE "public"."enum_game_incidents_status";`)
}
