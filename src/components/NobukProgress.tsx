import { useEffect, useState, useRef } from "react";

export default function NobukProgress() {
  const [pledged, setPledged] = useState(0);
  const [paid, setPaid] = useState(0);
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, pledged - paid);
  const pct = pledged > 0 ? Math.min((paid / pledged) * 100, 100) : 0;

  useEffect(() => {
    function fetchTotals() {
      fetch("/api/pledges/totals/public")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setPledged(Number(d.total_pledged));
            setPaid(Number(d.total_paid));
          }
        })
        .catch(() => {});
    }
    fetchTotals();
    const interval = setInterval(fetchTotals, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setWidth(0);
    const timer = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div ref={ref} className="w-full max-w-md mx-auto">
      {/* Top row: paid left, pledged right */}
      <div className="mb-1 flex items-center justify-between text-xs">
        <div className="flex flex-col items-start">
          <span className="text-white/50 uppercase tracking-wider text-[10px]">Pledges Paid</span>
          <span className="font-bold tabular-nums text-white text-sm">KES {paid.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-white/50 uppercase tracking-wider text-[10px]">Pledges Made</span>
          <span className="font-bold tabular-nums text-white text-sm">KES {pledged.toLocaleString()}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-amber to-amber-dark transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        >
          <div className="absolute inset-0 animate-progress-shine rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>

      {/* Bottom row: remaining */}
      <div className="mt-1 flex items-center justify-center text-xs">
        <span className="text-white/40">
          Remaining: <span className="font-bold tabular-nums text-amber">KES {remaining.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
