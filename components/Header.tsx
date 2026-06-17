"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Committee", href: "#committee" },
  { label: "Give", href: "#give" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="#home" className="text-lg font-bold text-nobuk tracking-tight">
          Harambee
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-nobuk hover:bg-nobuk-muted"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#give"
            className="ml-2 rounded-full bg-nobuk px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light"
          >
            Give Now
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
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-muted transition hover:text-nobuk hover:bg-nobuk-muted"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#give"
              onClick={() => setOpen(false)}
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
