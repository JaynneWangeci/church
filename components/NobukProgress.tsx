"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

interface NobukProgressProps {
  raised: number;
  goal: number;
  currency?: string;
}

export default function NobukProgress({
  raised,
  goal,
  currency = "KES",
}: NobukProgressProps) {
  const percentage = Math.min(Math.round((raised / goal) * 100), 100);
  const remaining = Math.max(goal - raised, 0);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-cream/50">
            Raised
          </p>
          <p className="font-display text-3xl font-bold text-cream tabular-nums">
            {currency}{" "}
            <CountUp end={raised} duration={2} separator="," />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wider text-cream/50">
            Goal
          </p>
          <p className="font-display text-lg text-cream/70 tabular-nums">
            {currency}{" "}
            {goal.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-maroon/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-maroon to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-cream/70">
        <span className="font-medium">{percentage}% complete</span>
        <span>
          {remaining > 0
            ? `${currency} ${remaining.toLocaleString()} to go`
            : "Goal reached!"}
        </span>
      </div>
    </div>
  );
}
