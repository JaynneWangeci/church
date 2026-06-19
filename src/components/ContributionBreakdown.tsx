import { useState, useEffect, useCallback } from "react";
import { Trophy, TrendingUp, Users, Calendar, ChevronDown, ChevronUp, Receipt } from "lucide-react";

interface BreakdownMember {
  id: string;
  name: string;
  council: string;
  total: number;
  count: number;
  rank: number;
}

interface RecentDonation {
  id: string;
  donor_name: string | null;
  amount: number;
  phone: string | null;
  message: string | null;
  created_at: string;
  member_name: string | null;
}

interface BreakdownData {
  members: BreakdownMember[];
  today_total: number;
  overall_total: number;
  overall_count: number;
  recent: RecentDonation[];
}

function formatKES(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const DEFAULT_DATA: BreakdownData = {
  members: [],
  today_total: 0,
  overall_total: 0,
  overall_count: 0,
  recent: [],
};

export default function ContributionBreakdown() {
  const [data, setData] = useState<BreakdownData>(DEFAULT_DATA);
  const [expanded, setExpanded] = useState(false);

  const fetchBreakdown = useCallback(async () => {
    try {
      const res = await fetch("/api/contributions/breakdown");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBreakdown();
    const interval = setInterval(fetchBreakdown, 5000);
    return () => clearInterval(interval);
  }, [fetchBreakdown]);

  return (
    <section className="bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-bold text-nobuk uppercase tracking-widest">
            <Trophy size={12} />
            Honour Roll
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Contribution Breakdown
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            See how our community is building the house of worship together.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-nobuk to-nobuk-light p-6 text-white shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={18} />
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Overall Total</span>
            </div>
            <p className="text-3xl font-bold">{formatKES(data.overall_total)}</p>
            <p className="mt-1 text-sm opacity-70">{data.overall_count} donations</p>
          </div>

          <div className="rounded-2xl border border-amber/30 bg-gradient-to-br from-amber-light to-amber/20 p-6 text-nobuk shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <Calendar size={18} className="text-amber-dark" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-dark">Today</span>
            </div>
            <p className="text-3xl font-bold">{formatKES(data.today_total)}</p>
            <p className="mt-1 text-sm text-muted">collected today</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 text-nobuk shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <Users size={18} className="text-muted" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Contributors</span>
            </div>
            <p className="text-3xl font-bold">{data.members.length}</p>
            <p className="mt-1 text-sm text-muted">honoured members</p>
          </div>
        </div>

        {/* Live Feed */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 text-left transition hover:bg-gray-100"
          >
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-muted" />
              <span className="text-sm font-bold text-nobuk">Recent Donations</span>
              {data.recent.length > 0 && (
                <span className="rounded-full bg-nobuk-muted px-2 py-0.5 text-[10px] font-bold text-nobuk">
                  Live
                </span>
              )}
            </div>
            {expanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
          </button>
          {expanded && (
            <div className="divide-y divide-gray-100">
              {data.recent.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted">
                  No donations yet. Be the first to give!
                </div>
              ) : (
                data.recent.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-6 py-3 transition hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-nobuk">{d.donor_name || d.phone || "Anonymous"}</p>
                      <p className="text-xs text-muted">
                        {d.member_name ? `In honour of ${d.member_name}` : "General Fund"}
                        {d.phone && d.donor_name && (<> <span className="mx-1">&middot;</span> {d.phone}</>)}
                        <span className="mx-1">&middot;</span>
                        {timeAgo(d.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-nobuk">{formatKES(d.amount)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
