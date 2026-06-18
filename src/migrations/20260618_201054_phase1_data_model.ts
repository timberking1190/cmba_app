import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_certification_types_applies_to_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  CREATE TYPE "public"."enum_certification_types_required_for_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  CREATE TYPE "public"."enum_certification_types_category" AS ENUM('coach', 'official', 'compliance', 'medical');
  CREATE TYPE "public"."enum_certifications_status" AS ENUM('pending-verification', 'valid', 'expiring', 'expired');
  CREATE TYPE "public"."enum_courses_required_for_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  CREATE TYPE "public"."enum_pathways_audience" AS ENUM('coach', 'official');
  CREATE TYPE "public"."enum_consent_records_kind" AS ENUM('initial', 'reconsent');
  CREATE TABLE "clubs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"short_name" varchar,
  	"logo_id" integer,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "clubs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "certification_types_applies_to_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_certification_types_applies_to_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "certification_types_required_for_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_certification_types_required_for_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "certification_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_certification_types_category" NOT NULL,
  	"validity_months" numeric,
  	"is_required" boolean DEFAULT false,
  	"renewal_url" varchar,
  	"related_course_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "certifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"type_id" integer NOT NULL,
  	"status" "enum_certifications_status" DEFAULT 'pending-verification',
  	"issue_date" timestamp(3) with time zone,
  	"expiry_date" timestamp(3) with time zone,
  	"certificate_file_id" integer,
  	"issuing_body" varchar,
  	"credential_id" varchar,
  	"verified_by_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "courses_required_for_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_courses_required_for_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "courses_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "courses_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "courses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"provider" varchar,
  	"format" varchar,
  	"level" varchar,
  	"cost" varchar,
  	"duration" varchar,
  	"target_audience" varchar,
  	"register_url" varchar,
  	"mandatory" boolean DEFAULT false,
  	"related_certification_type_id" integer,
  	"external_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pathways_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric NOT NULL,
  	"xp_reward" numeric DEFAULT 0
  );
  
  CREATE TABLE "pathways" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"audience" "enum_pathways_audience" NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pathways_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"certification_types_id" integer
  );
  
  CREATE TABLE "consent_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"kind" "enum_consent_records_kind" NOT NULL,
  	"is_minor" boolean DEFAULT false,
  	"terms_version" varchar,
  	"privacy_version" varchar,
  	"guardian_consent_version" varchar,
  	"marketing_opt_in" boolean DEFAULT false,
  	"photo_opt_in" boolean DEFAULT false,
  	"accepted_at" timestamp(3) with time zone NOT NULL,
  	"accepted_ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "policy_versions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"terms_version" varchar DEFAULT '2026-06-01' NOT NULL,
  	"privacy_version" varchar DEFAULT '2026-06-01' NOT NULL,
  	"guardian_consent_version" varchar DEFAULT '2026-06-01' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "is_minor" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "club_id" integer;
  ALTER TABLE "users" ADD COLUMN "consents_terms_version" varchar;
  ALTER TABLE "users" ADD COLUMN "consents_privacy_version" varchar;
  ALTER TABLE "users" ADD COLUMN "consents_guardian_consent_version" varchar;
  ALTER TABLE "users" ADD COLUMN "consents_accepted_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "consents_accepted_ip" varchar;
  ALTER TABLE "users" ADD COLUMN "consents_marketing_opt_in" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "consents_photo_opt_in" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "guardian_name" varchar;
  ALTER TABLE "users" ADD COLUMN "guardian_email" varchar;
  ALTER TABLE "users" ADD COLUMN "guardian_phone" varchar;
  ALTER TABLE "users" ADD COLUMN "guardian_relationship" varchar;
  ALTER TABLE "users" ADD COLUMN "guardian_confirmed" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "guardian_confirmation_token" varchar;
  ALTER TABLE "users" ADD COLUMN "notification_prefs_certification_reminders" boolean DEFAULT true;
  ALTER TABLE "users" ADD COLUMN "notification_prefs_general_updates" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "clubs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "certification_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "certifications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "courses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pathways_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "consent_records_id" integer;
  ALTER TABLE "clubs" ADD CONSTRAINT "clubs_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clubs_rels" ADD CONSTRAINT "clubs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clubs_rels" ADD CONSTRAINT "clubs_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_types_applies_to_roles" ADD CONSTRAINT "certification_types_applies_to_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."certification_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_types_required_for_roles" ADD CONSTRAINT "certification_types_required_for_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."certification_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_types" ADD CONSTRAINT "certification_types_related_course_id_courses_id_fk" FOREIGN KEY ("related_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certifications" ADD CONSTRAINT "certifications_type_id_certification_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."certification_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certifications" ADD CONSTRAINT "certifications_certificate_file_id_certificate_files_id_fk" FOREIGN KEY ("certificate_file_id") REFERENCES "public"."certificate_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certifications" ADD CONSTRAINT "certifications_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_required_for_roles" ADD CONSTRAINT "courses_required_for_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_modules" ADD CONSTRAINT "courses_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_tags" ADD CONSTRAINT "courses_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_related_certification_type_id_certification_types_id_fk" FOREIGN KEY ("related_certification_type_id") REFERENCES "public"."certification_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pathways_stages" ADD CONSTRAINT "pathways_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pathways"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pathways_rels" ADD CONSTRAINT "pathways_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pathways"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pathways_rels" ADD CONSTRAINT "pathways_rels_certification_types_fk" FOREIGN KEY ("certification_types_id") REFERENCES "public"."certification_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "clubs_logo_idx" ON "clubs" USING btree ("logo_id");
  CREATE INDEX "clubs_updated_at_idx" ON "clubs" USING btree ("updated_at");
  CREATE INDEX "clubs_created_at_idx" ON "clubs" USING btree ("created_at");
  CREATE INDEX "clubs_rels_order_idx" ON "clubs_rels" USING btree ("order");
  CREATE INDEX "clubs_rels_parent_idx" ON "clubs_rels" USING btree ("parent_id");
  CREATE INDEX "clubs_rels_path_idx" ON "clubs_rels" USING btree ("path");
  CREATE INDEX "clubs_rels_users_id_idx" ON "clubs_rels" USING btree ("users_id");
  CREATE INDEX "certification_types_applies_to_roles_order_idx" ON "certification_types_applies_to_roles" USING btree ("order");
  CREATE INDEX "certification_types_applies_to_roles_parent_idx" ON "certification_types_applies_to_roles" USING btree ("parent_id");
  CREATE INDEX "certification_types_required_for_roles_order_idx" ON "certification_types_required_for_roles" USING btree ("order");
  CREATE INDEX "certification_types_required_for_roles_parent_idx" ON "certification_types_required_for_roles" USING btree ("parent_id");
  CREATE INDEX "certification_types_related_course_idx" ON "certification_types" USING btree ("related_course_id");
  CREATE INDEX "certification_types_updated_at_idx" ON "certification_types" USING btree ("updated_at");
  CREATE INDEX "certification_types_created_at_idx" ON "certification_types" USING btree ("created_at");
  CREATE INDEX "certifications_user_idx" ON "certifications" USING btree ("user_id");
  CREATE INDEX "certifications_type_idx" ON "certifications" USING btree ("type_id");
  CREATE INDEX "certifications_certificate_file_idx" ON "certifications" USING btree ("certificate_file_id");
  CREATE INDEX "certifications_verified_by_idx" ON "certifications" USING btree ("verified_by_id");
  CREATE INDEX "certifications_updated_at_idx" ON "certifications" USING btree ("updated_at");
  CREATE INDEX "certifications_created_at_idx" ON "certifications" USING btree ("created_at");
  CREATE INDEX "courses_required_for_roles_order_idx" ON "courses_required_for_roles" USING btree ("order");
  CREATE INDEX "courses_required_for_roles_parent_idx" ON "courses_required_for_roles" USING btree ("parent_id");
  CREATE INDEX "courses_modules_order_idx" ON "courses_modules" USING btree ("_order");
  CREATE INDEX "courses_modules_parent_id_idx" ON "courses_modules" USING btree ("_parent_id");
  CREATE INDEX "courses_tags_order_idx" ON "courses_tags" USING btree ("_order");
  CREATE INDEX "courses_tags_parent_id_idx" ON "courses_tags" USING btree ("_parent_id");
  CREATE INDEX "courses_related_certification_type_idx" ON "courses" USING btree ("related_certification_type_id");
  CREATE INDEX "courses_external_id_idx" ON "courses" USING btree ("external_id");
  CREATE INDEX "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
  CREATE INDEX "courses_created_at_idx" ON "courses" USING btree ("created_at");
  CREATE INDEX "pathways_stages_order_idx" ON "pathways_stages" USING btree ("_order");
  CREATE INDEX "pathways_stages_parent_id_idx" ON "pathways_stages" USING btree ("_parent_id");
  CREATE INDEX "pathways_updated_at_idx" ON "pathways" USING btree ("updated_at");
  CREATE INDEX "pathways_created_at_idx" ON "pathways" USING btree ("created_at");
  CREATE INDEX "pathways_rels_order_idx" ON "pathways_rels" USING btree ("order");
  CREATE INDEX "pathways_rels_parent_idx" ON "pathways_rels" USING btree ("parent_id");
  CREATE INDEX "pathways_rels_path_idx" ON "pathways_rels" USING btree ("path");
  CREATE INDEX "pathways_rels_certification_types_id_idx" ON "pathways_rels" USING btree ("certification_types_id");
  CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id");
  CREATE INDEX "consent_records_updated_at_idx" ON "consent_records" USING btree ("updated_at");
  CREATE INDEX "consent_records_created_at_idx" ON "consent_records" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clubs_fk" FOREIGN KEY ("clubs_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_certification_types_fk" FOREIGN KEY ("certification_types_id") REFERENCES "public"."certification_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_certifications_fk" FOREIGN KEY ("certifications_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pathways_fk" FOREIGN KEY ("pathways_id") REFERENCES "public"."pathways"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consent_records_fk" FOREIGN KEY ("consent_records_id") REFERENCES "public"."consent_records"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_club_idx" ON "users" USING btree ("club_id");
  CREATE INDEX "payload_locked_documents_rels_clubs_id_idx" ON "payload_locked_documents_rels" USING btree ("clubs_id");
  CREATE INDEX "payload_locked_documents_rels_certification_types_id_idx" ON "payload_locked_documents_rels" USING btree ("certification_types_id");
  CREATE INDEX "payload_locked_documents_rels_certifications_id_idx" ON "payload_locked_documents_rels" USING btree ("certifications_id");
  CREATE INDEX "payload_locked_documents_rels_courses_id_idx" ON "payload_locked_documents_rels" USING btree ("courses_id");
  CREATE INDEX "payload_locked_documents_rels_pathways_id_idx" ON "payload_locked_documents_rels" USING btree ("pathways_id");
  CREATE INDEX "payload_locked_documents_rels_consent_records_id_idx" ON "payload_locked_documents_rels" USING btree ("consent_records_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "clubs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clubs_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_types_applies_to_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_types_required_for_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "courses_required_for_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "courses_modules" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "courses_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "courses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pathways_stages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pathways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pathways_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "consent_records" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "policy_versions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "clubs" CASCADE;
  DROP TABLE "clubs_rels" CASCADE;
  DROP TABLE "certification_types_applies_to_roles" CASCADE;
  DROP TABLE "certification_types_required_for_roles" CASCADE;
  DROP TABLE "certification_types" CASCADE;
  DROP TABLE "certifications" CASCADE;
  DROP TABLE "courses_required_for_roles" CASCADE;
  DROP TABLE "courses_modules" CASCADE;
  DROP TABLE "courses_tags" CASCADE;
  DROP TABLE "courses" CASCADE;
  DROP TABLE "pathways_stages" CASCADE;
  DROP TABLE "pathways" CASCADE;
  DROP TABLE "pathways_rels" CASCADE;
  DROP TABLE "consent_records" CASCADE;
  DROP TABLE "policy_versions" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_club_id_clubs_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_clubs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_certification_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_certifications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_courses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pathways_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_consent_records_fk";
  
  DROP INDEX "users_club_idx";
  DROP INDEX "payload_locked_documents_rels_clubs_id_idx";
  DROP INDEX "payload_locked_documents_rels_certification_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_certifications_id_idx";
  DROP INDEX "payload_locked_documents_rels_courses_id_idx";
  DROP INDEX "payload_locked_documents_rels_pathways_id_idx";
  DROP INDEX "payload_locked_documents_rels_consent_records_id_idx";
  ALTER TABLE "users" DROP COLUMN "is_minor";
  ALTER TABLE "users" DROP COLUMN "club_id";
  ALTER TABLE "users" DROP COLUMN "consents_terms_version";
  ALTER TABLE "users" DROP COLUMN "consents_privacy_version";
  ALTER TABLE "users" DROP COLUMN "consents_guardian_consent_version";
  ALTER TABLE "users" DROP COLUMN "consents_accepted_at";
  ALTER TABLE "users" DROP COLUMN "consents_accepted_ip";
  ALTER TABLE "users" DROP COLUMN "consents_marketing_opt_in";
  ALTER TABLE "users" DROP COLUMN "consents_photo_opt_in";
  ALTER TABLE "users" DROP COLUMN "guardian_name";
  ALTER TABLE "users" DROP COLUMN "guardian_email";
  ALTER TABLE "users" DROP COLUMN "guardian_phone";
  ALTER TABLE "users" DROP COLUMN "guardian_relationship";
  ALTER TABLE "users" DROP COLUMN "guardian_confirmed";
  ALTER TABLE "users" DROP COLUMN "guardian_confirmation_token";
  ALTER TABLE "users" DROP COLUMN "notification_prefs_certification_reminders";
  ALTER TABLE "users" DROP COLUMN "notification_prefs_general_updates";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "clubs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "certification_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "certifications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "courses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pathways_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "consent_records_id";
  DROP TYPE "public"."enum_certification_types_applies_to_roles";
  DROP TYPE "public"."enum_certification_types_required_for_roles";
  DROP TYPE "public"."enum_certification_types_category";
  DROP TYPE "public"."enum_certifications_status";
  DROP TYPE "public"."enum_courses_required_for_roles";
  DROP TYPE "public"."enum_pathways_audience";
  DROP TYPE "public"."enum_consent_records_kind";`)
}
