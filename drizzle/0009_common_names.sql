ALTER TABLE "foods" ADD COLUMN "common_name" text;--> statement-breakpoint
ALTER TABLE "foods" drop column "search_tsv";--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(common_name,'') || ' ' || coalesce(name,'') || ' ' || coalesce(brand,''))) STORED;--> statement-breakpoint
CREATE INDEX "foods_tsv" ON "foods" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "foods_common_name_trgm" ON "foods" USING gin ("common_name" gin_trgm_ops);
