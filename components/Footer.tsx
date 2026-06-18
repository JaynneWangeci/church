import { Heart, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-nobuk px-4 py-10">
      <div className="mx-auto max-w-4xl text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-white">
          <Heart size={14} className="text-amber" fill="currentColor" />
          AIPCA Bahati Harambee
        </div>
        <p className="mt-1 text-xs text-white/60">
          Tujenge Pamoja &mdash; Building our house of worship together
        </p>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs">
          <a
            href="/api/ledger/export"
            className="flex items-center gap-1 text-white/60 underline underline-offset-2 hover:text-white transition"
          >
            Download Ledger
          </a>
          <a
            href="/admin/login"
            className="flex items-center gap-1 text-white/60 underline underline-offset-2 hover:text-white transition"
          >
            <Shield size={10} />
            Admin
          </a>
        </div>

        <p className="mt-6 text-xs text-white/40">
          &copy; {new Date().getFullYear()} AIPCA Bahati Cathedral. All contributions are recorded and auditable.
        </p>
      </div>
    </footer>
  );
}
