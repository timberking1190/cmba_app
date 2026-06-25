import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_push_devices_platform" AS ENUM('ios', 'android', 'web');
  CREATE TABLE "users_push_devices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"token" varchar NOT NULL,
  	"platform" "enum_users_push_devices_platform",
  	"registered_at" timestamp(3) with time zone,
  	"last_seen_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_push_devices" ADD CONSTRAINT "users_push_devices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_push_devices_order_idx" ON "users_push_devices" USING btree ("_order");
  CREATE INDEX "users_push_devices_parent_id_idx" ON "users_push_devices" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_push_devices" CASCADE;
  DROP TYPE "public"."enum_users_push_devices_platform";`)
}
