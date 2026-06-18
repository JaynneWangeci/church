import { requireDb } from "../_supabase.js";

const fallback = [
  { id: "1", name: "Dadson Mbogo", role: "Parish board chairman", council: "parish_board" },
  { id: "2", name: "Jeremiah Kimani", role: "V Chairman", council: "parish_board" },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board" },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board" },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board" },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board" },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council" },
  { id: "8", name: "Alice Kuhunya", role: "V Chairlady", council: "women_council" },
  { id: "9", name: "Tiffany Kimani", role: "Women council Secretary", council: "women_council" },
  { id: "10", name: "Esther Mbugua", role: "Women council Treasurer", council: "women_council" },
  { id: "11", name: "Gilbert Wachira", role: "Men council chairman", council: "men_council" },
  { id: "12", name: "Sam Ndiang'ui", role: "Development chairman", council: "development" },
  { id: "13", name: "Wilson Thirikwa", role: "Development Secretary", council: "development" },
  { id: "14", name: "Maria goretti Njenga", role: "Development Treasurer", council: "development" },
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const db = requireDb();

    if (!db) {
      res.json({ members: fallback });
      return;
    }

    const { data, error } = await db
      .from("committee_members")
      .select("*")
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (error || !data?.length) {
      res.json({ members: fallback });
      return;
    }

    res.json({ members: data });
  } catch {
    res.json({ members: fallback });
  }
}
