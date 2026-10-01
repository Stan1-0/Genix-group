import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_division" AS ENUM('hub', 'logistics', 'homeupgrades', 'multimedia');
  CREATE TYPE "public"."enum_inquiries_type" AS ENUM('quote', 'contact', 'booking');
  CREATE TYPE "public"."enum_inquiries_status" AS ENUM('new', 'contacted', 'closed');
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"division" "enum_inquiries_division" NOT NULL,
  	"type" "enum_inquiries_type" DEFAULT 'quote' NOT NULL,
  	"status" "enum_inquiries_status" DEFAULT 'new' NOT NULL,
  	"summary" varchar,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar,
  	"notes" varchar,
  	"details" jsonb,
  	"email_sent" boolean DEFAULT false,
  	"customer_email_sent" boolean DEFAULT false,
  	"email_attempts" numeric DEFAULT 0,
  	"last_email_error" varchar,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "inquiry_counters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"division" varchar NOT NULL,
  	"value" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_hits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ip_hash" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiry_counters_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_hits_id" integer;
  CREATE UNIQUE INDEX "inquiries_reference_idx" ON "inquiries" USING btree ("reference");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "inquiry_counters_division_idx" ON "inquiry_counters" USING btree ("division");
  CREATE INDEX "inquiry_counters_updated_at_idx" ON "inquiry_counters" USING btree ("updated_at");
  CREATE INDEX "inquiry_counters_created_at_idx" ON "inquiry_counters" USING btree ("created_at");
  CREATE INDEX "rate_hits_ip_hash_idx" ON "rate_hits" USING btree ("ip_hash");
  CREATE INDEX "rate_hits_updated_at_idx" ON "rate_hits" USING btree ("updated_at");
  CREATE INDEX "rate_hits_created_at_idx" ON "rate_hits" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiry_counters_fk" FOREIGN KEY ("inquiry_counters_id") REFERENCES "public"."inquiry_counters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_hits_fk" FOREIGN KEY ("rate_hits_id") REFERENCES "public"."rate_hits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_inquiry_counters_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiry_counters_id");
  CREATE INDEX "payload_locked_documents_rels_rate_hits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_hits_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Drop the locked-documents FKs and indexes before the tables (DROP TABLE ... CASCADE would remove the FKs first,
  // making the later plain DROP CONSTRAINT fail).
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_inquiries_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_inquiry_counters_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_rate_hits_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_inquiries_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_inquiry_counters_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_rate_hits_id_idx";
  ALTER TABLE "inquiries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiry_counters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_hits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "inquiry_counters" CASCADE;
  DROP TABLE "rate_hits" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiry_counters_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_hits_id";
  DROP TYPE "public"."enum_inquiries_division";
  DROP TYPE "public"."enum_inquiries_type";
  DROP TYPE "public"."enum_inquiries_status";`)
}
