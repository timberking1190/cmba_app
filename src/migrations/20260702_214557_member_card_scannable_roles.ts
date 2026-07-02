import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_member_card_config_scannable_roles" AS ENUM('participant', 'coach', 'official', 'league_official', 'club_admin', 'super_admin');
  CREATE TABLE "member_card_config_scannable_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_member_card_config_scannable_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "member_card_config_scannable_roles" ADD CONSTRAINT "member_card_config_scannable_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."member_card_config"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "member_card_config_scannable_roles_order_idx" ON "member_card_config_scannable_roles" USING btree ("order");
  CREATE INDEX "member_card_config_scannable_roles_parent_idx" ON "member_card_config_scannable_roles" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "member_card_config_scannable_roles" CASCADE;
  DROP TYPE "public"."enum_member_card_config_scannable_roles";`)
}
