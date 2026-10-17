import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_inquiries_type" ADD VALUE 'application';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "inquiries" ALTER COLUMN "type" SET DEFAULT 'quote'::text;
  DROP TYPE "public"."enum_inquiries_type";
  CREATE TYPE "public"."enum_inquiries_type" AS ENUM('quote', 'contact', 'booking');
  ALTER TABLE "inquiries" ALTER COLUMN "type" SET DEFAULT 'quote'::"public"."enum_inquiries_type";
  ALTER TABLE "inquiries" ALTER COLUMN "type" SET DATA TYPE "public"."enum_inquiries_type" USING "type"::"public"."enum_inquiries_type";`)
}
