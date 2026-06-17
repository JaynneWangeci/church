"use client";

import { motion } from "framer-motion";
import { Building2, Users, BookOpen, Trees } from "lucide-react";

const projects = [
  {
    icon: Building2,
    title: "Sanctuary Improvements",
    description:
      "Renovate the main sanctuary with new seating, lighting, and sound system to accommodate our growing congregation.",
    color: "from-maroon to-gold",
  },
  {
    icon: Users,
    title: "Fellowship Hall",
    description:
      "Complete the fellowship hall for community gatherings, weddings, and church events that bring us together.",
    color: "from-gold to-magenta",
  },
  {
    icon: BookOpen,
    title: "Ministry Growth",
    description:
      "Expand youth ministry, Sunday school, and outreach programs to serve the next generation of believers.",
    color: "from-magenta to-maroon",
  },
  {
    icon: Trees,
    title: "Grounds Maintenance",
    description:
      "Landscaping, parking, and security upgrades to create a welcoming environment for all visitors.",
    color: "from-maroon to-gold",
  },
];

export default function ProjectsSection() {
  return (
    <section id="projects" className="bg-terracotta-tint px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-maroon/60">
            What your gift supports
          </p>
          <h2 className="font-display text-3xl font-bold text-maroon md:text-5xl">
            Development Projects
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project, i) => {
            const Icon = project.icon;
            return (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${project.color} text-white`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {project.title}
                  </h3>
                </div>
                <p className="text-ink/70 leading-relaxed">
                  {project.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <a
            href="#give"
            className="inline-flex items-center gap-2 rounded-full bg-maroon px-8 py-3 text-sm font-bold text-cream transition hover:bg-maroon/90"
          >
            Support a Project &rarr;
          </a>
        </motion.div>
      </div>
    </section>
  );
}
