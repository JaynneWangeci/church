import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function HarambeeCountdown() {
  const [target, setTarget] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    fetch("/api/settings/harambee")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const dateStr = data?.date || "2026-09-27";
        const d = new Date(dateStr + "T23:59:59+03:00");
        setTarget(d);
      })
      .catch(() => {
        const d = new Date("2026-09-27T23:59:59+03:00");
        setTarget(d);
      });
  }, []);

  useEffect(() => {
    if (!target) return;

    function calc() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!timeLeft || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
    return null;
  }

  const boxes = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {boxes.map((b, i) => (
        <div key={b.label} className="flex flex-col items-center">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-blue-400/20 bg-white/5 backdrop-blur-sm">
            <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {String(b.value).padStart(2, "0")}
            </span>
          </div>
          <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-blue-300/60">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
