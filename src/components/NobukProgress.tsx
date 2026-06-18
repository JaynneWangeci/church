import { useEffect, useState, useRef } from "react";
import { TrendingUp } from "lucide-react";

interface Props {
  raised: number;
  goal: number;
}

export default function NobukProgress({ raised, goal }: Props) {
  const [width, setWidth] = useState(0);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const pct = Math.min((raised / goal) * 100, 100);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(pct), 200);
          const duration = 1500;
          const steps = 30;
          const interval = duration / steps;
          let step = 0;
          const timer = setInterval(() => {
            step++;
            setCount(Math.round((raised / steps) * step));
            if (step >= steps) {
              clearInterval(timer);
              setCount(raised);
            }
          }, interval);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 },
    );

    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [raised, goal, pct]);

  return (
    <div ref={ref}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 font-medium text-amber">
          <TrendingUp size={14} />
          Progress
        </span>
        <span className="font-semibold tabular-nums text-white">
          KES {count.toLocaleString()}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-amber to-amber-dark transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        >
          <div className="absolute inset-0 animate-progress-shine rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-white/50">
        <span>KES {goal.toLocaleString()}</span>
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}
