import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_reports_report_type" AS ENUM('incident', 'ejection', 'concern', 'compliment');
  CREATE TYPE "public"."enum_game_reports_status" AS ENUM('new', 'reviewing', 'closed');
  CREATE TABLE "game_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"report_type" "enum_game_reports_report_type" NOT NULL,
  	"reporter_name" varchar NOT NULL,
  	"reporter_email" varchar NOT NULL,
  	"role" varchar,
  	"game_date" timestamp(3) with time zone,
  	"division" varchar,
  	"home_team" varchar,
  	"away_team" varchar,
  	"location" varchar,
  	"description" varchar NOT NULL,
  	"status" "enum_game_reports_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_reports_id" integer;
  CREATE INDEX "game_reports_updated_at_idx" ON "game_reports" USING btree ("updated_at");
  CREATE INDEX "game_reports_created_at_idx" ON "game_reports" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_reports_fk" FOREIGN KEY ("game_reports_id") REFERENCES "public"."game_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_game_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("game_reports_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "game_reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_reports_fk";
  
  DROP INDEX "payload_locked_documents_rels_game_reports_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_reports_id";
  DROP TYPE "public"."enum_game_reports_report_type";
  DROP TYPE "public"."enum_game_reports_status";`)
}
