CREATE TABLE "meal_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"meal_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"food_id" bigint,
	"recipe_id" uuid,
	"quantity_g" numeric,
	"portion_label" text,
	"servings" numeric,
	CONSTRAINT "meal_items_food_or_recipe" CHECK (("meal_items"."food_id" is not null and "meal_items"."quantity_g" > 0 and "meal_items"."recipe_id" is null) or ("meal_items"."recipe_id" is not null and "meal_items"."servings" > 0 and "meal_items"."food_id" is null))
);
--> statement-breakpoint
ALTER TABLE "meal_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diary_entries" DROP CONSTRAINT "diary_entries_via";--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_items_meal" ON "meal_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meals_owner" ON "meals" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_via" CHECK ("diary_entries"."logged_via" in ('search','natural_language','recent','copy','recipe','cook_mode','meal'));--> statement-breakpoint
CREATE POLICY "meal_items_own" ON "meal_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from meals m where m.id = "meal_items"."meal_id" and m.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from meals m where m.id = "meal_items"."meal_id" and m.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "meals_own" ON "meals" AS PERMISSIVE FOR ALL TO "authenticated" USING ("meals"."owner_id" = (select auth.uid())) WITH CHECK ("meals"."owner_id" = (select auth.uid()));