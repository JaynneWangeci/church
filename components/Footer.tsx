import { Play, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-ink px-4 py-12 text-cream/60">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-display text-lg font-bold text-cream">
          AIPCA Bahati Cathedral
        </p>
        <p className="mt-1 text-sm">
          Bahati, Eastlands, Nairobi, Kenya
        </p>

        <div className="mx-auto mt-4 flex items-center justify-center gap-4">
          <a
            href="#transparency"
            className="text-sm underline underline-offset-2 transition hover:text-cream"
          >
            Transparency
          </a>
          <a
            href="/api/ledger/export"
            className="text-sm underline underline-offset-2 transition hover:text-cream"
          >
            Download Ledger
          </a>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 transition hover:bg-cream/10 hover:text-cream"
            aria-label="YouTube"
          >
            <Play size={18} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 transition hover:bg-cream/10 hover:text-cream"
            aria-label="Facebook"
          >
            <Globe size={18} />
          </a>
        </div>

        <p className="mt-6 text-xs">
          &copy; {new Date().getFullYear()} AIPCA Bahati Cathedral. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
