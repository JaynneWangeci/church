"use client";

import { ChevronDown, MapPin, Users, Target } from "lucide-react";
import NobukProgress from "./NobukProgress";

interface HeroProps {
  raised: number;
  goal: number;
  donorCount: number;
}

export default function Hero({ raised, goal, donorCount }: HeroProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 pt-16"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-nobuk-muted/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-light/50 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center animate-fade-in">
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/20 bg-amber-light px-4 py-1.5 text-xs font-semibold text-amber uppercase tracking-wider">
            <Target size={12} />
            Harambee 2026
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-nobuk md:text-5xl lg:text-6xl">
            Tujenge Pamoja
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted">
            Building AIPCA Bahati Cathedral together &mdash; every contribution counts
          </p>
        </div>

        <div className="mt-10 w-full max-w-md animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-nobuk/5">
            <NobukProgress raised={raised} goal={goal} />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm text-muted animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-nobuk" />
            {donorCount} donors
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-nobuk" />
            <a
              href="#location"
              onClick={(e) => { e.preventDefault(); scrollTo("location"); }}
              className="underline underline-offset-2 hover:text-nobuk"
            >
              Get directions
            </a>
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <button
            onClick={() => scrollTo("give")}
            className="rounded-full bg-nobuk px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-nobuk-light"
          >
            Give Now &rarr;
          </button>
          <button
            onClick={() => scrollTo("committee")}
            className="rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-medium text-muted transition hover:bg-slate"
          >
            Honor a Member
          </button>
        </div>
      </div>

      <button
        onClick={() => scrollTo("give")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted/40 hover:text-muted transition animate-bounce"
      >
        <ChevronDown size={24} />
      </button>
    </section>
  );
}
