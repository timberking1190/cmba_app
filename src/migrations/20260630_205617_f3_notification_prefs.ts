import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "notification_prefs_weekly_digest" boolean DEFAULT true;
  ALTER TABLE "users" ADD COLUMN "notification_prefs_recognition_updates" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "notification_prefs_weekly_digest";
  ALTER TABLE "users" DROP COLUMN "notification_prefs_recognition_updates";`)
}
