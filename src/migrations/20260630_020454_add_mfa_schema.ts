import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_mfa_methods" AS ENUM('totp', 'passkey');
  CREATE TYPE "public"."enum_users_session_meta_aal" AS ENUM('aal1', 'aal2');
  CREATE TYPE "public"."enum_webauthn_credentials_device_type" AS ENUM('singleDevice', 'multiDevice');
  CREATE TYPE "public"."enum_webauthn_challenges_type" AS ENUM('registration', 'authentication');
  CREATE TYPE "public"."enum_email_otp_purpose" AS ENUM('recovery', 'stepup');
  CREATE TABLE "users_mfa_methods" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_mfa_methods",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_session_meta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sid" varchar NOT NULL,
  	"aal" "enum_users_session_meta_aal" DEFAULT 'aal1',
  	"mfa_at" timestamp(3) with time zone,
  	"step_up_at" timestamp(3) with time zone,
  	"ip" varchar,
  	"user_agent" varchar
  );
  
  CREATE TABLE "webauthn_credentials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"credential_i_d" varchar NOT NULL,
  	"public_key" varchar NOT NULL,
  	"counter" numeric DEFAULT 0 NOT NULL,
  	"transports" jsonb,
  	"device_type" "enum_webauthn_credentials_device_type",
  	"backed_up" boolean DEFAULT false,
  	"name" varchar,
  	"last_used_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "webauthn_challenges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"value" varchar NOT NULL,
  	"type" "enum_webauthn_challenges_type" NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mfa_totp" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"secret_encrypted" varchar NOT NULL,
  	"activated" boolean DEFAULT false,
  	"last_step" numeric DEFAULT 0,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"activated_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recovery_codes_codes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hash" varchar NOT NULL,
  	"salt" varchar NOT NULL,
  	"consumed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "recovery_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"remaining" numeric DEFAULT 0,
  	"generated_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_otp" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"hash" varchar NOT NULL,
  	"purpose" "enum_email_otp_purpose" DEFAULT 'recovery' NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"consumed_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "mfa_enrolled" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "mfa_enrolled_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "mfa_required" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "mfa_last_verified_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webauthn_credentials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webauthn_challenges_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mfa_totp_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "recovery_codes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_otp_id" integer;
  ALTER TABLE "users_mfa_methods" ADD CONSTRAINT "users_mfa_methods_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_session_meta" ADD CONSTRAINT "users_session_meta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mfa_totp" ADD CONSTRAINT "mfa_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recovery_codes_codes" ADD CONSTRAINT "recovery_codes_codes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recovery_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_otp" ADD CONSTRAINT "email_otp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_mfa_methods_order_idx" ON "users_mfa_methods" USING btree ("order");
  CREATE INDEX "users_mfa_methods_parent_idx" ON "users_mfa_methods" USING btree ("parent_id");
  CREATE INDEX "users_session_meta_order_idx" ON "users_session_meta" USING btree ("_order");
  CREATE INDEX "users_session_meta_parent_id_idx" ON "users_session_meta" USING btree ("_parent_id");
  CREATE INDEX "users_session_meta_sid_idx" ON "users_session_meta" USING btree ("sid");
  CREATE INDEX "webauthn_credentials_user_idx" ON "webauthn_credentials" USING btree ("user_id");
  CREATE UNIQUE INDEX "webauthn_credentials_credential_i_d_idx" ON "webauthn_credentials" USING btree ("credential_i_d");
  CREATE INDEX "webauthn_credentials_updated_at_idx" ON "webauthn_credentials" USING btree ("updated_at");
  CREATE INDEX "webauthn_challenges_user_idx" ON "webauthn_challenges" USING btree ("user_id");
  CREATE INDEX "webauthn_challenges_expires_at_idx" ON "webauthn_challenges" USING btree ("expires_at");
  CREATE INDEX "webauthn_challenges_updated_at_idx" ON "webauthn_challenges" USING btree ("updated_at");
  CREATE UNIQUE INDEX "mfa_totp_user_idx" ON "mfa_totp" USING btree ("user_id");
  CREATE INDEX "mfa_totp_updated_at_idx" ON "mfa_totp" USING btree ("updated_at");
  CREATE INDEX "recovery_codes_codes_order_idx" ON "recovery_codes_codes" USING btree ("_order");
  CREATE INDEX "recovery_codes_codes_parent_id_idx" ON "recovery_codes_codes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "recovery_codes_user_idx" ON "recovery_codes" USING btree ("user_id");
  CREATE INDEX "recovery_codes_updated_at_idx" ON "recovery_codes" USING btree ("updated_at");
  CREATE INDEX "recovery_codes_created_at_idx" ON "recovery_codes" USING btree ("created_at");
  CREATE INDEX "email_otp_user_idx" ON "email_otp" USING btree ("user_id");
  CREATE INDEX "email_otp_expires_at_idx" ON "email_otp" USING btree ("expires_at");
  CREATE INDEX "email_otp_updated_at_idx" ON "email_otp" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webauthn_credentials_fk" FOREIGN KEY ("webauthn_credentials_id") REFERENCES "public"."webauthn_credentials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webauthn_challenges_fk" FOREIGN KEY ("webauthn_challenges_id") REFERENCES "public"."webauthn_challenges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mfa_totp_fk" FOREIGN KEY ("mfa_totp_id") REFERENCES "public"."mfa_totp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recovery_codes_fk" FOREIGN KEY ("recovery_codes_id") REFERENCES "public"."recovery_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_otp_fk" FOREIGN KEY ("email_otp_id") REFERENCES "public"."email_otp"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_webauthn_credentials_id_idx" ON "payload_locked_documents_rels" USING btree ("webauthn_credentials_id");
  CREATE INDEX "payload_locked_documents_rels_webauthn_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("webauthn_challenges_id");
  CREATE INDEX "payload_locked_documents_rels_mfa_totp_id_idx" ON "payload_locked_documents_rels" USING btree ("mfa_totp_id");
  CREATE INDEX "payload_locked_documents_rels_recovery_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("recovery_codes_id");
  CREATE INDEX "payload_locked_documents_rels_email_otp_id_idx" ON "payload_locked_documents_rels" USING btree ("email_otp_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_mfa_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_session_meta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webauthn_credentials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webauthn_challenges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mfa_totp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recovery_codes_codes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recovery_codes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_otp" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_mfa_methods" CASCADE;
  DROP TABLE "users_session_meta" CASCADE;
  DROP TABLE "webauthn_credentials" CASCADE;
  DROP TABLE "webauthn_challenges" CASCADE;
  DROP TABLE "mfa_totp" CASCADE;
  DROP TABLE "recovery_codes_codes" CASCADE;
  DROP TABLE "recovery_codes" CASCADE;
  DROP TABLE "email_otp" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webauthn_credentials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webauthn_challenges_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mfa_totp_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recovery_codes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_otp_fk";
  
  DROP INDEX "payload_locked_documents_rels_webauthn_credentials_id_idx";
  DROP INDEX "payload_locked_documents_rels_webauthn_challenges_id_idx";
  DROP INDEX "payload_locked_documents_rels_mfa_totp_id_idx";
  DROP INDEX "payload_locked_documents_rels_recovery_codes_id_idx";
  DROP INDEX "payload_locked_documents_rels_email_otp_id_idx";
  ALTER TABLE "users" DROP COLUMN "mfa_enrolled";
  ALTER TABLE "users" DROP COLUMN "mfa_enrolled_at";
  ALTER TABLE "users" DROP COLUMN "mfa_required";
  ALTER TABLE "users" DROP COLUMN "mfa_last_verified_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webauthn_credentials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webauthn_challenges_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mfa_totp_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "recovery_codes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_otp_id";
  DROP TYPE "public"."enum_users_mfa_methods";
  DROP TYPE "public"."enum_users_session_meta_aal";
  DROP TYPE "public"."enum_webauthn_credentials_device_type";
  DROP TYPE "public"."enum_webauthn_challenges_type";
  DROP TYPE "public"."enum_email_otp_purpose";`)
}
