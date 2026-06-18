import { NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const svc = requireServiceSupabase();

  const { data: donations } = await svc
    .from("donations")
    .select("amount, method, donor_name, status, created_at");

  const totalDonors = donations?.filter((d) => d.status === "completed").length || 0;
  const totalRaised =
    donations
      ?.filter((d) => d.status === "completed")
      .reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const avgGift = totalDonors > 0 ? Math.round(totalRaised / totalDonors) : 0;
  const pendingCount =
    donations?.filter((d) => d.status === "pending").length || 0;
  const failedCount =
    donations?.filter((d) => d.status === "failed").length || 0;

  const { data: campaign } = await svc
    .from("campaigns")
    .select("goal, raised")
    .eq("slug", "development-fund")
    .single();

  const { data: recentDonations } = await svc
    .from("donations")
    .select("id, donor_name, amount, status, created_at, honored_member_id")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: memberCount } = await svc
    .from("committee_members")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return NextResponse.json({
    goal: campaign?.goal || 5000000,
    raised: campaign?.raised || totalRaised,
    total_raised: totalRaised,
    total_donors: totalDonors,
    avg_gift: avgGift,
    pending_count: pendingCount,
    failed_count: failedCount,
    member_count: memberCount || 0,
    recent_donations: recentDonations || [],
  });
}
