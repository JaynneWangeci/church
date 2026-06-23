import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, Phone, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  const labels = ["", "Weak", "Fair", "Strong"];
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  return { score, label: labels[score], color: colors[score] };
}

export default function AdminSetup() {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/check-setup")
      .then(r => r.json())
      .then(d => setIsFirstAdmin(d.can_setup))
      .catch(() => {});
    nameRef.current?.focus();
  }, []);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirm.length === 0 || password === confirm;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must include at least one uppercase letter and one number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/admin/dashboard");
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nobuk to-nobuk-light px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-nobuk">
              <Shield size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-ink">Create Account</h1>
            <p className="mt-1 text-sm text-muted">
              {isFirstAdmin ? "Create the first admin account" : "Sign up as a new admin"}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  disabled={loading}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@church.org"
                  required
                  disabled={loading}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Phone (for password reset)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  required
                  disabled={loading}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-nobuk focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase &amp; number"
                  required
                  minLength={8}
                  disabled={loading}
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
                  disabled={loading}
                  autoComplete="off"
                  className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: confirm.length === 0 ? "rgb(229 231 235)" : passwordsMatch ? "rgb(34 197 94)" : "rgb(239 68 68)",
                    backgroundColor: confirm.length === 0 ? "" : passwordsMatch ? "rgb(240 253 244)" : "rgb(254 242 242)",
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
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-nobuk py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating account..." : "Create Admin Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            <a href="/admin/login" className="underline underline-offset-2 hover:text-nobuk">Already have an account? Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
