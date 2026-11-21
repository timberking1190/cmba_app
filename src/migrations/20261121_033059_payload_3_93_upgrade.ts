import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "certificate_files" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "scoresheet_files" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "incident_files" ADD COLUMN "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";
  ALTER TABLE "certificate_files" DROP COLUMN "_objectkey";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "scoresheet_files" DROP COLUMN "_objectkey";
  ALTER TABLE "incident_files" DROP COLUMN "_objectkey";`)
}
