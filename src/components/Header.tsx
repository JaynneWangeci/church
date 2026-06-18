import { useState, useEffect } from "react";
import { Menu, X, Heart, Shield } from "lucide-react";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#give", label: "Give" },
  { href: "#location", label: "Location" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 shadow-sm backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber transition-transform hover:scale-105">
            <span className="text-xs font-bold text-nobuk">A</span>
          </div>
          <div>
            <p className="font-heading text-base font-bold leading-tight text-nobuk">AIPCA Bahati</p>
            <p className="text-xs leading-tight text-muted">Harambee 2026</p>
          </div>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition hover:bg-nobuk-muted hover:text-nobuk"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#give"
            className="btn-lift ml-2 flex items-center gap-1.5 rounded-full bg-nobuk px-4 py-1.5 text-sm font-semibold text-white hover:bg-nobuk-light"
          >
            <Heart size={14} />
            Give
          </a>
          <a
            href="/admin/login"
            className="ml-1 rounded-full p-1.5 text-muted transition hover:bg-nobuk-muted"
            title="Admin"
          >
            <Shield size={14} />
          </a>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="flex items-center rounded-lg p-2 text-muted transition hover:bg-nobuk-muted md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="animate-slide-down border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-nobuk-muted hover:text-nobuk"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#give"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-nobuk px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light"
            >
              <Heart size={14} />
              Give Now
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
