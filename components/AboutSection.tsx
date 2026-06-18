"use client";

import { Church, Heart, Target, Users } from "lucide-react";

const highlights = [
  {
    icon: Target,
    title: "Our Goal",
    value: "KES 5,000,000",
    description: "For sanctuary improvements, fellowship hall, and ministry growth",
  },
  {
    icon: Users,
    title: "Together We Build",
    value: "Tujenge Pamoja",
    description: "Every contribution brings us closer to completing God's house",
  },
  {
    icon: Heart,
    title: "100% Transparent",
    value: "Full Accountability",
    description: "Every shilling is tracked, recorded, and publicly auditable",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="animate-slide-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            <Church size={12} />
            About
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            AIPCA Bahati Cathedral
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted leading-relaxed">
            The African Independent Pentecostal Church of Africa Cathedral in
            Bahati has been a spiritual home for the Eastlands community. We are
            raising funds to complete our development projects and build a better
            house of worship for generations to come.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="animate-slide-up rounded-xl border border-gray-100 bg-slate p-5 text-center transition hover:shadow-sm"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-nobuk text-white">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-lg font-bold text-nobuk">{item.value}</p>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
