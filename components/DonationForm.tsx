"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Share2 } from "lucide-react";

type Step = "form" | "processing" | "success";
const presets = [500, 1000, 2500, 5000, 10000];

interface MemberOption {
  id: string;
  name: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export default function DonationForm() {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState<number | "custom" | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [honoredMember, setHonoredMember] = useState("");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [error, setError] = useState("");

  const finalAmount = amount === "custom" ? Number(customAmount) || 0 : amount || 0;

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
      })
      .catch(() => {});
  }, []);

  const pollStatus = useCallback((checkoutId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/donations/status?checkoutRequestId=${checkoutId}`);
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(interval);
          setReceiptNumber(data.receipt_number);
          setStep("success");
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError("Payment failed. Please try again.");
          setStep("form");
        }
      } catch {
        clearInterval(interval);
        setError("Network error. Please try again.");
        setStep("form");
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setError("Payment timed out. Please try again.");
      setStep("form");
    }, 60000);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!finalAmount || finalAmount < 10) {
      setError("Amount must be at least KES 10");
      return;
    }
    if (!phone || phone.replace(/\s/g, "").length < 10) {
      setError("Enter a valid M-Pesa phone number");
      return;
    }

    setStep("processing");

    try {
      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          donor_name: donorName || null,
          phone: phone.replace(/\s/g, ""),
          message: message || null,
          honored_member_id: honoredMember || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setStep("form");
        return;
      }

      pollStatus(data.checkout_request_id || data.donation_id);
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `I just gave KES ${finalAmount.toLocaleString()} to AIPCA Bahati Harambee!${receiptNumber ? ` Receipt: ${receiptNumber}` : ""} Join me: ${window.location.origin}#give`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function reset() {
    setStep("form");
    setAmount(null);
    setCustomAmount("");
    setDonorName("");
    setPhone("");
    setMessage("");
    setHonoredMember("");
    setReceiptNumber("");
    setError("");
  }

  return (
    <section id="give" className="scroll-mt-16 bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Give
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Support the Harambee
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Amount (KES)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setAmount(p as any); setCustomAmount(""); }}
                      className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                        amount === p
                          ? "bg-nobuk text-white shadow-sm"
                          : "bg-slate text-muted hover:bg-nobuk-muted"
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); if (e.target.value) setAmount("custom"); }}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-slate px-4 py-2.5 text-ink outline-none transition focus:border-nobuk focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mary Wanjiku"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-slate px-4 py-2.5 text-ink outline-none transition focus:border-nobuk focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  M-Pesa number
                </label>
                <input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-slate px-4 py-2.5 text-ink outline-none transition focus:border-nobuk focus:bg-white"
                />
                <p className="mt-1 text-xs text-muted">
                  You will receive an M-Pesa prompt to enter your PIN
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  In honour of (optional)
                </label>
                <select
                  value={honoredMember}
                  onChange={(e) => setHonoredMember(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-slate px-4 py-2.5 text-ink outline-none transition focus:border-nobuk focus:bg-white"
                >
                  <option value="">None</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Message (optional)
                </label>
                <textarea
                  placeholder="With thanksgiving for..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-slate px-4 py-2.5 text-ink outline-none transition focus:border-nobuk focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={!finalAmount || finalAmount < 10}
                className="w-full rounded-full bg-nobuk py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Give KES {finalAmount.toLocaleString()} via M-Pesa
              </button>

              <div className="rounded-xl border border-gray-100 bg-slate p-4 text-center">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">
                  Or pay directly via M-Pesa Paybill
                </p>
                <p className="mt-1 text-xl font-bold text-nobuk">247 247</p>
                <p className="text-xs text-muted">
                  Account: <span className="font-semibold">Harambee</span>
                </p>
              </div>
            </motion.form>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-2xl border border-gray-100 bg-slate p-8 text-center shadow-sm"
            >
              <Loader2 size={36} className="mx-auto mb-4 animate-spin text-nobuk" />
              <h3 className="text-lg font-semibold text-ink">Processing...</h3>
              <p className="mt-2 text-sm text-muted">
                Check your phone for the M-Pesa PIN prompt
              </p>
              <p className="mt-1 text-xs text-muted">
                Amount: KES {finalAmount.toLocaleString()}
              </p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-2xl border border-gray-100 bg-slate p-8 text-center shadow-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nobuk"
              >
                <Check size={28} className="text-white" />
              </motion.div>

              <h3 className="text-xl font-bold text-ink">
                Asante sana{donorName ? `, ${donorName}` : ""}!
              </h3>
              <p className="mt-2 text-sm text-muted">
                Your gift of KES {finalAmount.toLocaleString()} has been received.
              </p>

              {receiptNumber && (
                <p className="mt-3 font-mono text-xs text-muted">
                  Receipt: {receiptNumber}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <Share2 size={15} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={reset}
                  className="flex-1 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-slate"
                >
                  Give Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
