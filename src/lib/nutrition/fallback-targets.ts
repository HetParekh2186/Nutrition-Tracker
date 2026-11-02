// Temporary fixed targets for Phase 1, used until a user has computed
// targets (Phase 2 replaces these with data/dri.json and rules 4 and 5).
// Values are general adult RDA / AI amounts.

import { N } from "./catalog";
import { FALLBACK_MACROS } from "./targets";

export type TargetRange = { min: number | null; max: number | null };

export const FALLBACK_TARGETS: Record<number, TargetRange> = {
  [N.energy]: { min: FALLBACK_MACROS.kcal, max: null },
  [N.protein]: { min: FALLBACK_MACROS.proteinG, max: null },
  [N.carbs]: { min: FALLBACK_MACROS.carbsG, max: null },
  [N.fat]: { min: FALLBACK_MACROS.fatG, max: null },
  [N.fiber]: { min: 38, max: null },
  [N.addedSugars]: { min: null, max: 50 },

  1106: { min: 900, max: 3000 },
  1162: { min: 90, max: 2000 },
  1114: { min: 15, max: 100 },
  1109: { min: 15, max: 1000 },
  1185: { min: 120, max: null },
  1165: { min: 1.2, max: null },
  1166: { min: 1.3, max: null },
  1167: { min: 16, max: 35 },
  1170: { min: 5, max: null },
  1175: { min: 1.3, max: 100 },
  1178: { min: 2.4, max: null },
  1190: { min: 400, max: 1000 },
  1180: { min: 550, max: 3500 },

  1087: { min: 1000, max: 2500 },
  1089: { min: 8, max: 45 },
  1090: { min: 400, max: null },
  1091: { min: 700, max: 4000 },
  1092: { min: 3400, max: null },
  [N.sodium]: { min: 1500, max: 2300 },
  1095: { min: 11, max: 40 },
  1098: { min: 0.9, max: 10 },
  1101: { min: 2.3, max: 11 },
  1103: { min: 55, max: 400 },

  1258: { min: null, max: 24 },
  1257: { min: null, max: 2 },
  1253: { min: null, max: 300 },
  1404: { min: 1.6, max: null },
};
