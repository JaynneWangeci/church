"use client";

import CountUp from "react-countup";

interface NobukProgressProps {
  raised: number;
  goal: number;
}

export default function NobukProgress({ raised, goal }: NobukProgressProps) {
  const percentage = Math.min(Math.round((raised / goal) * 100), 100);
  const remaining = Math.max(goal - raised, 0);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider">
            Raised
          </p>
          <p className="text-2xl font-bold text-ink tabular-nums">
            KES{" "}
            <CountUp end={raised} duration={2} separator="," />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">
            Goal
          </p>
          <p className="text-base text-muted tabular-nums">
            KES {goal.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-nobuk-muted">
        <div
          className="h-full animate-progress-fill rounded-full bg-gradient-to-r from-nobuk to-nobuk-light"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full w-12 animate-progress-shine rounded-full bg-white/20 blur-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-nobuk">{percentage}% complete</span>
        <span>
          {remaining > 0
            ? `KES ${remaining.toLocaleString()} to go`
            : "Goal reached! \u{1F389}"}
        </span>
      </div>
    </div>
  );
}
