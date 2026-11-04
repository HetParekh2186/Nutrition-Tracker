ALTER TABLE "dietary_preferences" ADD COLUMN "eats" text[] DEFAULT '{beef,pork,lamb,chicken,poultry,fish,shellfish,eggs,dairy,honey}' NOT NULL;--> statement-breakpoint
-- Carry each preset over as its set of animal foods.
UPDATE "dietary_preferences" SET "eats" = CASE "diet_type"
  WHEN 'pescatarian' THEN '{fish,shellfish,eggs,dairy,honey}'::text[]
  WHEN 'eggetarian' THEN '{eggs,dairy,honey}'::text[]
  WHEN 'vegetarian' THEN '{dairy,honey}'::text[]
  WHEN 'vegan' THEN '{}'::text[]
  ELSE "eats"
END;
