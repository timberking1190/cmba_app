import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/*
 * SNAPSHOT-ONLY MIGRATION. Deliberately does nothing.
 *
 * Why it exists: Payload picks the diff base for `migrate:create` by sorting the
 * .json snapshot filenames and taking the last one, NOT by the order in
 * src/migrations/index.ts. Merging main with feat/launch-readiness interleaved two
 * migration chains: the launch-readiness pair (20260702_054408_add_email_send_log,
 * 20260702_063142_add_season_surveys) carries EARLIER timestamps than the eight
 * migrations main had landed since, so the highest-sorting snapshot was main's
 * 20260731_032821_add_scheduler_role.json, which knows nothing about email_send_log,
 * season_surveys, season_surveys_questions, season_surveys_questions_options,
 * survey_responses, survey_responses_answers or their five enums.
 *
 * Left alone, the next `npm run migrate:create` would diff the merged config against
 * that stale baseline and re-emit CREATE TYPE / CREATE TABLE for objects the merged
 * migration set already creates, then fail on apply with "already exists". That was
 * confirmed empirically: generating this migration normally produced exactly 5
 * CREATE TYPE and 6 CREATE TABLE duplicates.
 *
 * The fix is the companion .json, not this file. 20260804_155514_merged_schema_snapshot.json
 * is the true post-merge schema (125 tables) and now sorts last, so it becomes the
 * baseline for every future migrate:create. The generated DDL has been removed from
 * up() because every object in it is already created by the two migrations above.
 *
 * Applying this migration is a no-op that only records its name in payload_migrations.
 * Nothing here is reversible because nothing here is done, so down() is a no-op too.
 */

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  payload.logger.info(
    '[20260804_155514_merged_schema_snapshot] snapshot-only migration, no schema change applied',
  )
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info(
    '[20260804_155514_merged_schema_snapshot] snapshot-only migration, nothing to reverse',
  )
}
