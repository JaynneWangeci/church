"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Member {
  id: string;
  name: string;
  role: string;
  council: string;
}

const councils = [
  { key: "parish_board", label: "Parish Board" },
  { key: "women_council", label: "Women's Council" },
  { key: "men_council", label: "Men's Council" },
  { key: "development", label: "Development Committee" },
];

const fallbackMembers: Member[] = [
  { id: "1", name: "Dadson Mbogo", role: "Parish Board Chairman", council: "parish_board" },
  { id: "2", name: "Jeremiah Kimani", role: "Vice Chairman", council: "parish_board" },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board" },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board" },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board" },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board" },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council" },
  { id: "8", name: "Alice Kuhunya", role: "Vice Chairlady", council: "women_council" },
  { id: "9", name: "Tiffany Kimani", role: "Secretary", council: "women_council" },
  { id: "10", name: "Esther Mbugua", role: "Treasurer", council: "women_council" },
  { id: "11", name: "Gilbert Wachira", role: "Chairman", council: "men_council" },
  { id: "12", name: "Sam Ndiang'ui", role: "Chairman", council: "development" },
  { id: "13", name: "Wilson Thirikwa", role: "Secretary", council: "development" },
  { id: "14", name: "Maria Goretti Njenga", role: "Treasurer", council: "development" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LeadershipSection() {
  const [members, setMembers] = useState<Member[]>(fallbackMembers);

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setMembers(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section id="leadership" className="bg-maroon px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-gold/60">
            Our Leadership
          </p>
          <h2 className="font-display text-3xl font-bold text-cream md:text-5xl">
            Committee Members
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        </motion.div>

        {councils.map((council) => {
          const councilMembers = members.filter(
            (m) => m.council === council.key,
          );
          if (councilMembers.length === 0) return null;

          return (
            <div key={council.key} className="mb-10 last:mb-0">
              <motion.h3
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gold"
              >
                {council.label}
              </motion.h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {councilMembers.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl bg-cream/10 p-4 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-cream">
                        {member.name}
                      </p>
                      <p className="truncate text-sm text-cream/60">
                        {member.role}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
