import { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";

function getPasswordStrength(password: string): { score: number; label: string; color: string; width: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  const labels = ["", "Weak", "Fair", "Strong"];
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  const widths = ["", "w-1/3", "w-2/3", "w-full"];
  return { score, label: labels[score], color: colors[score], width: widths[score] };
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirm.length === 0 || password === confirm;

  useEffect(() => { emailRef.current?.focus(); }, []);

  const doRedirect = useCallback(() => {
    setRedirectCountdown(3);
    const timer = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate("/admin/login"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    if (!resetSuccess) return;
    return doRedirect();
  }, [resetSuccess, doRedirect]);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => codeRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [sent]);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Reset code is required"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must include at least one uppercase letter and one number");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Reset failed");
        setResetting(false);
        return;
      }
      setResetSuccess(true);
    } catch {
      setError("Network error. Check your connection.");
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nobuk to-nobuk-light px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-nobuk">
              {resetSuccess ? <CheckCircle2 size={20} className="text-white" /> : sent ? <KeyRound size={20} className="text-white" /> : <Mail size={20} className="text-white" />}
            </div>
            <h1 className="text-xl font-bold text-ink">
              {resetSuccess ? "Password Reset" : sent ? "Enter Reset Code" : "Forgot Password"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {resetSuccess ? "Your password has been changed successfully." : sent ? "Enter the 6-digit code and your new password." : "Enter your registered email to begin."}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span>Password reset successfully!</span>
                  <span className="text-xs text-green-600">Redirecting to login in {redirectCountdown}s...</span>
                </div>
              </div>
            </div>
          ) : !sent ? (
            <form onSubmit={handleSendCode} className="space-y-4">
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
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Reset Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={codeRef}
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    disabled={resetting}
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 tracking-widest text-center font-mono text-lg"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase & number"
                    required
                    minLength={8}
                    disabled={resetting}
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(segment => (
                        <div
                          key={segment}
                          className={`h-1 flex-1 rounded-full transition-all ${segment <= strength.score ? strength.color : "bg-gray-200"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted">{strength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    minLength={8}
                    disabled={resetting}
                    autoComplete="off"
                    className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: confirm.length === 0 ? "rgb(229 231 235)" : passwordsMatch ? "rgb(34 197 94)" : "rgb(239 68 68)",
                      backgroundColor: confirm.length === 0 ? "var(--cream)" : passwordsMatch ? "rgb(240 253 244)" : "rgb(254 242 242)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
                {confirm.length > 0 && passwordsMatch && (
                  <p className="mt-1 text-xs text-green-600">Passwords match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={resetting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-nobuk py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetting && <Loader2 size={16} className="animate-spin" />}
                {resetting ? "Resetting..." : "Reset Password"}
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
