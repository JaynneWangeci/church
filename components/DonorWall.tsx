"use client";

import { useEffect, useState } from "react";

interface RecentDonation {
  donor_name: string | null;
  amount: number;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function maskName(name: string | null): string {
  if (!name) return "Anonymous";
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function DonorWall() {
  const [donations, setDonations] = useState<RecentDonation[]>([]);

  useEffect(() => {
    fetch("/api/campaigns/development-fund")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data?.recent_donations) {
          setDonations(data.recent_donations);
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/campaigns/development-fund")
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data?.recent_donations) {
            setDonations(data.recent_donations);
          }
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (donations.length === 0) return null;

  return (
    <div className="w-full max-w-xs">
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-ink/50">
        Recent Givers
      </p>
      <div className="space-y-2">
          {donations.slice(0, 8).map((d, i) => (
          <div
            key={`${d.created_at}-${i}`}
            className="animate-slide-up rounded-lg bg-white px-3 py-2 shadow-sm"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                {maskName(d.donor_name)}
              </p>
              <p className="text-sm font-bold text-maroon tabular-nums">
                KES {d.amount.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-ink/40">{timeAgo(d.created_at)}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
