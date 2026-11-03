// Shapes returned by /api/log/parse. Safe to import from client code.

import type { FoodHit } from "@/lib/foods/types";

export type ParsedCandidate = {
  food: FoodHit;
  grams: number;
  portionLabel: string | null;
  method: "mass" | "portion" | "volume" | "guess";
};

export type ParsedLogItem = {
  /** The part of the input this came from, "2 eggs". */
  text: string;
  query: string;
  quantity: number;
  unit: string;
  /** How sure the match is, 0 to 1; under 0.7 the sheet asks to check. */
  confidence: number;
  needsReview: boolean;
  /** Best match first, then alternatives. Empty when nothing matched. */
  candidates: ParsedCandidate[];
};
