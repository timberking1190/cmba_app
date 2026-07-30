import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "import_batches" ADD COLUMN "bulk_action" varchar;
  ALTER TABLE "import_batches" ADD COLUMN "bulk_undo" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "import_batches" DROP COLUMN "bulk_action";
  ALTER TABLE "import_batches" DROP COLUMN "bulk_undo";`)
}
