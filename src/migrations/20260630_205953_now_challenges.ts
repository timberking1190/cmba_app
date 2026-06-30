import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_challenges_skill" AS ENUM('shooting', 'dribbling', 'passing', 'defense', 'conditioning');
  CREATE TABLE "challenges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"skill" "enum_challenges_skill",
  	"age_group" varchar,
  	"instructions" varchar,
  	"xp_reward" numeric DEFAULT 100,
  	"requires_verification" boolean DEFAULT true,
  	"active" boolean DEFAULT true,
  	"external_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "challenge_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"challenge_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"result" varchar,
  	"notes" varchar,
  	"verified" boolean DEFAULT false,
  	"verified_by_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"submitted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "challenges_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "challenge_submissions_id" integer;
  ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "challenges_slug_idx" ON "challenges" USING btree ("slug");
  CREATE INDEX "challenges_external_id_idx" ON "challenges" USING btree ("external_id");
  CREATE INDEX "challenges_updated_at_idx" ON "challenges" USING btree ("updated_at");
  CREATE INDEX "challenges_created_at_idx" ON "challenges" USING btree ("created_at");
  CREATE INDEX "challenge_submissions_challenge_idx" ON "challenge_submissions" USING btree ("challenge_id");
  CREATE INDEX "challenge_submissions_user_idx" ON "challenge_submissions" USING btree ("user_id");
  CREATE INDEX "challenge_submissions_verified_by_idx" ON "challenge_submissions" USING btree ("verified_by_id");
  CREATE INDEX "challenge_submissions_updated_at_idx" ON "challenge_submissions" USING btree ("updated_at");
  CREATE INDEX "challenge_submissions_created_at_idx" ON "challenge_submissions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_challenges_fk" FOREIGN KEY ("challenges_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_challenge_submissions_fk" FOREIGN KEY ("challenge_submissions_id") REFERENCES "public"."challenge_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("challenges_id");
  CREATE INDEX "payload_locked_documents_rels_challenge_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("challenge_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "challenges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "challenge_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "challenges" CASCADE;
  DROP TABLE "challenge_submissions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_challenges_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_challenge_submissions_fk";
  
  DROP INDEX "payload_locked_documents_rels_challenges_id_idx";
  DROP INDEX "payload_locked_documents_rels_challenge_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "challenges_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "challenge_submissions_id";
  DROP TYPE "public"."enum_challenges_skill";`)
}
