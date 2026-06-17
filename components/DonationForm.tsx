"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Share2 } from "lucide-react";

type Step = "form" | "processing" | "success";
type Amount = number | "custom";

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
  const [amount, setAmount] = useState<Amount | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [honoredMember, setHonoredMember] = useState("");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [error, setError] = useState("");

  const finalAmount =
    amount === "custom"
      ? Number(customAmount) || 0
      : amount || 0;

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
      })
      .catch(() => {});
  }, []);

  const pollStatus = useCallback(
    (checkoutId: string) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/donations/status?checkoutRequestId=${checkoutId}`,
          );
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
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!finalAmount || finalAmount < 10) {
      setError("Please enter an amount of at least KES 10");
      return;
    }
    if (!phone || phone.replace(/\s/g, "").length < 10) {
      setError("Please enter a valid M-Pesa phone number");
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

      setCheckoutRequestId(data.checkout_request_id || data.donation_id);
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

  function handleGiveAgain() {
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
    <section
      id="give"
      className="scroll-mt-16 bg-cream px-4 py-20 md:py-28"
    >
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-maroon/60">
            Toa • Give
          </p>
          <h2 className="font-display text-3xl font-bold text-maroon md:text-4xl">
            Support the Harambee
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Amount (KES)
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAmount(p as Amount);
                        setCustomAmount("");
                      }}
                      className={`rounded-xl py-3 text-sm font-bold transition ${
                        amount === p
                          ? "bg-maroon text-cream shadow-md"
                          : "bg-white text-ink hover:bg-maroon/5"
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="number"
                    placeholder="Other amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setAmount("custom");
                    }}
                    className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-lg text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Jina lako (Your name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mary Wanjiku"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Namba ya M-Pesa (M-Pesa number)
                </label>
                <input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-lg text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <p className="mt-1 text-xs text-ink/50">
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
                  className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                  <option value="">None</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Ujumbe (Message - optional)
                </label>
                <textarea
                  placeholder="With thanksgiving for..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <button
                type="submit"
                disabled={!finalAmount || finalAmount < 10}
                className="w-full rounded-full bg-maroon py-4 text-lg font-bold text-cream shadow-lg shadow-maroon/20 transition hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Toa KES {finalAmount.toLocaleString()} via M-Pesa
              </button>

              <div className="rounded-xl bg-terracotta-tint p-4 text-center">
                <p className="text-sm font-medium text-ink/70">
                  AU — Lipa kwa M-Pesa Paybill
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-maroon">
                  247 247
                </p>
                <p className="text-sm text-ink/60">
                  Account: <span className="font-semibold">Harambee</span>
                </p>
              </div>
            </motion.form>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-maroon p-8 text-center text-cream"
            >
              <Loader2
                size={48}
                className="mx-auto mb-4 animate-spin text-gold"
              />
              <h3 className="font-display text-xl font-bold">
                Processing...
              </h3>
              <p className="mt-2 text-cream/80">
                Check your phone for the M-Pesa PIN prompt
              </p>
              <p className="mt-1 text-sm text-cream/60">
                Amount: KES {finalAmount.toLocaleString()}
              </p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-maroon p-8 text-center text-cream"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold"
              >
                <Check size={32} className="text-maroon" />
              </motion.div>

              <h3 className="font-display text-2xl font-bold">
                Asante sana{donorName ? `, ${donorName}` : ""}!
              </h3>
              <p className="mt-2 text-cream/80">
                Your gift of KES {finalAmount.toLocaleString()} has been
                received. May God bless you abundantly.
              </p>

              {receiptNumber && (
                <p className="mt-3 font-mono text-xs text-cream/50">
                  Receipt: {receiptNumber}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700"
                >
                  <Share2 size={16} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={handleGiveAgain}
                  className="flex-1 rounded-full bg-cream/20 px-6 py-3 font-bold text-cream transition hover:bg-cream/30"
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
