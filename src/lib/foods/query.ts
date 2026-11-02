// Turn user search text into a Postgres prefix tsquery. Pure, so tested.

/** "Chicken brea" -> "chicken:* & brea:*". Null when nothing searchable. */
export function prefixTsQuery(text: string): string | null {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const usable = tokens.filter((t) => t.length > 0).slice(0, 8);
  if (usable.length === 0) return null;
  return usable.map((t) => `${t}:*`).join(" & ");
}
