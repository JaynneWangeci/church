import { useState, useEffect } from "react";
import { Users, TrendingUp } from "lucide-react";

interface Fellowship {
  council: string;
  label: string;
  color: string;
  member_count: number;
  donation_count: number;
  total_amount: number;
  goal: number;
  percentage: number;
}

export default function FellowshipProgress() {
  const [fellowships, setFellowships] = useState<Fellowship[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchProgress() {
    fetch("/api/fellowships/progress")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fellowships) setFellowships(data.fellowships);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <section className="bg-white/5 backdrop-blur-sm px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300 uppercase tracking-widest">
            <Users size={12} />
            Fellowships
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
            Fellowship Contributions
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-blue-200/60">
            See how each fellowship is contributing to the Harambee Development Fund
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fellowships.map((f) => (
            <div
              key={f.council}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-3 w-3 rounded-full" style={{ backgroundColor: f.color }} />
                  <h3 className="text-sm font-bold text-white">{f.label}</h3>
                </div>
                <span className="text-xs font-bold text-white/40">{f.member_count} members</span>
              </div>

              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-white tabular-nums">
                  KES {f.total_amount.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-blue-300/70">
                  {f.donation_count} donation{f.donation_count !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(f.percentage, 100)}%`,
                    backgroundColor: f.color,
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-white/30">
                  {f.percentage.toFixed(1)}% of goal
                </span>
                {f.donation_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <TrendingUp size={10} />
                    Avg KES {Math.round(f.total_amount / f.donation_count).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
