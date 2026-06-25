import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_officials_ramp_level" AS ENUM('level1', 'level2', 'level3');
  CREATE TYPE "public"."enum_game_officials_role" AS ENUM('referee1', 'referee2', 'scorekeeper', 'other');
  CREATE TYPE "public"."enum_game_officials_status" AS ENUM('assigned', 'accepted', 'declined');
  CREATE TABLE "officials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"ramp_level" "enum_officials_ramp_level",
  	"max_games_per_day" numeric,
  	"external_id" varchar,
  	"notes" varchar,
  	"linked_user_id" integer,
  	"active" boolean DEFAULT true,
  	"import_batch_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "game_officials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"official_id" integer NOT NULL,
  	"official_user_id_id" integer,
  	"role" "enum_game_officials_role" DEFAULT 'referee1' NOT NULL,
  	"assigned_by_id" integer,
  	"assigned_at" timestamp(3) with time zone,
  	"status" "enum_game_officials_status" DEFAULT 'assigned',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "officials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_officials_id" integer;
  ALTER TABLE "officials" ADD CONSTRAINT "officials_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "officials" ADD CONSTRAINT "officials_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_official_id_officials_id_fk" FOREIGN KEY ("official_id") REFERENCES "public"."officials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_official_user_id_id_users_id_fk" FOREIGN KEY ("official_user_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "officials_email_idx" ON "officials" USING btree ("email");
  CREATE INDEX "officials_external_id_idx" ON "officials" USING btree ("external_id");
  CREATE INDEX "officials_linked_user_idx" ON "officials" USING btree ("linked_user_id");
  CREATE INDEX "officials_import_batch_idx" ON "officials" USING btree ("import_batch_id");
  CREATE INDEX "officials_updated_at_idx" ON "officials" USING btree ("updated_at");
  CREATE INDEX "officials_created_at_idx" ON "officials" USING btree ("created_at");
  CREATE INDEX "game_officials_game_idx" ON "game_officials" USING btree ("game_id");
  CREATE INDEX "game_officials_official_idx" ON "game_officials" USING btree ("official_id");
  CREATE INDEX "game_officials_official_user_id_idx" ON "game_officials" USING btree ("official_user_id_id");
  CREATE INDEX "game_officials_assigned_by_idx" ON "game_officials" USING btree ("assigned_by_id");
  CREATE INDEX "game_officials_updated_at_idx" ON "game_officials" USING btree ("updated_at");
  CREATE INDEX "game_officials_created_at_idx" ON "game_officials" USING btree ("created_at");
  CREATE UNIQUE INDEX "game_official_idx" ON "game_officials" USING btree ("game_id","official_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_officials_fk" FOREIGN KEY ("officials_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_officials_fk" FOREIGN KEY ("game_officials_id") REFERENCES "public"."game_officials"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_officials_id_idx" ON "payload_locked_documents_rels" USING btree ("officials_id");
  CREATE INDEX "payload_locked_documents_rels_game_officials_id_idx" ON "payload_locked_documents_rels" USING btree ("game_officials_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "officials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_officials" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "officials" CASCADE;
  DROP TABLE "game_officials" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_officials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_officials_fk";
  
  DROP INDEX "payload_locked_documents_rels_officials_id_idx";
  DROP INDEX "payload_locked_documents_rels_game_officials_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "officials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_officials_id";
  DROP TYPE "public"."enum_officials_ramp_level";
  DROP TYPE "public"."enum_game_officials_role";
  DROP TYPE "public"."enum_game_officials_status";`)
}
