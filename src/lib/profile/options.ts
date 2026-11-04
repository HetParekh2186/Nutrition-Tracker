// Labels and descriptions for profile and preference choices.

import type { AnimalFood, DietType } from "@/lib/db/enums";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/targets";

export const SEX_CHOICES: { value: Sex; label: string; description: string }[] =
  [
    {
      value: "female",
      label: "Female",
      description: "Used only for the energy formula",
    },
    {
      value: "male",
      label: "Male",
      description: "Used only for the energy formula",
    },
  ];

export const ACTIVITY_CHOICES: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Desk job, little exercise",
  },
  {
    value: "light",
    label: "Light",
    description: "Exercise 1 to 3 days a week",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Exercise 3 to 5 days a week",
  },
  {
    value: "active",
    label: "Active",
    description: "Hard exercise 6 to 7 days a week",
  },
  {
    value: "very_active",
    label: "Very active",
    description: "Physical job or twice-a-day training",
  },
];

export const GOAL_CHOICES: {
  value: Goal;
  label: string;
  description: string;
}[] = [
  { value: "lose", label: "Lose fat", description: "20% below maintenance" },
  {
    value: "recomp",
    label: "Recomposition",
    description: "10% below, high protein",
  },
  { value: "maintain", label: "Maintain", description: "Eat at maintenance" },
  {
    value: "gain",
    label: "Build muscle",
    description: "10% above maintenance",
  },
];

export const DIET_CHOICES: {
  value: DietType;
  label: string;
  description: string;
}[] = [
  { value: "omnivore", label: "Everything", description: "No restrictions" },
  { value: "pescatarian", label: "Pescatarian", description: "Fish, no meat" },
  {
    value: "vegetarian",
    label: "Vegetarian",
    description: "Dairy, no meat, fish or eggs",
  },
  {
    value: "eggetarian",
    label: "Eggetarian",
    description: "Eggs and dairy, no meat or fish",
  },
  { value: "vegan", label: "Vegan", description: "No animal products" },
];

/** The diet switches, grouped the way people think about them. */
export const ANIMAL_FOOD_GROUPS: {
  label: string;
  foods: { value: AnimalFood; label: string }[];
}[] = [
  {
    label: "Meat",
    foods: [
      { value: "chicken", label: "Chicken" },
      { value: "poultry", label: "Turkey and duck" },
      { value: "beef", label: "Beef" },
      { value: "pork", label: "Pork" },
      { value: "lamb", label: "Lamb and goat" },
    ],
  },
  {
    label: "Seafood",
    foods: [
      { value: "fish", label: "Fish" },
      { value: "shellfish", label: "Shellfish" },
    ],
  },
  {
    label: "Other animal foods",
    foods: [
      { value: "eggs", label: "Eggs" },
      { value: "dairy", label: "Dairy" },
      { value: "honey", label: "Honey" },
    ],
  },
];

export const CUISINE_SUGGESTIONS = [
  "indian",
  "italian",
  "mexican",
  "chinese",
  "japanese",
  "thai",
  "mediterranean",
  "korean",
  "american",
  "middle eastern",
];

export const EXCLUSION_SUGGESTIONS = [
  "peanuts",
  "tree nuts",
  "shellfish",
  "gluten",
  "dairy",
  "pork",
  "beef",
  "mushrooms",
];

export const EQUIPMENT_CHOICES = [
  { value: "oven", label: "Oven" },
  { value: "air_fryer", label: "Air fryer" },
  { value: "instant_pot", label: "Pressure cooker" },
  { value: "grill", label: "Grill" },
  { value: "microwave", label: "Microwave" },
  { value: "blender", label: "Blender" },
] as const;

export const SPICE_LABELS = ["None", "Mild", "Medium", "Hot"];
