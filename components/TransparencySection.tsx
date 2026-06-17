"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Users, TrendingUp, Smartphone, Download } from "lucide-react";

interface Aggregates {
  total_raised: number;
  total_donors: number;
  avg_gift: number;
  mpesa_split: number;
  goal: number;
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
        {
          icon: TrendingUp,
          label: "Total Raised",
          value: `KES ${data.total_raised.toLocaleString()}`,
          sub: `of KES ${data.goal?.toLocaleString() || "5,000,000"} goal`,
          color: "text-maroon",
        },
        {
          icon: Users,
          label: "Total Donors",
          value: data.total_donors.toString(),
          sub: "and counting",
          color: "text-maroon",
        },
        {
          icon: Smartphone,
          label: "Average Gift",
          value: `KES ${data.avg_gift.toLocaleString()}`,
          sub: `${data.mpesa_split} via M-Pesa`,
          color: "text-maroon",
        },
        {
          icon: Download,
          label: "Full Ledger",
          value: "Download CSV",
          sub: "All transactions",
          color: "text-gold",
          href: "/api/ledger/export",
        },
      ]
    : [];

  return (
    <section id="transparency" className="bg-terracotta-tint px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-maroon/60">
            Transparency
          </p>
          <h2 className="font-display text-3xl font-bold text-maroon md:text-5xl">
            Giving Dashboard
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        </motion.div>

        {data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              const isLink = !!stat.href;

              const content = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                    <Icon size={20} className={stat.color} />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-wider text-ink/50">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink">
                    {stat.value}
                  </p>
                  <p className="text-sm text-ink/50">{stat.sub}</p>
                </motion.div>
              );

              if (isLink) {
                return (
                  <a key={stat.label} href={stat.href}>
                    {content}
                  </a>
                );
              }

              return (
                <div key={stat.label}>{content}</div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 rounded-xl bg-white p-6 text-center shadow-sm"
        >
          <p className="text-sm text-ink/60">
            Every contribution is recorded and auditable. Download the full
            ledger for complete transparency.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
