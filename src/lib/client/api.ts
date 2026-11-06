// Typed browser fetchers for the app's own API.

import type {
  CopyRequestInput,
  CustomFoodRequestInput,
  DiaryPatchInput,
  NewDiaryEntryInput,
  AdaptRequest,
  CompleteCookInput,
  CookPatchInput,
  GenerateRequestInput,
  InteractionRequestInput,
  LogMealInput,
  MealInputDraft,
  PreferencesUpdateInput,
  ProfileUpdateInput,
  RecipeInputDraft,
  TargetsUpdateInput,
} from "@/lib/api/schemas";
import type { DaySummaryDTO, DiaryDayDTO } from "@/lib/diary/types";
import type {
  FoodDetail,
  FoodHit,
  FoodSearchResult,
  MyFoodDTO,
  MyFoodsSort,
} from "@/lib/foods/types";
import type { MealDTO } from "@/lib/meals/types";
import type { RangeSummaryDTO, SourcesDTO } from "@/lib/insights/types";
import type { RecipeDetailDTO, RecipeSummaryDTO } from "@/lib/recipes/types";
import type { RecommendationsDTO } from "@/lib/recommend/types";
import type { CookSessionDTO } from "@/lib/cook/types";
import type { ParsedLogItem } from "@/lib/log/types";
import type { z } from "zod";
import type {
  PreferencesDTO,
  ProfileDTO,
  TargetRowDTO,
} from "@/lib/profile/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  searchFoods: (q: string, signal?: AbortSignal) =>
    request<FoodSearchResult>(
      `/api/foods/search?q=${encodeURIComponent(q)}&limit=12`,
      { signal },
    ),
  food: (id: number) => request<FoodDetail>(`/api/foods/${id}`),
  createFood: (input: CustomFoodRequestInput) =>
    request<FoodDetail>("/api/foods", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  myFoods: (params: {
    q?: string;
    sort?: MyFoodsSort;
    filter?: "all" | "custom";
  }) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    );
    return request<MyFoodDTO[]>(`/api/foods/mine?${qs.toString()}`);
  },
  meals: () => request<MealDTO[]>("/api/meals"),
  meal: (id: string) => request<MealDTO>(`/api/meals/${id}`),
  createMeal: (input: MealInputDraft) =>
    request<{ id: string }>("/api/meals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMeal: (id: string, input: MealInputDraft) =>
    request<{ id: string }>(`/api/meals/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deleteMeal: (id: string) =>
    request<void>(`/api/meals/${id}`, { method: "DELETE" }),
  logMeal: (id: string, input: LogMealInput) =>
    request<{ ids: number[] }>(`/api/meals/${id}/log`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  diary: (date: string) => request<DiaryDayDTO>(`/api/diary?date=${date}`),
  summary: (date: string) =>
    request<DaySummaryDTO>(`/api/summary/day?date=${date}`),
  addEntry: (input: NewDiaryEntryInput) =>
    request<{ id: number }>("/api/diary", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateEntry: (id: number, patch: DiaryPatchInput) =>
    request<{ id: number }>(`/api/diary/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteEntry: (id: number) =>
    request<void>(`/api/diary/${id}`, { method: "DELETE" }),
  copy: (input: CopyRequestInput) =>
    request<{ copied: number }>("/api/diary/copy", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  profile: () => request<ProfileDTO>("/api/profile"),
  updateProfile: (input: ProfileUpdateInput) =>
    request<ProfileDTO>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  preferences: () => request<PreferencesDTO>("/api/preferences"),
  updatePreferences: (input: PreferencesUpdateInput) =>
    request<PreferencesDTO>("/api/preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  targets: () => request<TargetRowDTO[]>("/api/targets"),
  updateTargets: (input: TargetsUpdateInput) =>
    request<TargetRowDTO[]>("/api/targets", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  range: (from: string, to: string) =>
    request<RangeSummaryDTO>(`/api/summary/range?from=${from}&to=${to}`),
  sources: (nutrientId: number, from: string, to: string) =>
    request<SourcesDTO>(
      `/api/insights/sources?nutrient=${nutrientId}&from=${from}&to=${to}`,
    ),
  recipes: (params: { query?: string; slot?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    );
    return request<RecipeSummaryDTO[]>(`/api/recipes?${qs.toString()}`);
  },
  recipe: (id: string, servings?: number) =>
    request<RecipeDetailDTO>(
      `/api/recipes/${id}${servings ? `?servings=${servings}` : ""}`,
    ),
  createRecipe: (input: RecipeInputDraft) =>
    request<{ id: string }>("/api/recipes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRecipe: (id: string, input: RecipeInputDraft) =>
    request<{ id: string }>(`/api/recipes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteRecipe: (id: string) =>
    request<void>(`/api/recipes/${id}`, { method: "DELETE" }),
  recommendations: (slot: string, limit = 10) =>
    request<RecommendationsDTO>(
      `/api/recommendations?slot=${slot}&limit=${limit}`,
    ),
  interact: (recipeId: string, input: InteractionRequestInput) =>
    request<{ ok: true }>(`/api/recipes/${recipeId}/interactions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  barcode: (code: string) =>
    request<FoodHit>(`/api/foods/barcode/${encodeURIComponent(code)}`),
  parseLog: (text: string) =>
    request<{ items: ParsedLogItem[] }>("/api/log/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  startCook: (recipeId: string, servings: number) =>
    request<{ id: string }>("/api/cook-sessions", {
      method: "POST",
      body: JSON.stringify({ recipe_id: recipeId, servings }),
    }),
  patchCook: (id: string, patch: CookPatchInput) =>
    request<CookSessionDTO>(`/api/cook-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  completeCook: (id: string, input: CompleteCookInput) =>
    request<{ recipeId: string; entryId: number }>(
      `/api/cook-sessions/${id}/complete`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  cookMessage: (id: string, text: string) =>
    streamRequest(`/api/cook-sessions/${id}/messages`, { text }),
  /** Streaming endpoints return the raw Response for readNdjson. */
  generateRecipe: (input: GenerateRequestInput) =>
    streamRequest("/api/recipes/generate", input),
  adaptRecipe: (id: string, input: z.input<typeof AdaptRequest>) =>
    streamRequest(`/api/recipes/${id}/adapt`, input),
  addToPantry: (items: string[]) =>
    request<{ pantry: string[] }>("/api/pantry", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};

async function streamRequest(path: string, body: unknown): Promise<Response> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return res;
}
