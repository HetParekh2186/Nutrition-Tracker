// The shared starter library (owner_id null). Ingredient names are exact
// USDA FoodData Central names; weights are raw, for the whole recipe.

import type { MealSlot } from "../../src/lib/db/enums";

type Ing = [display: string, usdaName: string, grams: number];
type Step = [
  instruction: string,
  timerSeconds: number | null,
  ingredients: number[],
];

export type StarterRecipe = {
  title: string;
  description: string;
  cuisine: string;
  mealTypes: MealSlot[];
  tags: string[];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Ing[];
  steps: Step[];
};

const OIL = "Oil, olive, salad or cooking";
const ONION = "Onions, raw";
const GARLIC = "Garlic, raw";
const TOMATO = "Tomatoes, red, ripe, raw, year round average";
const WHITE_RICE_RAW = "Rice, white, long-grain, regular, raw, enriched";
const CHICKEN_BREAST_RAW = "Chicken, breast, boneless, skinless, raw";
const CHICKEN_THIGH_RAW = "Chicken, thigh, boneless, skinless, raw";
const GREEK_YOGURT = "Yogurt, Greek, plain, nonfat";

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    title: "Chicken tikka masala",
    description: "Yogurt-marinated chicken in a spiced tomato and cream sauce.",
    cuisine: "indian",
    mealTypes: ["dinner"],
    tags: ["high-protein"],
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 30,
    ingredients: [
      ["600 g boneless chicken thighs, cubed", CHICKEN_THIGH_RAW, 600],
      ["150 g plain yogurt", "Yogurt, plain, whole milk", 150],
      ["1 large onion, diced", ONION, 150],
      ["4 cloves garlic, grated", GARLIC, 12],
      ["400 g crushed tomatoes", TOMATO, 400],
      ["100 ml heavy cream", "Cream, fluid, heavy whipping", 100],
      ["2 tbsp oil", OIL, 28],
      ["300 g basmati rice", WHITE_RICE_RAW, 300],
    ],
    steps: [
      [
        "Mix the chicken with the yogurt and let it sit while you start the sauce.",
        900,
        [0, 1],
      ],
      ["Cook the onion in the oil over medium heat until golden.", 480, [2, 6]],
      [
        "Add the garlic, then the tomatoes, and simmer until thick.",
        600,
        [3, 4],
      ],
      ["Simmer the rice in salted water, covered.", 900, [7]],
      [
        "Add the chicken to the sauce and cook until it reaches 74 °C inside.",
        720,
        [0],
      ],
      [
        "Stir in the cream, warm through and serve over the rice.",
        null,
        [5, 7],
      ],
    ],
  },
  {
    title: "Chana masala",
    description:
      "Chickpeas simmered with onion, tomato, ginger and warm spices.",
    cuisine: "indian",
    mealTypes: ["lunch", "dinner"],
    tags: ["meal-prep"],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    ingredients: [
      [
        "2 cans chickpeas, drained",
        "Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids",
        480,
      ],
      ["1 large onion, diced", ONION, 150],
      ["3 tomatoes, chopped", TOMATO, 300],
      ["4 cloves garlic", GARLIC, 12],
      ["Thumb of ginger, grated", "Ginger root, raw", 15],
      ["2 tbsp oil", OIL, 28],
      ["Handful of cilantro", "Coriander (cilantro) leaves, raw", 10],
      ["240 g basmati rice", WHITE_RICE_RAW, 240],
    ],
    steps: [
      ["Fry the onion in the oil until deep golden.", 600, [1, 5]],
      ["Add the garlic and ginger and cook for a minute.", 60, [3, 4]],
      ["Add the tomatoes and cook down to a thick paste.", 480, [2]],
      ["Simmer the rice in salted water, covered.", 900, [7]],
      ["Add the chickpeas with a splash of water and simmer.", 600, [0]],
      ["Finish with cilantro and serve with the rice.", null, [6, 7]],
    ],
  },
  {
    title: "Dal tadka",
    description:
      "Yellow lentils with a sizzling cumin, garlic and chili tempering.",
    cuisine: "indian",
    mealTypes: ["lunch", "dinner"],
    tags: ["meal-prep", "budget"],
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 35,
    ingredients: [
      ["250 g dried lentils, rinsed", "Lentils, raw", 250],
      ["1 onion, finely chopped", ONION, 110],
      ["2 tomatoes, chopped", TOMATO, 200],
      ["3 cloves garlic, sliced", GARLIC, 9],
      ["2 tbsp ghee", "Butter oil, anhydrous", 26],
      ["Handful of spinach", "Spinach, raw", 60],
    ],
    steps: [
      ["Simmer the lentils in 1 litre of water until soft.", 1500, [0]],
      [
        "Cook the onion and tomatoes in half the ghee until soft, then stir into the lentils.",
        480,
        [1, 2, 4],
      ],
      ["Wilt the spinach into the dal.", 120, [5]],
      [
        "Sizzle the garlic in the rest of the ghee and pour it over to serve.",
        60,
        [3, 4],
      ],
    ],
  },
  {
    title: "Chipotle chicken burrito bowl",
    description:
      "Smoky chicken over rice with black beans, corn, salsa and avocado.",
    cuisine: "mexican",
    mealTypes: ["lunch", "dinner"],
    tags: ["high-protein", "meal-prep"],
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    ingredients: [
      ["600 g chicken breast", CHICKEN_BREAST_RAW, 600],
      ["250 g long-grain rice", WHITE_RICE_RAW, 250],
      [
        "1 can black beans, drained",
        "Beans, black, mature seeds, canned, low sodium",
        240,
      ],
      ["200 g corn kernels", "Corn, sweet, yellow, raw", 200],
      ["200 g salsa", "Sauce, salsa, ready-to-serve", 200],
      ["1 avocado", "Avocados, raw, all commercial varieties", 150],
      ["1 tbsp oil", OIL, 14],
      ["1 lime", "Limes, raw", 67],
    ],
    steps: [
      ["Simmer the rice, covered, then stir in the lime juice.", 900, [1, 7]],
      [
        "Season the chicken and sear it in the oil until 74 °C inside.",
        720,
        [0, 6],
      ],
      ["Warm the beans and corn in the same pan.", 180, [2, 3]],
      [
        "Slice the chicken and build bowls with salsa and avocado.",
        null,
        [0, 4, 5],
      ],
    ],
  },
  {
    title: "Black bean and sweet potato tacos",
    description:
      "Roasted sweet potato and spiced black beans in warm corn tortillas.",
    cuisine: "mexican",
    mealTypes: ["lunch", "dinner"],
    tags: ["budget"],
    servings: 3,
    prepMinutes: 10,
    cookMinutes: 25,
    ingredients: [
      ["2 sweet potatoes, diced", "Sweet potato, raw, unprepared", 400],
      [
        "1 can black beans, drained",
        "Beans, black, mature seeds, canned, low sodium",
        240,
      ],
      ["9 corn tortillas", "Tortillas, ready-to-bake or -fry, corn", 234],
      ["1 tbsp oil", OIL, 14],
      ["1 avocado", "Avocados, raw, all commercial varieties", 150],
      ["Handful of cilantro", "Coriander (cilantro) leaves, raw", 10],
    ],
    steps: [
      [
        "Toss the sweet potato with the oil and roast at 220 °C until browned.",
        1500,
        [0, 3],
      ],
      ["Warm the beans with a splash of water and mash a few.", 300, [1]],
      ["Warm the tortillas in a dry pan.", 120, [2]],
      [
        "Fill the tortillas and top with avocado and cilantro.",
        null,
        [0, 1, 4, 5],
      ],
    ],
  },
  {
    title: "Turkey and bean chili",
    description: "A lean, hearty chili that gets better the next day.",
    cuisine: "american",
    mealTypes: ["lunch", "dinner"],
    tags: ["high-protein", "meal-prep"],
    servings: 6,
    prepMinutes: 15,
    cookMinutes: 45,
    ingredients: [
      [
        "700 g lean ground turkey",
        "Turkey, ground, 93% lean, 7% fat, raw",
        700,
      ],
      [
        "2 cans kidney beans, drained",
        "Beans, kidney, red, mature seeds, canned, drained solids",
        480,
      ],
      [
        "800 g canned tomatoes",
        "Tomatoes, red, ripe, canned, packed in tomato juice",
        800,
      ],
      ["1 large onion", ONION, 150],
      ["1 red pepper", "Peppers, sweet, red, raw", 120],
      ["3 cloves garlic", GARLIC, 9],
      ["1 tbsp oil", OIL, 14],
    ],
    steps: [
      ["Soften the onion, pepper and garlic in the oil.", 420, [3, 4, 5, 6]],
      ["Brown the turkey, breaking it up.", 480, [0]],
      ["Add the tomatoes and beans and simmer, partly covered.", 1800, [1, 2]],
    ],
  },
  {
    title: "Spaghetti bolognese",
    description: "A weeknight meat sauce over spaghetti.",
    cuisine: "italian",
    mealTypes: ["dinner"],
    tags: [],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 40,
    ingredients: [
      [
        "500 g lean ground beef",
        "Beef, ground, 90% lean meat / 10% fat, raw",
        500,
      ],
      ["320 g spaghetti", "Pasta, dry, enriched", 320],
      [
        "700 g passata",
        "Tomato products, canned, puree, without salt added",
        700,
      ],
      ["1 onion", ONION, 110],
      ["1 carrot", "Carrots, raw", 60],
      ["2 cloves garlic", GARLIC, 6],
      ["30 g parmesan", "Cheese, parmesan, grated", 30],
      ["1 tbsp oil", OIL, 14],
    ],
    steps: [
      ["Soften the onion, carrot and garlic in the oil.", 480, [3, 4, 5, 7]],
      ["Brown the beef well.", 480, [0]],
      ["Add the passata and simmer gently.", 1500, [2]],
      ["Boil the spaghetti until al dente.", 600, [1]],
      ["Toss the pasta with the sauce and finish with parmesan.", null, [1, 6]],
    ],
  },
  {
    title: "Chicken pesto pasta",
    description: "Pasta with seared chicken, basil pesto and cherry tomatoes.",
    cuisine: "italian",
    mealTypes: ["lunch", "dinner"],
    tags: ["quick", "high-protein"],
    servings: 3,
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: [
      ["450 g chicken breast", CHICKEN_BREAST_RAW, 450],
      ["240 g penne", "Pasta, dry, enriched", 240],
      ["90 g pesto", "Sauce, pesto, ready-to-serve, shelf stable", 90],
      ["200 g cherry tomatoes", TOMATO, 200],
      ["1 tbsp oil", OIL, 14],
    ],
    steps: [
      ["Boil the penne until al dente.", 660, [1]],
      [
        "Sear the chicken in the oil until 74 °C inside, then slice.",
        720,
        [0, 4],
      ],
      [
        "Toss the pasta with the pesto, tomatoes and chicken.",
        null,
        [0, 1, 2, 3],
      ],
    ],
  },
  {
    title: "Shakshuka",
    description: "Eggs poached in a spiced pepper and tomato sauce.",
    cuisine: "middle eastern",
    mealTypes: ["breakfast", "lunch"],
    tags: ["quick"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: [
      ["4 eggs", "Egg, whole, raw, fresh", 200],
      [
        "400 g canned tomatoes",
        "Tomatoes, red, ripe, canned, packed in tomato juice",
        400,
      ],
      ["1 red pepper, sliced", "Peppers, sweet, red, raw", 120],
      ["1 onion, sliced", ONION, 110],
      ["2 cloves garlic", GARLIC, 6],
      ["40 g feta", "Cheese, feta", 40],
      ["1 tbsp oil", OIL, 14],
      [
        "2 slices crusty bread",
        "Bread, french or vienna (includes sourdough)",
        80,
      ],
    ],
    steps: [
      ["Soften the onion, pepper and garlic in the oil.", 480, [2, 3, 4, 6]],
      ["Add the tomatoes and simmer until thick.", 480, [1]],
      [
        "Make four wells and crack in the eggs; cover until the whites set.",
        420,
        [0],
      ],
      ["Crumble over the feta and serve with bread.", null, [5, 7]],
    ],
  },
  {
    title: "Greek yogurt berry parfait",
    description: "Thick yogurt layered with berries and granola.",
    cuisine: "american",
    mealTypes: ["breakfast", "snack"],
    tags: ["quick", "high-protein", "no-cook"],
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    ingredients: [
      ["250 g Greek yogurt", GREEK_YOGURT, 250],
      ["80 g blueberries", "Blueberries, raw", 80],
      ["60 g strawberries", "Strawberries, raw", 60],
      ["35 g granola", "Cereals ready-to-eat, granola, homemade", 35],
      ["1 tsp honey", "Honey", 7],
    ],
    steps: [
      ["Layer the yogurt and berries in a glass.", null, [0, 1, 2]],
      ["Top with granola and a drizzle of honey.", null, [3, 4]],
    ],
  },
  {
    title: "Peanut butter overnight oats",
    description:
      "Make it the night before: oats, milk, banana and peanut butter.",
    cuisine: "american",
    mealTypes: ["breakfast"],
    tags: ["meal-prep", "no-cook"],
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    ingredients: [
      [
        "60 g rolled oats",
        "Cereals, oats, regular and quick, not fortified, dry",
        60,
      ],
      [
        "200 ml milk",
        "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D",
        200,
      ],
      ["1 tbsp chia seeds", "Seeds, chia seeds, dried", 12],
      ["1 tbsp peanut butter", "Peanut butter, smooth style, without salt", 16],
      ["1 banana, sliced", "Bananas, raw", 118],
    ],
    steps: [
      ["Stir the oats, milk and chia together in a jar.", null, [0, 1, 2]],
      ["Chill overnight.", 28800, []],
      ["Top with peanut butter and banana in the morning.", null, [3, 4]],
    ],
  },
  {
    title: "Spinach and cheddar omelette",
    description: "A three-egg omelette with wilted spinach and sharp cheddar.",
    cuisine: "american",
    mealTypes: ["breakfast"],
    tags: ["quick", "high-protein"],
    servings: 1,
    prepMinutes: 3,
    cookMinutes: 7,
    ingredients: [
      ["3 eggs", "Egg, whole, raw, fresh", 150],
      ["Handful of spinach", "Spinach, raw", 40],
      ["25 g cheddar", "Cheese, cheddar, sharp, sliced", 25],
      ["1 tsp butter", "Butter, salted", 5],
      [
        "1 slice whole-wheat toast",
        "Bread, whole-wheat, commercially prepared",
        32,
      ],
    ],
    steps: [
      ["Wilt the spinach in the butter.", 60, [1, 3]],
      ["Pour in the beaten eggs and cook gently until nearly set.", 180, [0]],
      ["Add the cheddar, fold and serve with toast.", null, [2, 4]],
    ],
  },
  {
    title: "Salmon teriyaki rice bowl",
    description: "Glazed salmon with rice, edamame and cucumber.",
    cuisine: "japanese",
    mealTypes: ["lunch", "dinner"],
    tags: ["high-protein", "quick"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: [
      ["2 salmon fillets", "Fish, salmon, Atlantic, farmed, raw", 300],
      ["160 g sushi rice", WHITE_RICE_RAW, 160],
      ["100 g shelled edamame", "Edamame, frozen, unprepared", 100],
      ["1 cucumber", "Cucumber, with peel, raw", 150],
      ["3 tbsp teriyaki sauce", "Sauce, teriyaki, ready-to-serve", 54],
    ],
    steps: [
      ["Simmer the rice, covered.", 900, [1]],
      [
        "Roast the salmon at 200 °C, brushing with teriyaki halfway.",
        720,
        [0, 4],
      ],
      ["Cook the edamame and slice the cucumber.", 240, [2, 3]],
      ["Serve the salmon over rice with the vegetables.", null, [0, 1, 2, 3]],
    ],
  },
  {
    title: "Thai basil chicken",
    description:
      "Pad kra pao: minced chicken stir-fried with garlic, chili and basil.",
    cuisine: "thai",
    mealTypes: ["dinner"],
    tags: ["quick", "high-protein", "spicy"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 10,
    ingredients: [
      ["400 g ground chicken", "Chicken, ground, raw", 400],
      ["4 cloves garlic", GARLIC, 12],
      ["2 red chilies", "Peppers, hot chili, red, raw", 20],
      ["Large handful of basil", "Basil, fresh", 20],
      ["2 tbsp soy sauce", "Soy sauce made from soy (tamari)", 32],
      ["1 tbsp fish sauce", "Sauce, fish, ready-to-serve", 18],
      ["1 tbsp oil", OIL, 14],
      ["160 g jasmine rice", WHITE_RICE_RAW, 160],
    ],
    steps: [
      ["Simmer the rice, covered.", 900, [7]],
      ["Fry the garlic and chilies in the oil for 30 seconds.", 30, [1, 2, 6]],
      ["Add the chicken and stir-fry until cooked through.", 300, [0]],
      [
        "Season with soy and fish sauce, then toss in the basil.",
        null,
        [3, 4, 5],
      ],
    ],
  },
  {
    title: "Tofu and broccoli stir-fry",
    description: "Crisp tofu and broccoli in a garlicky soy glaze.",
    cuisine: "chinese",
    mealTypes: ["dinner"],
    tags: ["quick"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 15,
    ingredients: [
      [
        "400 g firm tofu, cubed",
        "Tofu, raw, firm, prepared with calcium sulfate",
        400,
      ],
      ["300 g broccoli florets", "Broccoli, raw", 300],
      ["3 tbsp soy sauce", "Soy sauce made from soy (tamari)", 48],
      ["3 cloves garlic", GARLIC, 9],
      ["1 tbsp sesame oil", "Oil, sesame, salad or cooking", 14],
      ["160 g rice", WHITE_RICE_RAW, 160],
    ],
    steps: [
      ["Simmer the rice, covered.", 900, [5]],
      ["Fry the tofu in the oil until golden on all sides.", 480, [0, 4]],
      [
        "Add the broccoli and garlic with a splash of water and cover.",
        240,
        [1, 3],
      ],
      ["Toss with the soy sauce and serve over rice.", null, [2, 5]],
    ],
  },
  {
    title: "Beef bulgogi bowl",
    description:
      "Sweet-savory marinated beef with rice and quick-pickled cucumber.",
    cuisine: "korean",
    mealTypes: ["dinner"],
    tags: ["high-protein"],
    servings: 3,
    prepMinutes: 20,
    cookMinutes: 10,
    ingredients: [
      [
        "450 g thinly sliced sirloin",
        'Beef, top sirloin, steak, separable lean only, trimmed to 1/8" fat, choice, raw',
        450,
      ],
      ["3 tbsp soy sauce", "Soy sauce made from soy (tamari)", 48],
      ["1 tbsp sugar", "Sugars, granulated", 12],
      ["1 pear, grated", "Pears, raw", 120],
      ["3 cloves garlic", GARLIC, 9],
      ["1 tbsp sesame oil", "Oil, sesame, salad or cooking", 14],
      ["240 g rice", WHITE_RICE_RAW, 240],
      ["1 cucumber", "Cucumber, with peel, raw", 150],
    ],
    steps: [
      [
        "Marinate the beef in the soy, sugar, pear, garlic and sesame oil.",
        900,
        [0, 1, 2, 3, 4, 5],
      ],
      ["Simmer the rice, covered.", 900, [6]],
      ["Sear the beef in a very hot pan in batches.", 300, [0]],
      ["Serve over rice with sliced cucumber.", null, [6, 7]],
    ],
  },
  {
    title: "Mediterranean chickpea salad",
    description: "Chickpeas, cucumber, tomato and herbs in a lemon dressing.",
    cuisine: "mediterranean",
    mealTypes: ["lunch"],
    tags: ["quick", "no-cook", "meal-prep"],
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 0,
    ingredients: [
      [
        "1 can chickpeas, drained",
        "Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids",
        240,
      ],
      ["1 cucumber, diced", "Cucumber, with peel, raw", 200],
      ["200 g tomatoes, diced", TOMATO, 200],
      ["1/2 red onion", ONION, 60],
      ["Handful of parsley", "Parsley, fresh", 15],
      ["2 tbsp olive oil", OIL, 28],
      ["1 lemon", "Lemon juice, raw", 45],
    ],
    steps: [
      ["Combine the chickpeas and chopped vegetables.", null, [0, 1, 2, 3]],
      [
        "Dress with the oil and lemon, season and fold in the parsley.",
        null,
        [4, 5, 6],
      ],
    ],
  },
  {
    title: "Lemon herb chicken with roasted potatoes",
    description:
      "One tray: lemony chicken thighs, crisp potatoes and green beans.",
    cuisine: "mediterranean",
    mealTypes: ["dinner"],
    tags: ["high-protein"],
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 40,
    ingredients: [
      ["700 g chicken thighs", CHICKEN_THIGH_RAW, 700],
      ["800 g potatoes, cut in wedges", "Potatoes, flesh and skin, raw", 800],
      ["300 g green beans", "Beans, snap, green, raw", 300],
      ["2 tbsp olive oil", OIL, 28],
      ["1 lemon", "Lemon juice, raw", 45],
      ["4 cloves garlic", GARLIC, 12],
    ],
    steps: [
      [
        "Toss everything except the beans with the oil, lemon and garlic.",
        null,
        [0, 1, 3, 4, 5],
      ],
      ["Roast at 210 °C.", 1800, [0, 1]],
      [
        "Add the beans and roast until the chicken reaches 74 °C inside.",
        600,
        [2],
      ],
    ],
  },
  {
    title: "Banana protein smoothie",
    description: "Whey, banana, milk and peanut butter, blended thick.",
    cuisine: "american",
    mealTypes: ["breakfast", "snack"],
    tags: ["quick", "high-protein", "no-cook"],
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    ingredients: [
      ["1 scoop whey protein", "Beverages, Protein powder whey based", 32],
      ["1 frozen banana", "Bananas, raw", 118],
      [
        "250 ml milk",
        "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D",
        250,
      ],
      ["1 tbsp peanut butter", "Peanut butter, smooth style, without salt", 16],
    ],
    steps: [["Blend everything until smooth.", 60, [0, 1, 2, 3]]],
  },
  {
    title: "Hummus and crunchy vegetables",
    description: "A quick snack plate of hummus, carrots, cucumber and pita.",
    cuisine: "middle eastern",
    mealTypes: ["snack"],
    tags: ["quick", "no-cook"],
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    ingredients: [
      ["80 g hummus", "Hummus, commercial", 80],
      ["1 carrot, in sticks", "Carrots, raw", 80],
      ["1/2 cucumber, in sticks", "Cucumber, with peel, raw", 100],
      ["1/2 pita", "Bread, pita, whole-wheat", 32],
    ],
    steps: [["Arrange everything on a plate and dip.", null, [0, 1, 2, 3]]],
  },
  {
    title: "Garlic shrimp fried rice",
    description: "Day-old rice fried with shrimp, egg, peas and scallions.",
    cuisine: "chinese",
    mealTypes: ["dinner"],
    tags: ["quick", "high-protein"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 12,
    ingredients: [
      ["300 g shrimp, peeled", "Crustaceans, shrimp, raw", 300],
      [
        "400 g cooked rice, cold",
        "Rice, white, long-grain, regular, enriched, cooked",
        400,
      ],
      ["2 eggs", "Egg, whole, raw, fresh", 100],
      ["100 g peas", "Peas, green, frozen, unprepared", 100],
      ["2 tbsp soy sauce", "Soy sauce made from soy (tamari)", 32],
      ["3 cloves garlic", GARLIC, 9],
      ["1 tbsp oil", OIL, 14],
    ],
    steps: [
      [
        "Fry the garlic and shrimp in the oil until pink, then set aside.",
        180,
        [0, 5, 6],
      ],
      ["Scramble the eggs in the pan.", 60, [2]],
      [
        "Add the rice and peas and fry until hot and crisp in places.",
        300,
        [1, 3],
      ],
      ["Return the shrimp and season with soy sauce.", null, [0, 4]],
    ],
  },
];
