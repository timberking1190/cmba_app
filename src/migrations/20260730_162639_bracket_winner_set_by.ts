import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_bracket_series_winner_set_by" AS ENUM('auto', 'manual');
  ALTER TABLE "bracket_series" ADD COLUMN "winner_set_by" "enum_bracket_series_winner_set_by";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bracket_series" DROP COLUMN "winner_set_by";
  DROP TYPE "public"."enum_bracket_series_winner_set_by";`)
}
