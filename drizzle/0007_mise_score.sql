ALTER TABLE "foods" ADD COLUMN "nutriscore_points" smallint;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "additives" text[];--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "organic" boolean;