"use client";

import { useState } from "react";
import { Menu, X, Heart, Shield } from "lucide-react";

const links = [
  { label: "Give", href: "#give" },
  { label: "Committee", href: "#committee" },
  { label: "Location", href: "#location" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); scrollTo("home"); }}
          className="flex items-center gap-2 text-lg font-bold text-nobuk tracking-tight"
        >
          <Heart size={18} className="text-amber" fill="currentColor" />
          Harambee
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
              className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-nobuk hover:bg-nobuk-muted"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#give"
            onClick={(e) => { e.preventDefault(); scrollTo("give"); }}
            className="ml-2 rounded-full bg-nobuk px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-nobuk-light"
          >
            Give Now
          </a>
          <a
            href="/admin/login"
            className="ml-1 rounded-lg p-2 text-muted transition hover:text-nobuk hover:bg-nobuk-muted"
            title="Admin"
          >
            <Shield size={16} />
          </a>
        </div>

        <button
          className="rounded-lg p-2 text-nobuk md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gray-100/50 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
                className="rounded-lg px-3 py-3 text-sm text-muted transition hover:text-nobuk hover:bg-nobuk-muted"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#give"
              onClick={(e) => { e.preventDefault(); scrollTo("give"); }}
              className="mt-2 rounded-full bg-nobuk px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Give Now
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
