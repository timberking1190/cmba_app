import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_roles" ADD VALUE 'parent' BEFORE 'league_official';
  ALTER TYPE "public"."enum_certification_types_applies_to_roles" ADD VALUE 'parent' BEFORE 'league_official';
  ALTER TYPE "public"."enum_certification_types_required_for_roles" ADD VALUE 'parent' BEFORE 'league_official';
  ALTER TYPE "public"."enum_courses_required_for_roles" ADD VALUE 'parent' BEFORE 'league_official';
  ALTER TYPE "public"."enum_member_card_config_scannable_roles" ADD VALUE 'parent' BEFORE 'league_official';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  ALTER TABLE "certification_types_applies_to_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_certification_types_applies_to_roles";
  CREATE TYPE "public"."enum_certification_types_applies_to_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  ALTER TABLE "certification_types_applies_to_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_certification_types_applies_to_roles" USING "value"::"public"."enum_certification_types_applies_to_roles";
  ALTER TABLE "certification_types_required_for_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_certification_types_required_for_roles";
  CREATE TYPE "public"."enum_certification_types_required_for_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  ALTER TABLE "certification_types_required_for_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_certification_types_required_for_roles" USING "value"::"public"."enum_certification_types_required_for_roles";
  ALTER TABLE "courses_required_for_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_courses_required_for_roles";
  CREATE TYPE "public"."enum_courses_required_for_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  ALTER TABLE "courses_required_for_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_courses_required_for_roles" USING "value"::"public"."enum_courses_required_for_roles";
  ALTER TABLE "member_card_config_scannable_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_member_card_config_scannable_roles";
  CREATE TYPE "public"."enum_member_card_config_scannable_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  ALTER TABLE "member_card_config_scannable_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_member_card_config_scannable_roles" USING "value"::"public"."enum_member_card_config_scannable_roles";`)
}
