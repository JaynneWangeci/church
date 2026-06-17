"use client";

import { motion } from "framer-motion";
import { Church, MapPin, Clock, Heart } from "lucide-react";

const details = [
  {
    icon: MapPin,
    label: "Location",
    value: "Bahati, Eastlands, Nairobi",
  },
  {
    icon: Clock,
    label: "Service Times",
    value: "Sundays 8:00 AM & 10:30 AM",
  },
  {
    icon: Heart,
    label: "Purpose",
    value: "Sanctuary, Fellowship Hall, Ministry Growth, Grounds",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="bg-cream px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-maroon/60">
            About
          </p>
          <h2 className="font-display text-3xl font-bold text-maroon md:text-5xl">
            AIPCA Bahati Cathedral
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-2xl text-center text-lg leading-relaxed text-ink/70"
        >
          The African Independent Pentecostal Church of Africa (AIPCA) Cathedral
          in Bahati has been a spiritual home for the Eastlands community. We
          are raising KES 5,000,000 to complete our development projects —
          building a sanctuary that honours God and a fellowship hall that
          unites our community.
        </motion.p>

        <div className="grid gap-4 md:grid-cols-3">
          {details.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10 text-maroon">
                  <Icon size={20} />
                </div>
                <p className="text-sm font-medium uppercase tracking-wider text-ink/50">
                  {item.label}
                </p>
                <p className="mt-1 font-medium text-ink">{item.value}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
