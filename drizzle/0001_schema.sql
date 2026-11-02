CREATE TABLE "body_metrics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"measured_on" date NOT NULL,
	"weight_kg" numeric(5, 2),
	"body_fat_pct" numeric(4, 1),
	CONSTRAINT "body_metrics_userId_measuredOn_unique" UNIQUE("user_id","measured_on")
);
--> statement-breakpoint
ALTER TABLE "body_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cook_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"step_at_time" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cook_messages_role" CHECK ("cook_messages"."role" in ('user','assistant','tool'))
);
--> statement-breakpoint
ALTER TABLE "cook_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cook_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"servings" numeric NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"substitutions" jsonb DEFAULT '[]' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cook_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"meal_slot" text NOT NULL,
	"food_id" bigint,
	"recipe_id" uuid,
	"quantity_g" numeric,
	"servings" numeric,
	"portion_label" text,
	"cook_session_id" uuid,
	"logged_via" text DEFAULT 'search' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diary_entries_slot" CHECK ("diary_entries"."meal_slot" in ('breakfast','lunch','dinner','snack')),
	CONSTRAINT "diary_entries_via" CHECK ("diary_entries"."logged_via" in ('search','natural_language','recent','copy','recipe','cook_mode')),
	CONSTRAINT "diary_entries_food_or_recipe" CHECK (("diary_entries"."food_id" is not null and "diary_entries"."quantity_g" is not null and "diary_entries"."recipe_id" is null) or ("diary_entries"."recipe_id" is not null and "diary_entries"."servings" is not null and "diary_entries"."food_id" is null))
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dietary_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"diet_type" text,
	"excluded_ingredients" text[] DEFAULT '{}' NOT NULL,
	"disliked_ingredients" text[] DEFAULT '{}' NOT NULL,
	"liked_cuisines" text[] DEFAULT '{}' NOT NULL,
	"max_cook_minutes" integer,
	"equipment" text[] DEFAULT '{}' NOT NULL,
	"spice_level" smallint,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dietary_preferences_diet" CHECK ("dietary_preferences"."diet_type" in ('omnivore','vegetarian','eggetarian','vegan','pescatarian')),
	CONSTRAINT "dietary_preferences_spice" CHECK ("dietary_preferences"."spice_level" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "dietary_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "food_nutrients" (
	"food_id" bigint NOT NULL,
	"nutrient_id" integer NOT NULL,
	"amount_per_100g" numeric NOT NULL,
	CONSTRAINT "food_nutrients_food_id_nutrient_id_pk" PRIMARY KEY("food_id","nutrient_id")
);
--> statement-breakpoint
ALTER TABLE "food_nutrients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "food_portions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"food_id" bigint NOT NULL,
	"label" text NOT NULL,
	"grams" numeric NOT NULL,
	CONSTRAINT "food_portions_grams" CHECK ("food_portions"."grams" > 0)
);
--> statement-breakpoint
ALTER TABLE "food_portions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "foods" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"name" text NOT NULL,
	"brand" text,
	"owner_id" uuid,
	"search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,''))) STORED,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_source_sourceId_unique" UNIQUE("source","source_id"),
	CONSTRAINT "foods_source" CHECK ("foods"."source" in ('usda_foundation','usda_sr_legacy','usda_branded','off','custom'))
);
--> statement-breakpoint
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nutrient_targets" (
	"user_id" uuid NOT NULL,
	"nutrient_id" integer NOT NULL,
	"min_amount" numeric,
	"max_amount" numeric,
	"source" text DEFAULT 'default' NOT NULL,
	CONSTRAINT "nutrient_targets_user_id_nutrient_id_pk" PRIMARY KEY("user_id","nutrient_id"),
	CONSTRAINT "nutrient_targets_source" CHECK ("nutrient_targets"."source" in ('default','computed','user'))
);
--> statement-breakpoint
ALTER TABLE "nutrient_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nutrients" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"category" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "nutrients_category" CHECK ("nutrients"."category" in ('energy','macro','vitamin','mineral','lipid','amino_acid','other'))
);
--> statement-breakpoint
ALTER TABLE "nutrients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"food_id" bigint,
	"quantity_g" numeric NOT NULL,
	"display_text" text NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"group_label" text,
	CONSTRAINT "recipe_ingredients_qty" CHECK ("recipe_ingredients"."quantity_g" >= 0)
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recipe_interactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"event" text NOT NULL,
	"rating" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_interactions_event" CHECK ("recipe_interactions"."event" in ('impression','view','save','unsave','skip','cook_start','cook_complete','log','rate')),
	CONSTRAINT "recipe_interactions_rating" CHECK ("recipe_interactions"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "recipe_interactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recipe_nutrition" (
	"recipe_id" uuid NOT NULL,
	"nutrient_id" integer NOT NULL,
	"amount_per_serving" numeric NOT NULL,
	CONSTRAINT "recipe_nutrition_recipe_id_nutrient_id_pk" PRIMARY KEY("recipe_id","nutrient_id")
);
--> statement-breakpoint
ALTER TABLE "recipe_nutrition" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recipe_steps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"instruction" text NOT NULL,
	"timer_seconds" integer,
	"ingredient_ids" bigint[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "recipe_steps_recipeId_position_unique" UNIQUE("recipe_id","position")
);
--> statement-breakpoint
ALTER TABLE "recipe_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"parent_recipe_id" uuid,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cuisine" text,
	"meal_types" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"servings" numeric NOT NULL,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"cover_seed" integer DEFAULT floor(random()*1e6) NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_source" CHECK ("recipes"."source" in ('user','ai_generated','ai_adapted','imported')),
	CONSTRAINT "recipes_servings" CHECK ("recipes"."servings" > 0)
);
--> statement-breakpoint
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "taste_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"taste_embedding" vector(1024),
	"top_ingredients" jsonb DEFAULT '[]' NOT NULL,
	"cuisine_weights" jsonb DEFAULT '{}' NOT NULL,
	"meal_time_patterns" jsonb DEFAULT '{}' NOT NULL,
	"rebuilt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "taste_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sex" text,
	"birth_date" date,
	"height_cm" numeric(5, 1),
	"activity_level" text,
	"goal" text,
	"protein_g_per_kg" numeric(3, 1) DEFAULT 1.8 NOT NULL,
	"fat_pct_of_kcal" numeric(3, 2) DEFAULT 0.25 NOT NULL,
	"unit_system" text DEFAULT 'metric' NOT NULL,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_sex" CHECK ("user_profiles"."sex" in ('male','female')),
	CONSTRAINT "user_profiles_activity" CHECK ("user_profiles"."activity_level" in ('sedentary','light','moderate','active','very_active')),
	CONSTRAINT "user_profiles_goal" CHECK ("user_profiles"."goal" in ('lose','maintain','gain','recomp')),
	CONSTRAINT "user_profiles_units" CHECK ("user_profiles"."unit_system" in ('metric','imperial'))
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_messages" ADD CONSTRAINT "cook_messages_session_id_cook_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cook_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_sessions" ADD CONSTRAINT "cook_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_sessions" ADD CONSTRAINT "cook_sessions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dietary_preferences" ADD CONSTRAINT "dietary_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_targets" ADD CONSTRAINT "nutrient_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_targets" ADD CONSTRAINT "nutrient_targets_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_nutrition" ADD CONSTRAINT "recipe_nutrition_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_nutrition" ADD CONSTRAINT "recipe_nutrition_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_parent_recipe_id_recipes_id_fk" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taste_profiles" ADD CONSTRAINT "taste_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cook_messages_session" ON "cook_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "diary_user_date" ON "diary_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "diary_user_food" ON "diary_entries" USING btree ("user_id","food_id");--> statement-breakpoint
CREATE INDEX "food_portions_food" ON "food_portions" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "foods_name_trgm" ON "foods" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "foods_tsv" ON "foods" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "foods_owner" ON "foods" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "interactions_user" ON "recipe_interactions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recipes_embedding" ON "recipes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "recipes_owner" ON "recipes" USING btree ("owner_id");--> statement-breakpoint
CREATE POLICY "body_metrics_own" ON "body_metrics" AS PERMISSIVE FOR ALL TO "authenticated" USING ("body_metrics"."user_id" = (select auth.uid())) WITH CHECK ("body_metrics"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "cook_messages_own" ON "cook_messages" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from cook_sessions s where s.id = "cook_messages"."session_id" and s.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from cook_sessions s where s.id = "cook_messages"."session_id" and s.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "cook_sessions_own" ON "cook_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("cook_sessions"."user_id" = (select auth.uid())) WITH CHECK ("cook_sessions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "diary_entries_own" ON "diary_entries" AS PERMISSIVE FOR ALL TO "authenticated" USING ("diary_entries"."user_id" = (select auth.uid())) WITH CHECK ("diary_entries"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dietary_preferences_own" ON "dietary_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING ("dietary_preferences"."user_id" = (select auth.uid())) WITH CHECK ("dietary_preferences"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "food_nutrients_read" ON "food_nutrients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from foods f where f.id = "food_nutrients"."food_id" and (f.owner_id is null or f.owner_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "food_nutrients_write_own" ON "food_nutrients" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from foods f where f.id = "food_nutrients"."food_id" and f.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from foods f where f.id = "food_nutrients"."food_id" and f.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "food_portions_read" ON "food_portions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from foods f where f.id = "food_portions"."food_id" and (f.owner_id is null or f.owner_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "food_portions_write_own" ON "food_portions" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from foods f where f.id = "food_portions"."food_id" and f.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from foods f where f.id = "food_portions"."food_id" and f.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "foods_read" ON "foods" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("foods"."owner_id" is null or "foods"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "foods_write_own" ON "foods" AS PERMISSIVE FOR ALL TO "authenticated" USING ("foods"."owner_id" = (select auth.uid())) WITH CHECK ("foods"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "nutrient_targets_own" ON "nutrient_targets" AS PERMISSIVE FOR ALL TO "authenticated" USING ("nutrient_targets"."user_id" = (select auth.uid())) WITH CHECK ("nutrient_targets"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "nutrients_read" ON "nutrients" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "recipe_ingredients_read" ON "recipe_ingredients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_ingredients"."recipe_id" and (r.owner_id is null or r.owner_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "recipe_ingredients_write_own" ON "recipe_ingredients" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_ingredients"."recipe_id" and r.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from recipes r where r.id = "recipe_ingredients"."recipe_id" and r.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recipe_interactions_own" ON "recipe_interactions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("recipe_interactions"."user_id" = (select auth.uid())) WITH CHECK ("recipe_interactions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "recipe_nutrition_read" ON "recipe_nutrition" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_nutrition"."recipe_id" and (r.owner_id is null or r.owner_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "recipe_nutrition_write_own" ON "recipe_nutrition" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_nutrition"."recipe_id" and r.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from recipes r where r.id = "recipe_nutrition"."recipe_id" and r.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recipe_steps_read" ON "recipe_steps" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_steps"."recipe_id" and (r.owner_id is null or r.owner_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "recipe_steps_write_own" ON "recipe_steps" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from recipes r where r.id = "recipe_steps"."recipe_id" and r.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from recipes r where r.id = "recipe_steps"."recipe_id" and r.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recipes_read" ON "recipes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("recipes"."owner_id" is null or "recipes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "recipes_write_own" ON "recipes" AS PERMISSIVE FOR ALL TO "authenticated" USING ("recipes"."owner_id" = (select auth.uid())) WITH CHECK ("recipes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "taste_profiles_own" ON "taste_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("taste_profiles"."user_id" = (select auth.uid())) WITH CHECK ("taste_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_profiles_own" ON "user_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_profiles"."user_id" = (select auth.uid())) WITH CHECK ("user_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users_own" ON "users" AS PERMISSIVE FOR ALL TO "authenticated" USING ("users"."id" = (select auth.uid())) WITH CHECK ("users"."id" = (select auth.uid()));