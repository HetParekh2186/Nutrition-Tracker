// Shapes for the Insights APIs. Client-safe.

import type { NutrientRowDTO } from "@/lib/diary/types";
import type { Macros } from "@/lib/nutrition/macros";
import type { DayTotal, Source } from "@/lib/nutrition/range";

export type RangeSummaryDTO = {
  from: string;
  to: string;
  days: DayTotal[];
  loggedDays: number;
  averageMacros: Macros;
  targetMacros: Macros;
  /** `amount` is the mean daily amount over logged days. */
  nutrients: NutrientRowDTO[];
};

export type SourcesDTO = {
  nutrientId: number;
  name: string;
  unit: NutrientRowDTO["unit"];
  from: string;
  to: string;
  loggedDays: number;
  sources: (Source & { dailyAverage: number })[];
};
