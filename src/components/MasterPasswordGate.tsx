import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { isActionAuthed, setActionSecret, subscribeActionAuth } from "../lib/master-password";

export default function MasterPasswordGate() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribeActionAuth((authed) => {
      if (!authed) setVisible(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) { setError("Password required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verify-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: value.trim() }),
      });
      if (res.ok) {
        setActionSecret(value.trim());
        setVisible(false);
        setValue("");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Incorrect password");
      }
    } catch {
      setError("Connection error. Try again.");
    }
    setLoading(false);
  }

  if (!visible && isActionAuthed()) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber/10">
            <ShieldAlert size={20} className="text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Action Required</h2>
            <p className="text-[11px] text-muted">Enter master password to make changes</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              placeholder="Master password"
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-600">
              <Lock size={12} /> {error}
            </p>
          )}
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-nobuk py-3 text-sm font-semibold text-white transition hover:bg-nobuk-light disabled:opacity-50">
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Lock size={16} />
            )}
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
