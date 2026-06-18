"use client";

import { Building2, Users, BookOpen, Trees } from "lucide-react";

const projects = [
  {
    icon: Building2,
    title: "Sanctuary Improvements",
    description: "Renovate the main sanctuary with new seating, lighting, and sound system.",
  },
  {
    icon: Users,
    title: "Fellowship Hall",
    description: "Complete the fellowship hall for community gatherings and events.",
  },
  {
    icon: BookOpen,
    title: "Ministry Growth",
    description: "Expand youth ministry, Sunday school, and outreach programs.",
  },
  {
    icon: Trees,
    title: "Grounds Maintenance",
    description: "Landscaping, parking, and security upgrades.",
  },
];

export default function ProjectsSection() {
  return (
    <section id="projects" className="bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="animate-slide-up text-center">
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Projects
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            What your gift supports
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {projects.map((project, i) => {
            const Icon = project.icon;
            return (
              <div
                key={project.title}
                className="animate-slide-up rounded-xl border border-gray-100 bg-slate p-5 transition hover:shadow-sm"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-nobuk text-white">
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-semibold text-ink">{project.title}</h3>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {project.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
