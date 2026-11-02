import { getTimezone } from "@/lib/diary/repo";
import { localDate } from "@/lib/nutrition/dates";

/** The requested date, or today in the user's timezone. */
export async function resolveDate(
  userId: string,
  date: string | undefined,
): Promise<string> {
  return date ?? localDate(new Date(), await getTimezone(userId));
}
