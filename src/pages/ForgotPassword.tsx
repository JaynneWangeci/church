import { useState, FormEvent, useRef, useEffect } from "react";
import { Mail, Smartphone, ArrowLeft, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

export default function ForgotPassword() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { emailRef.current?.focus(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }

      setMessage(data.message || "Reset code sent to your phone.");
      setSent(true);
      setLoading(false);
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  function handleResend() {
    setSent(false);
    setError("");
    setMessage("");
    emailRef.current?.focus();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nobuk to-nobuk-light px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-nobuk">
              <Mail size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-ink">Forgot Password</h1>
            <p className="mt-1 text-sm text-muted">Enter your email to receive a reset code via SMS</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Smartphone size={16} className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span>{message}</span>
                  <span className="text-xs text-blue-600">Check your phone for the 6-digit code.</span>
                </div>
              </div>
              <button
                onClick={handleResend}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-ink transition hover:bg-cream"
              >
                <RefreshCw size={14} />
                Resend Code
              </button>
              <a
                href="/admin/reset-password"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-nobuk py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light"
              >
                Go to Reset Password
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@church.org"
                    required
                    disabled={loading}
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-nobuk py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-muted">
            <a href="/admin/login" className="underline underline-offset-2 hover:text-nobuk">&larr; Back to login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
