// Cook Mode shapes. Client-safe.

import type { Macros } from "@/lib/nutrition/macros";
import type { RecipeDetailDTO } from "@/lib/recipes/types";

import type { MacroDiff, Substitution } from "./substitute";

export type ProposalDTO = {
  /** cook_messages id holding the proposal. */
  id: number;
  status: "pending" | "accepted" | "rejected";
  substitution: Substitution;
  originalText: string;
  newFoodName: string;
  diff: MacroDiff;
};

export type ChatMessageDTO =
  | {
      id: number;
      role: "user" | "assistant";
      text: string;
      step: number | null;
    }
  | {
      id: number;
      role: "proposal";
      proposal: ProposalDTO;
      step: number | null;
    };

export type CookSessionDTO = {
  id: string;
  recipe: RecipeDetailDTO;
  servings: number;
  currentStep: number;
  substitutions: Substitution[];
  /** Per serving with accepted swaps applied, from USDA data. */
  perServing: Macros;
  messages: ChatMessageDTO[];
  completedAt: string | null;
};
