"use client";

import CountUp from "react-countup";

interface ArchProgressProps {
  raised: number;
  goal: number;
  currency?: string;
}

export default function ArchProgress({
  raised,
  goal,
  currency = "KES",
}: ArchProgressProps) {
  const percentage = Math.min(raised / goal, 1);
  const strokeWidth = 8;
  const radius = 90;
  const circumference = Math.PI * radius;
  const progressLength = circumference * percentage;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="260"
        height="160"
        viewBox="0 0 260 160"
        className="overflow-visible"
      >
        <path
          d={`M 20 140 A ${radius} ${radius} 0 0 1 240 140`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-cream/10"
        />
        <path
          d={`M 20 140 A ${radius} ${radius} 0 0 1 240 140`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
          className="text-gold"
          style={{
            strokeDashoffset: circumference - progressLength,
            transition: "stroke-dashoffset 2s ease-out",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pb-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-cream/60">
          Raised
        </p>
        <p className="font-display text-4xl font-bold text-gold tabular-nums">
          {currency}{" "}
          <CountUp end={raised} duration={2.5} separator="," />
        </p>
        <p className="text-sm text-cream/60">
          of {currency} {goal.toLocaleString()} goal
        </p>
        <p className="mt-1 text-lg font-bold text-cream">
          {Math.round(percentage * 100)}%
        </p>
      </div>
    </div>
  );
}
