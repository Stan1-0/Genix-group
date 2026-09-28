import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sites_area_served_type" AS ENUM('Country', 'State', 'City', 'AdministrativeArea');
  ALTER TABLE "sites" ADD COLUMN "area_served" varchar;
  ALTER TABLE "sites" ADD COLUMN "area_served_type" "enum_sites_area_served_type" DEFAULT 'Country';
  ALTER TABLE "sites_coverage" DROP COLUMN "zip_from";
  ALTER TABLE "sites_coverage" DROP COLUMN "zip_to";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites_coverage" ADD COLUMN "zip_from" numeric;
  ALTER TABLE "sites_coverage" ADD COLUMN "zip_to" numeric;
  ALTER TABLE "sites" DROP COLUMN "area_served";
  ALTER TABLE "sites" DROP COLUMN "area_served_type";
  DROP TYPE "public"."enum_sites_area_served_type";`)
}
