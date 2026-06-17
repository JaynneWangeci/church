"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Download } from "lucide-react";

interface Aggregates {
  total_raised: number;
  total_donors: number;
  avg_gift: number;
}

export default function TransparencySection() {
  const [data, setData] = useState<Aggregates | null>(null);

  useEffect(() => {
    fetch("/api/ledger/aggregates")
      .then((r) => r.ok && r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const stats = data
    ? [
        { icon: TrendingUp, label: "Total Raised", value: `KES ${data.total_raised.toLocaleString()}` },
        { icon: Users, label: "Total Donors", value: data.total_donors.toString() },
        { icon: TrendingUp, label: "Average Gift", value: `KES ${data.avg_gift.toLocaleString()}` },
        { icon: Download, label: "Full Ledger", value: "Download CSV", href: "/api/ledger/export" },
      ]
    : [];

  return (
    <section id="transparency" className="bg-slate px-4 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Transparency
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Giving Dashboard
          </h2>
        </motion.div>

        {data && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              const content = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-nobuk-muted">
                    <Icon size={17} className="text-nobuk" />
                  </div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-ink">{stat.value}</p>
                </motion.div>
              );

              if ("href" in stat) {
                return <a key={stat.label} href={stat.href}>{content}</a>;
              }
              return <div key={stat.label}>{content}</div>;
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-xs text-muted"
        >
          Every contribution is recorded and auditable.
        </motion.div>
      </div>
    </section>
  );
}
