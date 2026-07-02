import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_certifications_source" AS ENUM('registration', 'import');
  CREATE TYPE "public"."enum_passes_platform" AS ENUM('apple', 'google', 'print');
  CREATE TYPE "public"."enum_passes_status" AS ENUM('requested', 'issued', 'revoked', 'superseded');
  CREATE TYPE "public"."enum_verification_tokens_channel" AS ENUM('wallet', 'print');
  CREATE TYPE "public"."enum_scans_result" AS ENUM('valid', 'expired_credentials', 'revoked', 'revoked_token', 'not_found', 'not_scannable', 'token_expired', 'invalid_signature', 'member_inactive', 'rate_limited');
  CREATE TYPE "public"."enum_scans_method" AS ENUM('qr', 'serial');
  CREATE TYPE "public"."enum_import_field_mappings_transform" AS ENUM('none', 'date_mdy', 'date_ymd', 'status_map', 'trim_upper');
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'league_official' BEFORE 'club_admin';
  ALTER TYPE "public"."enum_certification_types_applies_to_roles" ADD VALUE 'league_official' BEFORE 'club_admin';
  ALTER TYPE "public"."enum_certification_types_required_for_roles" ADD VALUE 'league_official' BEFORE 'club_admin';
  ALTER TYPE "public"."enum_courses_required_for_roles" ADD VALUE 'league_official' BEFORE 'club_admin';
  CREATE TABLE "passes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"platform" "enum_passes_platform" NOT NULL,
  	"serial_number" varchar NOT NULL,
  	"current_jti" varchar,
  	"apple_auth_token_hash" varchar,
  	"status" "enum_passes_status" DEFAULT 'requested' NOT NULL,
  	"season" varchar NOT NULL,
  	"issued_at" timestamp(3) with time zone,
  	"revoked_at" timestamp(3) with time zone,
  	"revoke_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "verification_tokens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"jti" varchar NOT NULL,
  	"pass_id" integer NOT NULL,
  	"member_id" integer NOT NULL,
  	"channel" "enum_verification_tokens_channel" NOT NULL,
  	"kid" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"revoked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "scans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"client_uuid" varchar,
  	"scanned_by_id" integer,
  	"device_id" varchar,
  	"venue_id" integer,
  	"game_id" integer,
  	"jti" varchar,
  	"member_id" integer,
  	"result" "enum_scans_result" NOT NULL,
  	"method" "enum_scans_method" DEFAULT 'qr' NOT NULL,
  	"scanned_at" timestamp(3) with time zone NOT NULL,
  	"ip" varchar,
  	"device_info" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "scanner_devices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"device_id" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"last_seen" timestamp(3) with time zone,
  	"revoked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "apple_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"device_lib_id" varchar NOT NULL,
  	"pass_serial" varchar NOT NULL,
  	"push_token" varchar NOT NULL,
  	"pass_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wallet_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" varchar,
  	"payload" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pass_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"pass_id" integer NOT NULL,
  	"code_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"consumed_at" timestamp(3) with time zone,
  	"superseded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "client_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event" varchar NOT NULL,
  	"device_id" varchar,
  	"user_id" integer,
  	"detail" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_field_mappings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_name" varchar NOT NULL,
  	"source_column" varchar NOT NULL,
  	"target_field" varchar NOT NULL,
  	"transform" "enum_import_field_mappings_transform" DEFAULT 'none' NOT NULL,
  	"is_required" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_exceptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"import_batch_id" integer NOT NULL,
  	"row_number" numeric NOT NULL,
  	"raw_row" jsonb NOT NULL,
  	"error_code" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"resolved" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "member_card_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"verifier_min_version" varchar,
  	"serial_lookup_enabled" boolean DEFAULT true,
  	"current_season" varchar,
  	"anomaly_alerts_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "member_number" varchar;
  ALTER TABLE "users" ADD COLUMN "external_id" varchar;
  ALTER TABLE "certifications" ADD COLUMN "source" "enum_certifications_source" DEFAULT 'registration' NOT NULL;
  ALTER TABLE "certifications" ADD COLUMN "source_import_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "passes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "verification_tokens_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scans_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scanner_devices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "apple_registrations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wallet_logs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pass_claims_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "client_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_field_mappings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_exceptions_id" integer;
  ALTER TABLE "passes" ADD CONSTRAINT "passes_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scans" ADD CONSTRAINT "scans_scanned_by_id_users_id_fk" FOREIGN KEY ("scanned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scans" ADD CONSTRAINT "scans_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scans" ADD CONSTRAINT "scans_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scans" ADD CONSTRAINT "scans_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scanner_devices" ADD CONSTRAINT "scanner_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "apple_registrations" ADD CONSTRAINT "apple_registrations_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pass_claims" ADD CONSTRAINT "pass_claims_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "client_events" ADD CONSTRAINT "client_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_exceptions" ADD CONSTRAINT "import_exceptions_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "passes_member_idx" ON "passes" USING btree ("member_id");
  CREATE UNIQUE INDEX "passes_serial_number_idx" ON "passes" USING btree ("serial_number");
  CREATE INDEX "passes_updated_at_idx" ON "passes" USING btree ("updated_at");
  CREATE INDEX "passes_created_at_idx" ON "passes" USING btree ("created_at");
  CREATE UNIQUE INDEX "verification_tokens_jti_idx" ON "verification_tokens" USING btree ("jti");
  CREATE INDEX "verification_tokens_pass_idx" ON "verification_tokens" USING btree ("pass_id");
  CREATE INDEX "verification_tokens_member_idx" ON "verification_tokens" USING btree ("member_id");
  CREATE INDEX "verification_tokens_updated_at_idx" ON "verification_tokens" USING btree ("updated_at");
  CREATE INDEX "verification_tokens_created_at_idx" ON "verification_tokens" USING btree ("created_at");
  CREATE UNIQUE INDEX "scans_client_uuid_idx" ON "scans" USING btree ("client_uuid");
  CREATE INDEX "scans_scanned_by_idx" ON "scans" USING btree ("scanned_by_id");
  CREATE INDEX "scans_device_id_idx" ON "scans" USING btree ("device_id");
  CREATE INDEX "scans_venue_idx" ON "scans" USING btree ("venue_id");
  CREATE INDEX "scans_game_idx" ON "scans" USING btree ("game_id");
  CREATE INDEX "scans_member_idx" ON "scans" USING btree ("member_id");
  CREATE INDEX "scans_scanned_at_idx" ON "scans" USING btree ("scanned_at");
  CREATE INDEX "scans_updated_at_idx" ON "scans" USING btree ("updated_at");
  CREATE INDEX "scans_created_at_idx" ON "scans" USING btree ("created_at");
  CREATE UNIQUE INDEX "scanner_devices_device_id_idx" ON "scanner_devices" USING btree ("device_id");
  CREATE INDEX "scanner_devices_user_idx" ON "scanner_devices" USING btree ("user_id");
  CREATE INDEX "scanner_devices_updated_at_idx" ON "scanner_devices" USING btree ("updated_at");
  CREATE INDEX "scanner_devices_created_at_idx" ON "scanner_devices" USING btree ("created_at");
  CREATE INDEX "apple_registrations_device_lib_id_idx" ON "apple_registrations" USING btree ("device_lib_id");
  CREATE INDEX "apple_registrations_pass_serial_idx" ON "apple_registrations" USING btree ("pass_serial");
  CREATE INDEX "apple_registrations_pass_idx" ON "apple_registrations" USING btree ("pass_id");
  CREATE INDEX "apple_registrations_updated_at_idx" ON "apple_registrations" USING btree ("updated_at");
  CREATE INDEX "apple_registrations_created_at_idx" ON "apple_registrations" USING btree ("created_at");
  CREATE INDEX "wallet_logs_updated_at_idx" ON "wallet_logs" USING btree ("updated_at");
  CREATE INDEX "wallet_logs_created_at_idx" ON "wallet_logs" USING btree ("created_at");
  CREATE INDEX "pass_claims_pass_idx" ON "pass_claims" USING btree ("pass_id");
  CREATE INDEX "pass_claims_code_hash_idx" ON "pass_claims" USING btree ("code_hash");
  CREATE INDEX "pass_claims_updated_at_idx" ON "pass_claims" USING btree ("updated_at");
  CREATE INDEX "pass_claims_created_at_idx" ON "pass_claims" USING btree ("created_at");
  CREATE INDEX "client_events_device_id_idx" ON "client_events" USING btree ("device_id");
  CREATE INDEX "client_events_user_idx" ON "client_events" USING btree ("user_id");
  CREATE INDEX "client_events_updated_at_idx" ON "client_events" USING btree ("updated_at");
  CREATE INDEX "client_events_created_at_idx" ON "client_events" USING btree ("created_at");
  CREATE INDEX "import_field_mappings_source_name_idx" ON "import_field_mappings" USING btree ("source_name");
  CREATE INDEX "import_field_mappings_updated_at_idx" ON "import_field_mappings" USING btree ("updated_at");
  CREATE INDEX "import_field_mappings_created_at_idx" ON "import_field_mappings" USING btree ("created_at");
  CREATE INDEX "import_exceptions_import_batch_idx" ON "import_exceptions" USING btree ("import_batch_id");
  CREATE INDEX "import_exceptions_updated_at_idx" ON "import_exceptions" USING btree ("updated_at");
  CREATE INDEX "import_exceptions_created_at_idx" ON "import_exceptions" USING btree ("created_at");
  ALTER TABLE "certifications" ADD CONSTRAINT "certifications_source_import_id_import_batches_id_fk" FOREIGN KEY ("source_import_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_passes_fk" FOREIGN KEY ("passes_id") REFERENCES "public"."passes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verification_tokens_fk" FOREIGN KEY ("verification_tokens_id") REFERENCES "public"."verification_tokens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scans_fk" FOREIGN KEY ("scans_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scanner_devices_fk" FOREIGN KEY ("scanner_devices_id") REFERENCES "public"."scanner_devices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_apple_registrations_fk" FOREIGN KEY ("apple_registrations_id") REFERENCES "public"."apple_registrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallet_logs_fk" FOREIGN KEY ("wallet_logs_id") REFERENCES "public"."wallet_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pass_claims_fk" FOREIGN KEY ("pass_claims_id") REFERENCES "public"."pass_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_client_events_fk" FOREIGN KEY ("client_events_id") REFERENCES "public"."client_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_field_mappings_fk" FOREIGN KEY ("import_field_mappings_id") REFERENCES "public"."import_field_mappings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_exceptions_fk" FOREIGN KEY ("import_exceptions_id") REFERENCES "public"."import_exceptions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "users_member_number_idx" ON "users" USING btree ("member_number");
  CREATE UNIQUE INDEX "users_external_id_idx" ON "users" USING btree ("external_id");
  CREATE INDEX "certifications_source_import_idx" ON "certifications" USING btree ("source_import_id");
  CREATE INDEX "payload_locked_documents_rels_passes_id_idx" ON "payload_locked_documents_rels" USING btree ("passes_id");
  CREATE INDEX "payload_locked_documents_rels_verification_tokens_id_idx" ON "payload_locked_documents_rels" USING btree ("verification_tokens_id");
  CREATE INDEX "payload_locked_documents_rels_scans_id_idx" ON "payload_locked_documents_rels" USING btree ("scans_id");
  CREATE INDEX "payload_locked_documents_rels_scanner_devices_id_idx" ON "payload_locked_documents_rels" USING btree ("scanner_devices_id");
  CREATE INDEX "payload_locked_documents_rels_apple_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("apple_registrations_id");
  CREATE INDEX "payload_locked_documents_rels_wallet_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("wallet_logs_id");
  CREATE INDEX "payload_locked_documents_rels_pass_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("pass_claims_id");
  CREATE INDEX "payload_locked_documents_rels_client_events_id_idx" ON "payload_locked_documents_rels" USING btree ("client_events_id");
  CREATE INDEX "payload_locked_documents_rels_import_field_mappings_id_idx" ON "payload_locked_documents_rels" USING btree ("import_field_mappings_id");
  CREATE INDEX "payload_locked_documents_rels_import_exceptions_id_idx" ON "payload_locked_documents_rels" USING btree ("import_exceptions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "passes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "verification_tokens" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scanner_devices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "apple_registrations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "wallet_logs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pass_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "client_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_field_mappings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_exceptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "member_card_config" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "passes" CASCADE;
  DROP TABLE "verification_tokens" CASCADE;
  DROP TABLE "scans" CASCADE;
  DROP TABLE "scanner_devices" CASCADE;
  DROP TABLE "apple_registrations" CASCADE;
  DROP TABLE "wallet_logs" CASCADE;
  DROP TABLE "pass_claims" CASCADE;
  DROP TABLE "client_events" CASCADE;
  DROP TABLE "import_field_mappings" CASCADE;
  DROP TABLE "import_exceptions" CASCADE;
  DROP TABLE "member_card_config" CASCADE;
  ALTER TABLE "certifications" DROP CONSTRAINT "certifications_source_import_id_import_batches_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_passes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_verification_tokens_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scans_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scanner_devices_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_apple_registrations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wallet_logs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pass_claims_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_client_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_field_mappings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_exceptions_fk";
  
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  ALTER TABLE "certification_types_applies_to_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_certification_types_applies_to_roles";
  CREATE TYPE "public"."enum_certification_types_applies_to_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  ALTER TABLE "certification_types_applies_to_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_certification_types_applies_to_roles" USING "value"::"public"."enum_certification_types_applies_to_roles";
  ALTER TABLE "certification_types_required_for_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_certification_types_required_for_roles";
  CREATE TYPE "public"."enum_certification_types_required_for_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  ALTER TABLE "certification_types_required_for_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_certification_types_required_for_roles" USING "value"::"public"."enum_certification_types_required_for_roles";
  ALTER TABLE "courses_required_for_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_courses_required_for_roles";
  CREATE TYPE "public"."enum_courses_required_for_roles" AS ENUM('participant', 'coach', 'official', 'club_admin', 'super_admin');
  ALTER TABLE "courses_required_for_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_courses_required_for_roles" USING "value"::"public"."enum_courses_required_for_roles";
  DROP INDEX "users_member_number_idx";
  DROP INDEX "users_external_id_idx";
  DROP INDEX "certifications_source_import_idx";
  DROP INDEX "payload_locked_documents_rels_passes_id_idx";
  DROP INDEX "payload_locked_documents_rels_verification_tokens_id_idx";
  DROP INDEX "payload_locked_documents_rels_scans_id_idx";
  DROP INDEX "payload_locked_documents_rels_scanner_devices_id_idx";
  DROP INDEX "payload_locked_documents_rels_apple_registrations_id_idx";
  DROP INDEX "payload_locked_documents_rels_wallet_logs_id_idx";
  DROP INDEX "payload_locked_documents_rels_pass_claims_id_idx";
  DROP INDEX "payload_locked_documents_rels_client_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_field_mappings_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_exceptions_id_idx";
  ALTER TABLE "users" DROP COLUMN "member_number";
  ALTER TABLE "users" DROP COLUMN "external_id";
  ALTER TABLE "certifications" DROP COLUMN "source";
  ALTER TABLE "certifications" DROP COLUMN "source_import_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "passes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "verification_tokens_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scans_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scanner_devices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "apple_registrations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "wallet_logs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pass_claims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "client_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_field_mappings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_exceptions_id";
  DROP TYPE "public"."enum_certifications_source";
  DROP TYPE "public"."enum_passes_platform";
  DROP TYPE "public"."enum_passes_status";
  DROP TYPE "public"."enum_verification_tokens_channel";
  DROP TYPE "public"."enum_scans_result";
  DROP TYPE "public"."enum_scans_method";
  DROP TYPE "public"."enum_import_field_mappings_transform";`)
}
