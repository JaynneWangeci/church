"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Loader2, Share2, ChevronDown, Search } from "lucide-react";

type Step = "form" | "processing" | "success";
const presets = [500, 1000, 2500, 5000, 10000];

interface MemberOption {
  id: string;
  name: string;
  role: string;
  council: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);

  const finalAmount = amount === "custom" ? Number(customAmount) || 0 : amount || 0;

  const selectedMember = members.find((m) => m.id === honoredMember);

  const filteredMembers = memberSearch
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.role.toLowerCase().includes(memberSearch.toLowerCase()),
      )
    : members;

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
    <section id="give" className="scroll-mt-16 bg-gradient-to-b from-slate to-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-lg">
        <div className="animate-slide-up text-center">
          <span className="inline-block rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            Give
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Make Your Contribution
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Give via M-Pesa and choose to honor a committee member
          </p>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5 animate-slide-up">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
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
                        : "bg-white text-muted hover:bg-nobuk-muted border border-gray-200"
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
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-nobuk"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Your name <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mary Wanjiku"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-nobuk"
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
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-nobuk"
              />
              <p className="mt-1 text-xs text-muted">
                You will receive an M-Pesa prompt to enter your PIN
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Honor a committee member <span className="text-muted">(optional)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMemberOpen(!memberOpen)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-ink outline-none transition focus:border-nobuk"
                >
                  {selectedMember ? (
                    <>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                        {initials(selectedMember.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{selectedMember.name}</p>
                        <p className="text-xs text-muted">{selectedMember.role}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted">Select a member to honour...</span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`ml-auto shrink-0 text-muted transition ${memberOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {memberOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 p-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="w-full rounded-lg bg-slate py-2 pl-8 pr-3 text-sm text-ink outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => { setHonoredMember(""); setMemberOpen(false); setMemberSearch(""); }}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-muted hover:bg-slate"
                      >
                        None
                      </button>
                      {filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setHonoredMember(m.id); setMemberOpen(false); setMemberSearch(""); }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate ${
                            honoredMember === m.id ? "bg-nobuk-muted" : ""
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                            {initials(m.name)}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium text-ink">{m.name}</p>
                            <p className="text-xs text-muted">{m.role}</p>
                          </div>
                        </button>
                      ))}
                      {filteredMembers.length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-muted">
                          No members found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Message <span className="text-muted">(optional)</span>
              </label>
              <textarea
                placeholder="With thanksgiving for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-nobuk"
              />
            </div>

            <button
              type="submit"
              disabled={!finalAmount || finalAmount < 10}
              className="w-full rounded-full bg-nobuk py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Give KES {finalAmount.toLocaleString()} via M-Pesa
            </button>

            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                Or pay directly via M-Pesa Paybill
              </p>
              <p className="mt-1 text-xl font-bold text-nobuk">247 247</p>
              <p className="text-xs text-muted">
                Account: <span className="font-semibold">Harambee</span>
              </p>
            </div>
          </form>
        )}

        {step === "processing" && (
          <div className="mt-8 animate-fade-in rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <Loader2 size={36} className="mx-auto mb-4 animate-spin text-nobuk" />
            <h3 className="text-lg font-semibold text-ink">Processing...</h3>
            <p className="mt-2 text-sm text-muted">
              Check your phone for the M-Pesa PIN prompt
            </p>
            <p className="mt-1 text-xs text-muted">
              Amount: KES {finalAmount.toLocaleString()}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="mt-8 animate-scale-in rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 animate-bounce-in items-center justify-center rounded-full bg-nobuk">
              <Check size={28} className="text-white" />
            </div>

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
          </div>
        )}
      </div>
    </section>
  );
}
