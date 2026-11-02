// Meals the demo account rotates through. Names are exact USDA FDC food
// names (SR Legacy or Foundation); grams are typical portions.

export type MealItem = {
  name: string;
  grams: number;
  /** Logged as a fixed portion, e.g. "2 large", rather than weighed. */
  fixed?: boolean;
  portion?: string;
};

export type MealTemplate = { label: string; weight: number; items: MealItem[] };

const CHICKEN_BREAST =
  "Chicken, broilers or fryers, breast, meat only, cooked, roasted";
const WHITE_RICE = "Rice, white, long-grain, regular, enriched, cooked";
const OLIVE_OIL = "Oil, olive, salad or cooking";
const GREEK_YOGURT = "Yogurt, Greek, plain, nonfat";
const WHOLE_WHEAT = "Bread, whole-wheat, commercially prepared";

export const DEMO_MEALS: Record<
  "breakfast" | "lunch" | "dinner" | "snack",
  MealTemplate[]
> = {
  breakfast: [
    {
      label: "Oats with milk and banana",
      weight: 4,
      items: [
        {
          name: "Cereals, oats, regular and quick, not fortified, dry",
          grams: 60,
        },
        {
          name: "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D",
          grams: 240,
        },
        { name: "Bananas, raw", grams: 118 },
        { name: "Peanut butter, smooth style, without salt", grams: 16 },
      ],
    },
    {
      label: "Eggs on toast",
      weight: 3,
      items: [
        {
          name: "Egg, whole, raw, fresh",
          grams: 100,
          fixed: true,
          portion: "2 × 1 large",
        },
        { name: WHOLE_WHEAT, grams: 64, fixed: true, portion: "2 slices" },
        { name: "Butter, salted", grams: 7 },
        { name: "Avocados, raw, all commercial varieties", grams: 50 },
      ],
    },
    {
      label: "Greek yogurt bowl",
      weight: 3,
      items: [
        { name: GREEK_YOGURT, grams: 200 },
        { name: "Blueberries, raw", grams: 75 },
        { name: "Cereals ready-to-eat, granola, homemade", grams: 35 },
      ],
    },
  ],
  lunch: [
    {
      label: "Chicken, rice and broccoli",
      weight: 4,
      items: [
        { name: CHICKEN_BREAST, grams: 160 },
        { name: WHITE_RICE, grams: 200 },
        { name: "Broccoli, cooked, boiled, drained, without salt", grams: 120 },
        { name: OLIVE_OIL, grams: 8 },
      ],
    },
    {
      label: "Turkey sandwich and apple",
      weight: 2,
      items: [
        { name: WHOLE_WHEAT, grams: 64, fixed: true, portion: "2 slices" },
        {
          name: "Turkey breast, low salt, prepackaged or deli, luncheon meat",
          grams: 90,
        },
        { name: "Cheese, cheddar, sharp, sliced", grams: 28 },
        { name: "Lettuce, cos or romaine, raw", grams: 25 },
        { name: "Apples, raw, with skin", grams: 180 },
      ],
    },
    {
      label: "Lentil and spinach bowl",
      weight: 2,
      items: [
        {
          name: "Lentils, mature seeds, cooked, boiled, without salt",
          grams: 200,
        },
        { name: WHITE_RICE, grams: 150 },
        { name: "Spinach, raw", grams: 60 },
        { name: "Tomatoes, red, ripe, raw, year round average", grams: 80 },
        { name: OLIVE_OIL, grams: 10 },
      ],
    },
    {
      label: "Black bean tacos",
      weight: 2,
      items: [
        {
          name: "Tortillas, ready-to-bake or -fry, corn",
          grams: 78,
          fixed: true,
          portion: "3 tortillas",
        },
        {
          name: "Beans, black, mature seeds, cooked, boiled, without salt",
          grams: 170,
        },
        { name: "Cheese, cheddar, sharp, sliced", grams: 28 },
        { name: "Avocados, raw, all commercial varieties", grams: 50 },
        { name: "Onions, raw", grams: 30 },
      ],
    },
  ],
  dinner: [
    {
      label: "Salmon, potato and asparagus",
      weight: 3,
      items: [
        {
          name: "Fish, salmon, Atlantic, farmed, cooked, dry heat",
          grams: 170,
        },
        { name: "Potatoes, baked, flesh and skin, without salt", grams: 200 },
        { name: "Asparagus, cooked, boiled, drained", grams: 100 },
        { name: OLIVE_OIL, grams: 8 },
      ],
    },
    {
      label: "Beef pasta with marinara",
      weight: 3,
      items: [
        {
          name: "Beef, ground, 90% lean meat / 10% fat, crumbles, cooked, pan-browned",
          grams: 140,
        },
        { name: "Pasta, cooked, enriched, without added salt", grams: 220 },
        {
          name: "Sauce, pasta, spaghetti/marinara, ready-to-serve",
          grams: 125,
        },
        { name: "Cheese, parmesan, grated", grams: 10 },
      ],
    },
    {
      label: "Chicken thigh curry with rice",
      weight: 3,
      items: [
        {
          name: "Chicken, broilers or fryers, thigh, meat only, cooked, roasted",
          grams: 170,
        },
        { name: WHITE_RICE, grams: 180 },
        { name: "Yogurt, plain, whole milk", grams: 60 },
        { name: "Onions, raw", grams: 70 },
        { name: "Tomatoes, red, ripe, raw, year round average", grams: 120 },
        { name: OLIVE_OIL, grams: 12 },
      ],
    },
    {
      label: "Tofu and pepper noodles",
      weight: 2,
      items: [
        { name: "Tofu, raw, firm, prepared with calcium sulfate", grams: 200 },
        { name: "Noodles, egg, enriched, cooked", grams: 180 },
        { name: "Peppers, sweet, red, raw", grams: 100 },
        { name: "Soy sauce made from soy (tamari)", grams: 15 },
        { name: OLIVE_OIL, grams: 10 },
      ],
    },
  ],
  snack: [
    {
      label: "Almonds",
      weight: 3,
      items: [{ name: "Nuts, almonds", grams: 28 }],
    },
    {
      label: "Greek yogurt",
      weight: 3,
      items: [{ name: GREEK_YOGURT, grams: 170 }],
    },
    {
      label: "Protein shake and banana",
      weight: 3,
      items: [
        {
          name: "Beverages, Protein powder whey based",
          grams: 32,
          fixed: true,
          portion: "1 scoop",
        },
        { name: "Bananas, raw", grams: 118 },
      ],
    },
    {
      label: "Apple and peanut butter",
      weight: 2,
      items: [
        { name: "Apples, raw, with skin", grams: 180 },
        { name: "Peanut butter, smooth style, without salt", grams: 32 },
      ],
    },
  ],
};
