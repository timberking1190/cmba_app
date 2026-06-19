import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_incident_log_severity" AS ENUM('low', 'medium', 'high', 'critical');
  CREATE TYPE "public"."enum_incident_log_status" AS ENUM('open', 'investigating', 'contained', 'closed');
  CREATE TABLE "incident_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"severity" "enum_incident_log_severity" DEFAULT 'low' NOT NULL,
  	"status" "enum_incident_log_status" DEFAULT 'open' NOT NULL,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"discovered_at" timestamp(3) with time zone,
  	"real_risk_of_significant_harm" boolean DEFAULT false,
  	"opc_notified_at" timestamp(3) with time zone,
  	"individuals_notified_at" timestamp(3) with time zone,
  	"affected_count" numeric,
  	"description" varchar,
  	"remediation" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"privacy_officer_name" varchar,
  	"privacy_officer_email" varchar,
  	"privacy_officer_phone" varchar,
  	"contact_email" varchar DEFAULT 'league@cmba.ab.ca',
  	"contact_phone" varchar DEFAULT '(403) 804-3396',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "legal_hold" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "incident_log_id" integer;
  CREATE INDEX "incident_log_updated_at_idx" ON "incident_log" USING btree ("updated_at");
  CREATE INDEX "incident_log_created_at_idx" ON "incident_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_incident_log_fk" FOREIGN KEY ("incident_log_id") REFERENCES "public"."incident_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_incident_log_id_idx" ON "payload_locked_documents_rels" USING btree ("incident_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "incident_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "incident_log" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_incident_log_fk";
  
  DROP INDEX "payload_locked_documents_rels_incident_log_id_idx";
  ALTER TABLE "users" DROP COLUMN "legal_hold";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "incident_log_id";
  DROP TYPE "public"."enum_incident_log_severity";
  DROP TYPE "public"."enum_incident_log_status";`)
}
