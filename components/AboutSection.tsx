"use client";

import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";

const details = [
  {
    icon: MapPin,
    label: "Location",
    value: "Bahati, Eastlands, Nairobi",
  },
  {
    icon: Clock,
    label: "Services",
    value: "Sundays 8:00 AM & 10:30 AM",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="bg-slate px-4 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            About
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            AIPCA Bahati Cathedral
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted leading-relaxed">
            The African Independent Pentecostal Church of Africa (AIPCA)
            Cathedral in Bahati has been a spiritual home for the Eastlands
            community. We are raising KES 5,000,000 to complete our development
            projects.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex justify-center gap-4"
        >
          {details.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <Icon size={16} className="text-nobuk" />
                <div>
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className="text-sm font-medium text-ink">{item.value}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
