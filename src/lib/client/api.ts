// Typed browser fetchers for the app's own API.

import type {
  CopyRequestInput,
  CustomFoodRequestInput,
  DiaryPatchInput,
  NewDiaryEntryInput,
  PreferencesUpdateInput,
  ProfileUpdateInput,
  TargetsUpdateInput,
} from "@/lib/api/schemas";
import type { DaySummaryDTO, DiaryDayDTO } from "@/lib/diary/types";
import type { FoodDetail, FoodSearchResult } from "@/lib/foods/types";
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
};
