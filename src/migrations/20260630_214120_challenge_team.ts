import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "challenge_submissions" ADD COLUMN "team_id" integer;
  ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "challenge_submissions_team_idx" ON "challenge_submissions" USING btree ("team_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "challenge_submissions" DROP CONSTRAINT "challenge_submissions_team_id_teams_id_fk";
  
  DROP INDEX "challenge_submissions_team_idx";
  ALTER TABLE "challenge_submissions" DROP COLUMN "team_id";`)
}
