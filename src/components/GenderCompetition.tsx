import { useState, useEffect } from "react";
import { Users, TrendingUp } from "lucide-react";

export default function GenderCompetition() {
  const [data, setData] = useState<{ male: number; female: number; male_members: number; female_members: number } | null>(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    fetch("/api/public/gender-contributions")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return null;

  const total = data.male + data.female;
  const malePct = total > 0 ? (data.male / total) * 100 : 0;
  const femalePct = total > 0 ? (data.female / total) * 100 : 0;
  const leading = data.male > data.female ? "men" : data.female > data.male ? "women" : "tied";
  const diff = Math.abs(data.male - data.female);

  return (
    <section id="gender-challenge" className="sky-card-glass px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-sky-700 uppercase tracking-widest">
            <Users size={12} />
            Men vs Women
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
            Men vs Women Challenge
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            See which group is leading in contributions to the Harambee Development Fund
          </p>
        </div>

        {/* Live leader indicator */}
        <div className="mb-6 text-center">
          {leading === "tied" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
              <TrendingUp size={16} />
              It's a tie!
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
              leading === "men" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
            }`}>
              <TrendingUp size={16} />
              {leading === "men" ? "Men" : "Women"} leading by KES {diff.toLocaleString()}
            </span>
          )}
        </div>

        {/* Progress bars */}
        <div className="space-y-5">
          {/* Men */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-bold text-gray-900">Men</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-700 tabular-nums">KES {data.male.toLocaleString()}</span>
                <span className="ml-2 text-xs text-gray-500">({data.male_members} members)</span>
              </div>
            </div>
            <div className="relative h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(malePct, 1)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                {malePct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Women */}
          <div className="rounded-2xl border border-pink-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-pink-500" />
                <span className="text-sm font-bold text-gray-900">Women</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-pink-700 tabular-nums">KES {data.female.toLocaleString()}</span>
                <span className="ml-2 text-xs text-gray-500">({data.female_members} members)</span>
              </div>
            </div>
            <div className="relative h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(femalePct, 1)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                {femalePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Total contributions: KES {total.toLocaleString()}
        </div>
      </div>
    </section>
  );
}
