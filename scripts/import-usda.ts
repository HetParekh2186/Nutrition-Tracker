// Imports USDA FoodData Central Foundation and SR Legacy foods, their
// nutrients (per 100 g) and portions. Downloads the CSV zips on first run.
// Safe to re-run: foods are upserted by (source, source_id).
//
// Usage: pnpm import:usda

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { parse } from "csv-parse";

import { IMPORT_FALLBACKS, NUTRIENTS } from "../src/lib/nutrition/catalog";

import { chunk, scriptSql } from "./lib/db";
import { fdcUnit, portionLabel, resolveNutrients } from "./lib/fdc";
import { seedNutrients } from "./lib/nutrients";

type Dataset = {
  source: "usda_foundation" | "usda_sr_legacy";
  folder: string;
  dataType: string;
};

// FDC's 2026-10-29 Foundation release shipped without food.csv,
// food_nutrient.csv and food_portion.csv, so pin the last complete one.
const DATASETS: Dataset[] = [
  {
    source: "usda_foundation",
    folder: "FoodData_Central_foundation_food_csv_2026-04-30",
    dataType: "foundation_food",
  },
  {
    source: "usda_sr_legacy",
    folder: "FoodData_Central_sr_legacy_food_csv_2018-04",
    dataType: "sr_legacy_food",
  },
];

const DATA_DIR = join(process.cwd(), "data", "fdc");
const BASE_URL = "https://fdc.nal.usda.gov/fdc-datasets";

type Row = Record<string, string>;

async function* readCsv(path: string): AsyncGenerator<Row> {
  const parser = createReadStream(path).pipe(
    parse({ columns: true, relax_quotes: true, skip_empty_lines: true }),
  );
  for await (const row of parser) yield row as Row;
}

async function ensureDataset(folder: string): Promise<string> {
  const dir = join(DATA_DIR, folder);
  if (existsSync(join(dir, "food.csv"))) return dir;
  mkdirSync(DATA_DIR, { recursive: true });
  const zip = join(DATA_DIR, `${folder}.zip`);
  if (!existsSync(zip)) {
    console.log(`Downloading ${folder}.zip`);
    const res = await fetch(`${BASE_URL}/${folder}.zip`);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.url}`);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(zip, Buffer.from(await res.arrayBuffer()));
  }
  // `tar` reads zips on Windows and macOS; fall back to unzip on Linux.
  try {
    execFileSync("unzip", ["-q", "-o", zip, "-d", DATA_DIR]);
  } catch {
    execFileSync("tar", ["-xf", zip, "-C", DATA_DIR]);
  }
  if (!existsSync(join(dir, "food.csv"))) {
    throw new Error(`${folder} has no food.csv after extracting`);
  }
  return dir;
}

/** Fail loudly if an id in our catalog means something else in FDC. */
async function confirmNutrientIds(dir: string): Promise<void> {
  const fdc = new Map<number, { name: string; unit: string }>();
  for await (const row of readCsv(join(dir, "nutrient.csv"))) {
    fdc.set(Number(row.id), {
      name: row.name ?? "",
      unit: row.unit_name ?? "",
    });
  }
  const problems: string[] = [];
  for (const n of NUTRIENTS) {
    const match = fdc.get(n.id);
    if (!match) problems.push(`${n.id} ${n.name}: not in nutrient.csv`);
    else if (fdcUnit(match.unit) !== n.unit) {
      problems.push(
        `${n.id} ${n.name}: unit ${match.unit}, expected ${n.unit}`,
      );
    }
  }
  if (problems.length) {
    throw new Error(`Nutrient id check failed:\n${problems.join("\n")}`);
  }
}

async function importDataset(sql: ReturnType<typeof scriptSql>, ds: Dataset) {
  const dir = await ensureDataset(ds.folder);
  await confirmNutrientIds(dir);

  // Foods
  const names = new Map<string, string>();
  for await (const row of readCsv(join(dir, "food.csv"))) {
    if (row.data_type === ds.dataType && row.fdc_id && row.description) {
      names.set(row.fdc_id, row.description.trim());
    }
  }
  const foodIds = new Map<string, number>(); // fdc_id -> foods.id
  for (const batch of chunk([...names], 2000)) {
    const rows = batch.map(([sourceId, name]) => ({
      source: ds.source,
      source_id: sourceId,
      name,
    }));
    const inserted = await sql<{ id: number; source_id: string }[]>`
      insert into foods ${sql(rows)}
      on conflict (source, source_id) do update set name = excluded.name
      returning id, source_id
    `;
    for (const r of inserted) foodIds.set(r.source_id, Number(r.id));
  }
  console.log(`${ds.source}: ${foodIds.size} foods`);

  // Nutrients per 100 g, including fallback ids we may need.
  const wanted = NUTRIENTS.map((n) => n.id);
  const readable = new Set<number>([
    ...wanted,
    ...Object.values(IMPORT_FALLBACKS).flat(),
  ]);
  const raw = new Map<string, Map<number, number>>();
  for await (const row of readCsv(join(dir, "food_nutrient.csv"))) {
    const fdcId = row.fdc_id ?? "";
    const nutrientId = Number(row.nutrient_id);
    if (!foodIds.has(fdcId) || !readable.has(nutrientId) || row.amount === "") {
      continue;
    }
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    let perFood = raw.get(fdcId);
    if (!perFood) raw.set(fdcId, (perFood = new Map()));
    perFood.set(nutrientId, amount);
  }
  const nutrientRows: {
    food_id: number;
    nutrient_id: number;
    amount_per_100g: number;
  }[] = [];
  for (const [fdcId, values] of raw) {
    const foodId = foodIds.get(fdcId)!;
    for (const [nutrientId, amount] of resolveNutrients(values, wanted)) {
      nutrientRows.push({
        food_id: foodId,
        nutrient_id: nutrientId,
        amount_per_100g: amount,
      });
    }
  }
  for (const batch of chunk(nutrientRows, 5000)) {
    await sql`
      insert into food_nutrients ${sql(batch)}
      on conflict (food_id, nutrient_id)
      do update set amount_per_100g = excluded.amount_per_100g
    `;
  }
  console.log(`${ds.source}: ${nutrientRows.length} nutrient values`);

  // Portions. Replace rather than merge, since FDC has no stable portion key
  // we store.
  const units = new Map<string, string>();
  for await (const row of readCsv(join(dir, "measure_unit.csv"))) {
    units.set(row.id ?? "", row.name ?? "");
  }
  const portionRows: { food_id: number; label: string; grams: number }[] = [];
  for await (const row of readCsv(join(dir, "food_portion.csv"))) {
    const foodId = foodIds.get(row.fdc_id ?? "");
    const grams = Number(row.gram_weight);
    if (!foodId || !(grams > 0)) continue;
    const label = portionLabel({
      amount: row.amount ?? "",
      unitName: units.get(row.measure_unit_id ?? ""),
      modifier: row.modifier ?? "",
      portionDescription: row.portion_description ?? "",
    });
    if (label) portionRows.push({ food_id: foodId, label, grams });
  }
  const allIds = [...foodIds.values()];
  for (const ids of chunk(allIds, 5000)) {
    await sql`delete from food_portions where food_id in ${sql(ids)}`;
  }
  for (const batch of chunk(portionRows, 5000)) {
    await sql`insert into food_portions ${sql(batch)}`;
  }
  console.log(`${ds.source}: ${portionRows.length} portions`);
}

async function main() {
  const sql = scriptSql();
  try {
    console.log(`Seeded ${await seedNutrients(sql)} nutrients`);
    for (const ds of DATASETS) await importDataset(sql, ds);
    await sql`analyze foods`;
    await sql`analyze food_nutrients`;
    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
