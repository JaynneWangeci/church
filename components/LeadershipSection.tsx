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

const fallback: Member[] = [
  { id: "1", name: "Dadson Mbogo", role: "Chairman", council: "parish_board" },
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
  const [members, setMembers] = useState<Member[]>(fallback);

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setMembers(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="committee" className="bg-slate px-4 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Committee
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Our Leadership
          </h2>
        </motion.div>

        {councils.map((council) => {
          const group = members.filter((m) => m.council === council.key);
          if (group.length === 0) return null;

          return (
            <div key={council.key} className="mt-10 first:mt-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                {council.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted truncate">
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
