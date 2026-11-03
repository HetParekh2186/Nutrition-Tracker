import { describe, expect, it } from "vitest";

import { cosine } from "@/lib/embeddings/hash";

import {
  applyColdStart,
  cuisineWeights,
  decay,
  eventWeight,
  signalWeight,
  tasteEmbedding,
  type WeightedEvent,
} from "./taste";

describe("event weights", () => {
  it("uses the spec's table", () => {
    expect(eventWeight("cook_complete")).toBe(3);
    expect(eventWeight("log")).toBe(2);
    expect(eventWeight("save")).toBe(1.5);
    expect(eventWeight("rate", 5)).toBe(2);
    expect(eventWeight("rate", 1)).toBe(-2);
    expect(eventWeight("skip")).toBe(-0.5);
    expect(eventWeight("meal")).toBe(1);
  });
});

describe("decay (30-day half-life)", () => {
  it("halves every 30 days", () => {
    expect(decay(0)).toBe(1);
    expect(decay(30)).toBeCloseTo(0.5, 10);
    expect(decay(60)).toBeCloseTo(0.25, 10);
  });

  it("matches the spec: a cook 30 days ago counts 1.5, 60 days 0.75", () => {
    expect(
      signalWeight({ signal: "cook_complete", daysAgo: 30, embedding: null }),
    ).toBeCloseTo(1.5, 10);
    expect(
      signalWeight({ signal: "cook_complete", daysAgo: 60, embedding: null }),
    ).toBeCloseTo(0.75, 10);
  });
});

describe("tasteEmbedding", () => {
  const indian = [1, 0, 0];
  const italian = [0, 1, 0];

  it("leans toward what you cook most and recently", () => {
    const v = tasteEmbedding([
      { signal: "cook_complete", daysAgo: 0, embedding: indian },
      { signal: "cook_complete", daysAgo: 0, embedding: indian },
      { signal: "save", daysAgo: 0, embedding: italian },
    ])!;
    expect(cosine(v, indian)).toBeGreaterThan(cosine(v, italian));
  });

  it("is pushed away by low ratings and skips", () => {
    const v = tasteEmbedding([
      { signal: "cook_complete", daysAgo: 0, embedding: indian },
      { signal: "rate", rating: 1, daysAgo: 0, embedding: italian },
    ])!;
    expect(cosine(v, italian)).toBeLessThan(0);
  });

  it("is null without usable history", () => {
    expect(tasteEmbedding([])).toBeNull();
    expect(
      tasteEmbedding([
        { signal: "rate", rating: 3, daysAgo: 0, embedding: indian },
      ]),
    ).toBeNull();
  });
});

describe("applyColdStart", () => {
  const save: WeightedEvent = {
    signal: "save",
    daysAgo: 12,
    embedding: [1, 0],
  };

  it("counts onboarding picks as cooked today when there is no history", () => {
    expect(applyColdStart([save])[0]).toMatchObject({
      signal: "cook_complete",
      daysAgo: 0,
    });
  });

  it("leaves saves alone once real history exists", () => {
    const events = applyColdStart([
      save,
      { signal: "meal", daysAgo: 1, embedding: [0, 1] },
    ]);
    expect(events[0]).toEqual(save);
  });
});

describe("cuisineWeights", () => {
  it("shares positive weight by cuisine", () => {
    const w = cuisineWeights([
      {
        signal: "cook_complete",
        daysAgo: 0,
        embedding: null,
        cuisine: "Indian",
      },
      {
        signal: "cook_complete",
        daysAgo: 0,
        embedding: null,
        cuisine: "indian",
      },
      { signal: "save", daysAgo: 0, embedding: null, cuisine: "italian" },
      { signal: "skip", daysAgo: 0, embedding: null, cuisine: "thai" },
    ]);
    expect(w.indian).toBeCloseTo(6 / 7.5, 3);
    expect(w.italian).toBeCloseTo(1.5 / 7.5, 3);
    expect(w.thai).toBeUndefined();
  });
});
