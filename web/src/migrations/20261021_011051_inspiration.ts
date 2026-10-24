import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inspiration_service" AS ENUM('accent-walls', 'outdoor', 'handyman', 'reception');
  CREATE TABLE "inspiration" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"service" "enum_inspiration_service" NOT NULL,
  	"style" varchar NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar,
  	"order" numeric DEFAULT 100,
  	"published" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inspiration_id" integer;
  ALTER TABLE "inspiration" ADD CONSTRAINT "inspiration_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "inspiration_image_idx" ON "inspiration" USING btree ("image_id");
  CREATE INDEX "inspiration_updated_at_idx" ON "inspiration" USING btree ("updated_at");
  CREATE INDEX "inspiration_created_at_idx" ON "inspiration" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inspiration_fk" FOREIGN KEY ("inspiration_id") REFERENCES "public"."inspiration"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_inspiration_id_idx" ON "payload_locked_documents_rels" USING btree ("inspiration_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inspiration" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "inspiration" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inspiration_fk";
  
  DROP INDEX "payload_locked_documents_rels_inspiration_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inspiration_id";
  DROP TYPE "public"."enum_inspiration_service";`)
}
