import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_recognitions_kind" AS ENUM('player_of_game', 'shout_out', 'sportsmanship', 'coach_of_month', 'parent_volunteer', 'milestone');
  CREATE TYPE "public"."enum_recognitions_moderation_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TABLE "recognitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_recognitions_kind" NOT NULL,
  	"subject_id" integer NOT NULL,
  	"nominated_by_id" integer NOT NULL,
  	"team_id" integer,
  	"message" varchar,
  	"moderation_status" "enum_recognitions_moderation_status" DEFAULT 'pending' NOT NULL,
  	"moderated_by_id" integer,
  	"moderated_at" timestamp(3) with time zone,
  	"subject_is_minor" boolean DEFAULT false,
  	"awards_badge_id" integer,
  	"flagged" boolean DEFAULT false,
  	"flag_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "consents_recognition_surfacing" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "consents_progress_sharing" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "consents_appear_on_leaderboard" boolean DEFAULT false;
  ALTER TABLE "consent_records" ADD COLUMN "recognition_surfacing" boolean DEFAULT false;
  ALTER TABLE "consent_records" ADD COLUMN "progress_sharing" boolean DEFAULT false;
  ALTER TABLE "consent_records" ADD COLUMN "appear_on_leaderboard" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "recognitions_id" integer;
  ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_nominated_by_id_users_id_fk" FOREIGN KEY ("nominated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_moderated_by_id_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_awards_badge_id_badges_id_fk" FOREIGN KEY ("awards_badge_id") REFERENCES "public"."badges"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "recognitions_subject_idx" ON "recognitions" USING btree ("subject_id");
  CREATE INDEX "recognitions_nominated_by_idx" ON "recognitions" USING btree ("nominated_by_id");
  CREATE INDEX "recognitions_team_idx" ON "recognitions" USING btree ("team_id");
  CREATE INDEX "recognitions_moderated_by_idx" ON "recognitions" USING btree ("moderated_by_id");
  CREATE INDEX "recognitions_awards_badge_idx" ON "recognitions" USING btree ("awards_badge_id");
  CREATE INDEX "recognitions_updated_at_idx" ON "recognitions" USING btree ("updated_at");
  CREATE INDEX "recognitions_created_at_idx" ON "recognitions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recognitions_fk" FOREIGN KEY ("recognitions_id") REFERENCES "public"."recognitions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_recognitions_id_idx" ON "payload_locked_documents_rels" USING btree ("recognitions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "recognitions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "recognitions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recognitions_fk";
  
  DROP INDEX "payload_locked_documents_rels_recognitions_id_idx";
  ALTER TABLE "users" DROP COLUMN "consents_recognition_surfacing";
  ALTER TABLE "users" DROP COLUMN "consents_progress_sharing";
  ALTER TABLE "users" DROP COLUMN "consents_appear_on_leaderboard";
  ALTER TABLE "consent_records" DROP COLUMN "recognition_surfacing";
  ALTER TABLE "consent_records" DROP COLUMN "progress_sharing";
  ALTER TABLE "consent_records" DROP COLUMN "appear_on_leaderboard";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "recognitions_id";
  DROP TYPE "public"."enum_recognitions_kind";
  DROP TYPE "public"."enum_recognitions_moderation_status";`)
}
