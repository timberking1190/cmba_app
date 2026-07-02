import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_season_surveys_questions_type" AS ENUM('rating', 'choice', 'text');
  CREATE TYPE "public"."enum_season_surveys_status" AS ENUM('draft', 'open', 'closed');
  CREATE TABLE "season_surveys_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "season_surveys_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"prompt" varchar NOT NULL,
  	"type" "enum_season_surveys_questions_type" DEFAULT 'rating' NOT NULL
  );
  
  CREATE TABLE "season_surveys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"intro" varchar,
  	"season_id" integer,
  	"status" "enum_season_surveys_status" DEFAULT 'draft' NOT NULL,
  	"show_results" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "survey_responses_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "survey_responses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"survey_id" integer NOT NULL,
  	"respondent_id" integer,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "season_surveys_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "survey_responses_id" integer;
  ALTER TABLE "season_surveys_questions_options" ADD CONSTRAINT "season_surveys_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."season_surveys_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "season_surveys_questions" ADD CONSTRAINT "season_surveys_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."season_surveys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "season_surveys" ADD CONSTRAINT "season_surveys_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "survey_responses_answers" ADD CONSTRAINT "survey_responses_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."survey_responses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_season_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."season_surveys"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "season_surveys_questions_options_order_idx" ON "season_surveys_questions_options" USING btree ("_order");
  CREATE INDEX "season_surveys_questions_options_parent_id_idx" ON "season_surveys_questions_options" USING btree ("_parent_id");
  CREATE INDEX "season_surveys_questions_order_idx" ON "season_surveys_questions" USING btree ("_order");
  CREATE INDEX "season_surveys_questions_parent_id_idx" ON "season_surveys_questions" USING btree ("_parent_id");
  CREATE INDEX "season_surveys_season_idx" ON "season_surveys" USING btree ("season_id");
  CREATE INDEX "season_surveys_status_idx" ON "season_surveys" USING btree ("status");
  CREATE INDEX "season_surveys_updated_at_idx" ON "season_surveys" USING btree ("updated_at");
  CREATE INDEX "season_surveys_created_at_idx" ON "season_surveys" USING btree ("created_at");
  CREATE INDEX "survey_responses_answers_order_idx" ON "survey_responses_answers" USING btree ("_order");
  CREATE INDEX "survey_responses_answers_parent_id_idx" ON "survey_responses_answers" USING btree ("_parent_id");
  CREATE INDEX "survey_responses_survey_idx" ON "survey_responses" USING btree ("survey_id");
  CREATE INDEX "survey_responses_respondent_idx" ON "survey_responses" USING btree ("respondent_id");
  CREATE INDEX "survey_responses_updated_at_idx" ON "survey_responses" USING btree ("updated_at");
  CREATE INDEX "survey_responses_created_at_idx" ON "survey_responses" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_season_surveys_fk" FOREIGN KEY ("season_surveys_id") REFERENCES "public"."season_surveys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_survey_responses_fk" FOREIGN KEY ("survey_responses_id") REFERENCES "public"."survey_responses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_season_surveys_id_idx" ON "payload_locked_documents_rels" USING btree ("season_surveys_id");
  CREATE INDEX "payload_locked_documents_rels_survey_responses_id_idx" ON "payload_locked_documents_rels" USING btree ("survey_responses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "season_surveys_questions_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "season_surveys_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "season_surveys" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "survey_responses_answers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "survey_responses" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "season_surveys_questions_options" CASCADE;
  DROP TABLE "season_surveys_questions" CASCADE;
  DROP TABLE "season_surveys" CASCADE;
  DROP TABLE "survey_responses_answers" CASCADE;
  DROP TABLE "survey_responses" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_season_surveys_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_survey_responses_fk";
  
  DROP INDEX "payload_locked_documents_rels_season_surveys_id_idx";
  DROP INDEX "payload_locked_documents_rels_survey_responses_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "season_surveys_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "survey_responses_id";
  DROP TYPE "public"."enum_season_surveys_questions_type";
  DROP TYPE "public"."enum_season_surveys_status";`)
}
