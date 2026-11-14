import { expect, it } from "vitest";
import postgres from "postgres";

it.skipIf(!process.env.SUPABASE_DB_URL)("uses 3, 9, 15 and 25 day review intervals in the database", async () => {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Database test connection is required.");
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql`select public.review_interval_days(box) as days from generate_series(1,4) box order by box`;
    expect(rows.map((row) => row.days)).toEqual([3, 9, 15, 25]);
  } finally { await sql.end(); }
});