import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "arcade_scores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"score" numeric NOT NULL,
  	"game" varchar DEFAULT 'freethrow',
  	"submitter_fingerprint" varchar,
  	"reports" numeric DEFAULT 0,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "arcade_scores_id" integer;
  CREATE INDEX "arcade_scores_game_idx" ON "arcade_scores" USING btree ("game");
  CREATE INDEX "arcade_scores_updated_at_idx" ON "arcade_scores" USING btree ("updated_at");
  CREATE INDEX "arcade_scores_created_at_idx" ON "arcade_scores" USING btree ("created_at");
  CREATE INDEX "game_score_idx" ON "arcade_scores" USING btree ("game","score");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_arcade_scores_fk" FOREIGN KEY ("arcade_scores_id") REFERENCES "public"."arcade_scores"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_arcade_scores_id_idx" ON "payload_locked_documents_rels" USING btree ("arcade_scores_id");
  ALTER TABLE "arcade_scores" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "arcade_scores" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "arcade_scores" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_arcade_scores_fk";
  
  DROP INDEX "payload_locked_documents_rels_arcade_scores_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "arcade_scores_id";`)
}
