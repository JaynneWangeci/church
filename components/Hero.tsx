"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import NobukProgress from "./NobukProgress";

interface HeroProps {
  raised: number;
  goal: number;
}

export default function Hero({ raised, goal }: HeroProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center bg-white px-4 pt-16"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Harambee 2026
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-nobuk md:text-5xl">
            Tujenge Pamoja
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted">
            Building AIPCA Bahati Cathedral together
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 w-full max-w-md rounded-2xl border border-gray-100 bg-slate p-6 shadow-sm"
        >
          <NobukProgress raised={raised} goal={goal} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <button
            onClick={() => scrollTo("give")}
            className="rounded-full bg-nobuk px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-nobuk-light"
          >
            Give Now &rarr;
          </button>
          <button
            onClick={() => scrollTo("about")}
            className="rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-medium text-muted transition hover:bg-slate"
          >
            Learn More
          </button>
        </motion.div>
      </div>

      <button
        onClick={() => scrollTo("about")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted/40 hover:text-muted transition"
      >
        <ChevronDown size={24} />
      </button>
    </section>
  );
}
