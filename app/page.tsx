import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import LeadershipSection from "@/components/LeadershipSection";
import DonationForm from "@/components/DonationForm";
import LocationMap from "@/components/LocationMap";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function Home() {
  let raised = 842500;
  let goal = 5000000;
  let donorCount = 0;

  if (supabase) {
    try {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("raised, goal")
        .eq("slug", "development-fund")
        .single();

      if (campaign) {
        raised = Number(campaign.raised);
        goal = Number(campaign.goal);
      }

      const { count } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      donorCount = count || 0;
    } catch {
      // fallback defaults
    }
  }

  return (
    <>
      <Header />
      <Hero raised={raised} goal={goal} donorCount={donorCount} />
      <AboutSection />
      <LeadershipSection />
      <DonationForm />
      <LocationMap />
      <Footer />
    </>
  );
}
