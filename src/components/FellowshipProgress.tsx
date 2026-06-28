import { useState, useEffect } from "react";
import { Users, TrendingUp, Award } from "lucide-react";

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

  const maxTotal = Math.max(...fellowships.map(f => f.total_amount), 1);

  return (
    <section className="sky-card-glass px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-sky-700 uppercase tracking-widest">
            <Users size={12} />
            Fellowships
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
            Fellowship Contributions
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            See how each fellowship is contributing to the Harambee Development Fund
          </p>
        </div>

        {/* Mobile: compact ranked list */}
        <div className="space-y-1 md:hidden">
          {fellowships.map((f, i) => (
            <div key={f.council} className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                i === 0 ? "bg-amber text-white" : i === 1 ? "bg-sky-100 text-sky-700" : i === 2 ? "bg-amber/20 text-amber-800" : "bg-gray-100 text-gray-500"
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />
                    <span className="text-xs font-bold text-gray-800 truncate">{f.label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-600 tabular-nums shrink-0">KES {f.total_amount.toLocaleString()}</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(f.total_amount / maxTotal) * 100}%`, backgroundColor: f.color }} />
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mt-0.5">
                  <span>{f.member_count} members</span>
                  <span>·</span>
                  <span>{f.donation_count} donations</span>
                  <span>·</span>
                  <span>{f.percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: card grid */}
        <div className="hidden md:grid gap-4 md:grid-cols-2">
          {fellowships.map((f) => (
            <div
              key={f.council}
              className="group rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-3 w-3 rounded-full" style={{ backgroundColor: f.color }} />
                  <h3 className="text-sm font-bold text-gray-900">{f.label}</h3>
                </div>
                <span className="text-xs font-bold text-gray-500">{f.member_count} members</span>
              </div>

              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  KES {f.total_amount.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-sky-600">
                  {f.donation_count} donation{f.donation_count !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(f.percentage, 100)}%`,
                    backgroundColor: f.color,
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {f.percentage.toFixed(2)}% of goal
                </span>
                {f.donation_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
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
