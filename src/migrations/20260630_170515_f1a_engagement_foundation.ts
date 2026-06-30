import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_badges_audience" AS ENUM('athlete', 'coach', 'official', 'parent');
  CREATE TYPE "public"."enum_badges_tier" AS ENUM('bronze', 'silver', 'gold', 'milestone');
  CREATE TYPE "public"."enum_badges_earn_kind" AS ENUM('xp_threshold', 'streak_threshold', 'verified_count', 'pathway_stage', 'recognition', 'manual');
  CREATE TYPE "public"."enum_badge_awards_awarded_via" AS ENUM('auto', 'coach_verified', 'admin_manual');
  CREATE TYPE "public"."enum_xp_events_kind" AS ENUM('login', 'challenge', 'quiz', 'drill', 'clinic', 'recognition', 'pathway_stage', 'streak_bonus', 'milestone');
  CREATE TYPE "public"."enum_xp_events_counts" AS ENUM('fun_only', 'meaningful');
  CREATE TYPE "public"."enum_streaks_streak_kind" AS ENUM('activity', 'login');
  CREATE TABLE "badges_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_badges_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "badges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"icon" varchar,
  	"tier" "enum_badges_tier" DEFAULT 'bronze' NOT NULL,
  	"earn_kind" "enum_badges_earn_kind" DEFAULT 'manual' NOT NULL,
  	"earn_config_threshold" numeric,
  	"earn_config_source_key" varchar,
  	"verification_required" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"external_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "badge_awards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"badge_id" integer NOT NULL,
  	"awarded_via" "enum_badge_awards_awarded_via" DEFAULT 'auto' NOT NULL,
  	"source_event_id" integer,
  	"verified" boolean DEFAULT false,
  	"awarded_by_id" integer,
  	"is_minor" boolean DEFAULT false,
  	"awarded_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "xp_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"amount" numeric DEFAULT 0 NOT NULL,
  	"kind" "enum_xp_events_kind" NOT NULL,
  	"counts" "enum_xp_events_counts" DEFAULT 'fun_only' NOT NULL,
  	"verified" boolean DEFAULT false,
  	"source_collection" varchar,
  	"source_doc_id" varchar,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"dedupe_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "streaks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"current_streak_days" numeric DEFAULT 0,
  	"longest_streak_days" numeric DEFAULT 0,
  	"last_active_day" timestamp(3) with time zone,
  	"streak_kind" "enum_streaks_streak_kind" DEFAULT 'activity',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "badges_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "badge_awards_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "xp_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "streaks_id" integer;
  ALTER TABLE "badges_audience" ADD CONSTRAINT "badges_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_source_event_id_xp_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."xp_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_awarded_by_id_users_id_fk" FOREIGN KEY ("awarded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "badges_audience_order_idx" ON "badges_audience" USING btree ("order");
  CREATE INDEX "badges_audience_parent_idx" ON "badges_audience" USING btree ("parent_id");
  CREATE UNIQUE INDEX "badges_slug_idx" ON "badges" USING btree ("slug");
  CREATE INDEX "badges_external_id_idx" ON "badges" USING btree ("external_id");
  CREATE INDEX "badges_updated_at_idx" ON "badges" USING btree ("updated_at");
  CREATE INDEX "badges_created_at_idx" ON "badges" USING btree ("created_at");
  CREATE INDEX "badge_awards_user_idx" ON "badge_awards" USING btree ("user_id");
  CREATE INDEX "badge_awards_badge_idx" ON "badge_awards" USING btree ("badge_id");
  CREATE INDEX "badge_awards_source_event_idx" ON "badge_awards" USING btree ("source_event_id");
  CREATE INDEX "badge_awards_awarded_by_idx" ON "badge_awards" USING btree ("awarded_by_id");
  CREATE INDEX "badge_awards_updated_at_idx" ON "badge_awards" USING btree ("updated_at");
  CREATE INDEX "badge_awards_created_at_idx" ON "badge_awards" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_badge_idx" ON "badge_awards" USING btree ("user_id","badge_id");
  CREATE INDEX "xp_events_user_idx" ON "xp_events" USING btree ("user_id");
  CREATE INDEX "xp_events_occurred_at_idx" ON "xp_events" USING btree ("occurred_at");
  CREATE INDEX "xp_events_updated_at_idx" ON "xp_events" USING btree ("updated_at");
  CREATE INDEX "xp_events_created_at_idx" ON "xp_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_dedupeKey_idx" ON "xp_events" USING btree ("user_id","dedupe_key");
  CREATE INDEX "streaks_user_idx" ON "streaks" USING btree ("user_id");
  CREATE INDEX "streaks_updated_at_idx" ON "streaks" USING btree ("updated_at");
  CREATE INDEX "streaks_created_at_idx" ON "streaks" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_idx" ON "streaks" USING btree ("user_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_badges_fk" FOREIGN KEY ("badges_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_badge_awards_fk" FOREIGN KEY ("badge_awards_id") REFERENCES "public"."badge_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_xp_events_fk" FOREIGN KEY ("xp_events_id") REFERENCES "public"."xp_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_streaks_fk" FOREIGN KEY ("streaks_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_badges_id_idx" ON "payload_locked_documents_rels" USING btree ("badges_id");
  CREATE INDEX "payload_locked_documents_rels_badge_awards_id_idx" ON "payload_locked_documents_rels" USING btree ("badge_awards_id");
  CREATE INDEX "payload_locked_documents_rels_xp_events_id_idx" ON "payload_locked_documents_rels" USING btree ("xp_events_id");
  CREATE INDEX "payload_locked_documents_rels_streaks_id_idx" ON "payload_locked_documents_rels" USING btree ("streaks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "badges_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "badges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "badge_awards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "xp_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "streaks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "badges_audience" CASCADE;
  DROP TABLE "badges" CASCADE;
  DROP TABLE "badge_awards" CASCADE;
  DROP TABLE "xp_events" CASCADE;
  DROP TABLE "streaks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_badges_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_badge_awards_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_xp_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_streaks_fk";
  
  DROP INDEX "payload_locked_documents_rels_badges_id_idx";
  DROP INDEX "payload_locked_documents_rels_badge_awards_id_idx";
  DROP INDEX "payload_locked_documents_rels_xp_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_streaks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "badges_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "badge_awards_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "xp_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "streaks_id";
  DROP TYPE "public"."enum_badges_audience";
  DROP TYPE "public"."enum_badges_tier";
  DROP TYPE "public"."enum_badges_earn_kind";
  DROP TYPE "public"."enum_badge_awards_awarded_via";
  DROP TYPE "public"."enum_xp_events_kind";
  DROP TYPE "public"."enum_xp_events_counts";
  DROP TYPE "public"."enum_streaks_streak_kind";`)
}
