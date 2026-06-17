"use client";

import { motion } from "framer-motion";

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
            KES {raised.toLocaleString()}
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

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-nobuk-muted">
        <motion.div
          className="h-full rounded-full bg-nobuk"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted">
        <span className="font-medium">{percentage}% complete</span>
        <span>
          {remaining > 0
            ? `KES ${remaining.toLocaleString()} to go`
            : "Goal reached!"}
        </span>
      </div>
    </div>
  );
}
