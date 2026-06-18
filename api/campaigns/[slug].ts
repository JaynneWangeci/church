import { requireDb } from "../_supabase.js";

const fallback = {
  id: "dev-fund",
  slug: "development-fund",
  title: "AIPCA Bahati Cathedral Development Fund",
  description:
    "Tujenge pamoja – Building our house of worship together. Support the sanctuary improvements, fellowship hall, ministry growth, and grounds maintenance.",
  goal: 5000000,
  raised: 842500,
  currency: "KES",
  is_active: true,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const slug = req.query.slug;
    const db = requireDb();

    if (!db) {
      res.json(fallback);
      return;
    }

    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      res.json(fallback);
      return;
    }

    res.json(data);
  } catch {
    res.json(fallback);
  }
}
