"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Leadership", href: "#leadership" },
  { label: "Give", href: "#give" },
  { label: "Transparency", href: "#transparency" },
];

interface HeaderProps {
  light?: boolean;
}

export default function Header({ light }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        light
          ? "bg-cream/95 text-ink backdrop-blur-md"
          : "bg-ink/80 text-cream backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a
          href="#home"
          className="font-display text-lg font-bold tracking-tight"
        >
          <span className="text-gold">AIPCA</span> Bahati
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-cream/10 ${
                light ? "hover:bg-ink/5" : "hover:bg-cream/10"
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#give"
            className="ml-2 rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink transition hover:bg-gold/90"
          >
            Give Now
          </a>
        </div>

        <button
          className="rounded-lg p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-t md:hidden ${
              light
                ? "border-ink/10 bg-cream"
                : "border-cream/10 bg-ink"
            }`}
          >
            <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                    light
                      ? "hover:bg-ink/5"
                      : "hover:bg-cream/10"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
