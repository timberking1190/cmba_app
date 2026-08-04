import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_email_send_log_category" AS ENUM('report_request', 'contested', 'schedule_change', 'announcement', 'assignment', 'weekly_digest', 'recognition', 'cert_reminder', 'score_reminder', 'score_report', 'guardian', 'password_reset', 'verify', 'email_otp', 'test', 'other');
  CREATE TYPE "public"."enum_email_send_log_status" AS ENUM('sent', 'failed');
  CREATE TYPE "public"."enum_email_send_log_transport" AS ENUM('ses', 'json');
  CREATE TABLE "email_send_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_email_send_log_category" NOT NULL,
  	"subject" varchar,
  	"recipient_hash" varchar,
  	"recipient_domain" varchar,
  	"recipient_count" numeric DEFAULT 1,
  	"status" "enum_email_send_log_status" NOT NULL,
  	"transport" "enum_email_send_log_transport" NOT NULL,
  	"error_code" varchar,
  	"error_message" varchar,
  	"sent_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_send_log_id" integer;
  CREATE INDEX "email_send_log_category_idx" ON "email_send_log" USING btree ("category");
  CREATE INDEX "email_send_log_recipient_hash_idx" ON "email_send_log" USING btree ("recipient_hash");
  CREATE INDEX "email_send_log_recipient_domain_idx" ON "email_send_log" USING btree ("recipient_domain");
  CREATE INDEX "email_send_log_status_idx" ON "email_send_log" USING btree ("status");
  CREATE INDEX "email_send_log_sent_at_idx" ON "email_send_log" USING btree ("sent_at");
  CREATE INDEX "email_send_log_updated_at_idx" ON "email_send_log" USING btree ("updated_at");
  CREATE INDEX "email_send_log_created_at_idx" ON "email_send_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_send_log_fk" FOREIGN KEY ("email_send_log_id") REFERENCES "public"."email_send_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_email_send_log_id_idx" ON "payload_locked_documents_rels" USING btree ("email_send_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_send_log" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "email_send_log" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_send_log_fk";
  
  DROP INDEX "payload_locked_documents_rels_email_send_log_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_send_log_id";
  DROP TYPE "public"."enum_email_send_log_category";
  DROP TYPE "public"."enum_email_send_log_status";
  DROP TYPE "public"."enum_email_send_log_transport";`)
}
