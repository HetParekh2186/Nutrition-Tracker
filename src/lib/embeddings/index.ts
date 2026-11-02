// Text embeddings for recipes and logged meals (SPEC.md: Voyage AI,
// voyage-3.5, 1024 dims; swap the model with one env var). Without a
// VOYAGE_API_KEY the local hashed embedding is used instead; run
// `pnpm embed --all` after adding a key so every vector shares one space.

import { z } from "zod";

import { DIMENSIONS, hashEmbedding } from "./hash";

export { cosine } from "./hash";
export { DIMENSIONS };

export type EmbedPurpose = "document" | "query";

const VoyageResponse = z.object({
  data: z.array(
    z.object({ embedding: z.array(z.number()), index: z.number() }),
  ),
});

export function embeddingProvider(): "voyage" | "local" {
  return process.env.VOYAGE_API_KEY ? "voyage" : "local";
}

async function voyage(
  texts: string[],
  purpose: EmbedPurpose,
): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: process.env.VOYAGE_MODEL || "voyage-3.5",
      input_type: purpose,
      output_dimension: DIMENSIONS,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Voyage embeddings failed: ${res.status} ${await res.text()}`,
    );
  }
  const { data } = VoyageResponse.parse(await res.json());
  return [...data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Embed texts in batches of 64 (Voyage's per-request comfort zone). */
export async function embedTexts(
  texts: string[],
  purpose: EmbedPurpose = "document",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (embeddingProvider() === "local")
    return texts.map((t) => hashEmbedding(t));
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    out.push(...(await voyage(texts.slice(i, i + 64), purpose)));
  }
  return out;
}

/** The text a recipe is embedded from. */
export function recipeText(r: {
  title: string;
  cuisine: string | null;
  mealTypes: string[];
  ingredients: string[];
  description?: string | null;
}): string {
  return [
    r.title,
    r.cuisine ? `${r.cuisine} cuisine` : null,
    r.mealTypes.length ? `for ${r.mealTypes.join(", ")}` : null,
    `ingredients: ${r.ingredients.join(", ")}`,
    r.description,
  ]
    .filter(Boolean)
    .join(". ");
}

/** SPEC.md: one text per meal slot per day for non-recipe meals. */
export function mealText(slot: string, foodNames: string[]): string {
  return `${slot}: ${foodNames.join(", ")}`;
}
