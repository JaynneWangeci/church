import { Play, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-4 py-10">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-bold text-nobuk">AIPCA Bahati Cathedral</p>
        <p className="mt-1 text-xs text-muted">Bahati, Eastlands, Nairobi</p>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <a
            href="#transparency"
            className="text-muted underline underline-offset-2 hover:text-nobuk transition"
          >
            Transparency
          </a>
          <a
            href="/api/ledger/export"
            className="text-muted underline underline-offset-2 hover:text-nobuk transition"
          >
            Download Ledger
          </a>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-muted transition hover:bg-nobuk-muted hover:text-nobuk"
          >
            <Play size={16} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-muted transition hover:bg-nobuk-muted hover:text-nobuk"
          >
            <Globe size={16} />
          </a>
        </div>

        <p className="mt-6 text-xs text-muted/60">
          &copy; {new Date().getFullYear()} AIPCA Bahati Cathedral
        </p>
      </div>
    </footer>
  );
}
