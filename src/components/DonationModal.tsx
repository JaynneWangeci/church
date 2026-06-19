import { useState, useCallback, useEffect } from 'react';
import { X, Heart, User, Phone, MessageSquare, Check, Loader2, ChevronDown, Search } from 'lucide-react';

type Step = 'form' | 'processing' | 'success';

const presets = [500, 1000, 2500, 5000, 10000];

interface Member {
  id: string;
  name: string;
  council?: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

interface Props {
  member: Member;
  donorName?: string;
  onClose: () => void;
}

export default function DonationModal({ member, onClose, donorName: initialDonorName }: Props) {
  const isGeneral = member.id === 'general';
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState<number | 'custom' | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState(initialDonorName || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [finalDonorName, setFinalDonorName] = useState('');

  const [memberList, setMemberList] = useState<Member[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [nameSearch, setNameSearch] = useState('');

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.ok && r.json())
      .then(data => { if (data?.members?.length) setMemberList(data.members); })
      .catch(() => {});
  }, []);

  const nameFiltered = nameSearch
    ? memberList.filter(m => m.name.toLowerCase().includes(nameSearch.toLowerCase()))
    : memberList;

  function initials(n: string): string {
    return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  }

  const pollStatus = useCallback((checkoutId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/status/${checkoutId}`);
        const data = await res.json();
        if (String(data.ResultCode) === '0' || data.status === 'completed') {
          clearInterval(interval);
          setReceiptNumber(data.receipt_number || `TXN-${Date.now()}`);
          setStep('success');
        } else if (data.ResultCode !== undefined && String(data.ResultCode) !== '0') {
          clearInterval(interval);
          setError('Payment failed. Please try again.');
          setStep('form');
        }
      } catch (err: any) {
        clearInterval(interval);
        setError(err?.message || 'Network error. Please try again.');
        setStep('form');
      }
    }, 3000);
    setTimeout(() => {
      clearInterval(interval);
      setError('Payment timed out. Please try again.');
      setStep('form');
    }, 60000);
  }, []);

  async function processDonation() {
    setError('');
    if (!name.trim()) { setError('Please select your name'); return; }
    const amt = amount === 'custom' ? Number(customAmount) || 0 : amount || 0;
    if (amt < 10) { setError('Amount must be at least KES 10'); return; }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!cleanPhone || cleanPhone.length < 10) { setError('Enter a valid M-Pesa phone number'); return; }

    setStep('processing');
    setFinalAmount(amt);
    setFinalDonorName(name);

    try {
      const campRes = await fetch('/api/campaigns/development-fund');
      if (!campRes.ok) {
        const errData = await campRes.json().catch(() => ({}));
        setError(errData?.error || `Campaign API error (${campRes.status})`);
        setStep('form'); return;
      }
      const campData = await campRes.json();
      if (!campData?.id) { setError('Campaign not found'); setStep('form'); return; }

      const donRes = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campData.id,
          donor_name: name || null,
          amount: amt,
          phone: cleanPhone,
          message: message || null,
          honored_member_id: null,
          church_member_id: isGeneral ? null : member.id,
        }),
      });
      const donData = await donRes.json();
      if (!donRes.ok || !donData.donation?.id) {
        setError(donData?.error || `Donation API error (${donRes.status})`);
        setStep('form'); return;
      }

      const mpesaRes = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: amt,
          donation_id: donData.donation.id,
          account_reference: name || 'Harambee',
          transaction_desc: isGeneral ? 'General Donation' : `Honour: ${member.name}`,
        }),
      });
      const mpesaData = await mpesaRes.json().catch(() => ({}));
      if (!mpesaRes.ok || !mpesaData.CheckoutRequestID) {
        setError(mpesaData?.errorMessage || mpesaData?.error || `M-Pesa failed (${mpesaRes.status})`);
        setStep('form'); return;
      }

      pollStatus(mpesaData.CheckoutRequestID);
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
      setStep('form');
    }
  }

  function reset() {
    setStep('form');
    setAmount(null); setCustomAmount(''); setPhone(''); setMessage('');
    setError(''); setReceiptNumber('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#1f2a1d]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2d3a2a]/10 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#85AB8B]/20 text-sm font-bold text-[#336443]">
              {isGeneral ? <Heart size={16} /> : member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1f2a1d]">{isGeneral ? 'General Harambee Fund' : member.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#2d3a2a]/10 transition-colors">
            <X size={16} className="text-[#4b5b47]" />
          </button>
        </div>

        <div className="p-6">
          {step === 'form' && (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f2a1d]">Amount (KES)</label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setAmount(p as any); setCustomAmount(''); }}
                      className={`rounded-lg py-2.5 text-sm font-bold transition ${
                        amount === p ? 'bg-[#1f2a1d] text-white shadow-sm' : 'border border-[#2d3a2a]/20 text-[#4b5b47] hover:border-[#336443] hover:text-[#336443]'
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
                  onChange={e => { setCustomAmount(e.target.value); if (e.target.value) setAmount('custom'); }}
                  className="mt-2 w-full rounded-xl border border-[#2d3a2a]/20 bg-white px-4 py-3 text-sm text-[#1f2a1d] outline-none transition focus:border-[#336443] placeholder:text-[#4b5b47]/40"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1f2a1d]">
                  <User size={14} className="text-[#85AB8B]" /> Your name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button type="button" onClick={() => setShowNameDropdown(!showNameDropdown)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#2d3a2a]/20 bg-white px-4 py-3 text-left outline-none transition-all hover:border-[#336443] focus:border-[#336443]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#336443] text-xs font-bold text-white">
                      {initials(name || "?")}
                    </div>
                    <span className="text-sm font-bold text-[#1f2a1d]">{name || <span className="font-normal text-[#4b5b47]">Select a member...</span>}</span>
                    <ChevronDown size={18} className={`ml-auto shrink-0 text-[#85AB8B] transition ${showNameDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showNameDropdown && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-[#2d3a2a]/10 bg-white shadow-lg">
                      <div className="border-b border-[#2d3a2a]/5 p-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5b47]" />
                          <input type="text" placeholder="Search members..." value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            className="w-full rounded-lg border border-[#2d3a2a]/10 bg-[#f5f7f4] py-2 pl-8 pr-3 text-xs font-medium text-[#1f2a1d] outline-none focus:border-[#336443]" autoFocus />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#2d3a2a]/5">
                        {nameFiltered.map(m => (
                          <button key={m.id} type="button"
                            onClick={() => { setName(m.name); setNameSearch(''); setShowNameDropdown(false); }}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-[#85AB8B]/5 ${
                              name === m.name ? 'bg-[#85AB8B]/10 font-bold' : ''
                            }`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              name === m.name ? 'bg-[#336443] text-white' : 'bg-[#85AB8B]/20 text-[#336443]'
                            }`}>
                              {initials(m.name)}
                            </div>
                            <p className={`text-sm ${name === m.name ? 'text-[#1f2a1d]' : 'text-[#1f2a1d] font-medium'}`}>{m.name}</p>
                            {name === m.name && <Check size={14} className="ml-auto text-[#336443]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1f2a1d]">
                  <Phone size={14} className="text-[#85AB8B]" /> M-Pesa number
                </label>
                <input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  className="w-full rounded-xl border border-[#2d3a2a]/20 bg-white px-4 py-3 text-sm text-[#1f2a1d] outline-none transition focus:border-[#336443] placeholder:text-[#4b5b47]/40"
                />
                <p className="mt-1 text-xs text-[#4b5b47]">You will receive an M-Pesa prompt to enter your PIN</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1f2a1d]">
                  <MessageSquare size={14} className="text-[#85AB8B]" /> Message <span className="font-normal text-[#4b5b47]">(optional)</span>
                </label>
                <textarea
                  placeholder={isGeneral ? 'With thanksgiving for...' : `In honour of ${member.name}...`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#2d3a2a]/20 bg-white px-4 py-3 text-sm text-[#1f2a1d] outline-none transition focus:border-[#336443] placeholder:text-[#4b5b47]/40 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={processDonation}
                disabled={!name.trim() || (!amount && !customAmount)}
                className="btn-lift w-full rounded-full bg-[#1f2a1d] py-3.5 text-base font-bold text-white shadow-sm hover:bg-[#2a3827] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGeneral
                  ? `Give KES ${(amount === 'custom' ? Number(customAmount) || 0 : amount || 0).toLocaleString()} via M-Pesa`
                  : `Honour ${member.name} with KES ${(amount === 'custom' ? Number(customAmount) || 0 : amount || 0).toLocaleString()}`}
              </button>

              <div className="rounded-xl border border-[#2d3a2a]/10 bg-[#85AB8B]/5 p-4 text-center">
                <p className="text-xs font-bold text-[#336443] uppercase tracking-wider">Or pay directly via M-Pesa Paybill</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#1f2a1d]">835 872</p>
                <div className="mx-auto mt-1 inline-flex items-center gap-1 rounded-full bg-[#85AB8B]/10 px-4 py-1.5">
                  <span className="text-xs text-[#4b5b47]">Account:</span>
                  <span className="text-xs font-bold text-[#1f2a1d]">Your Name</span>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#85AB8B]/20">
                <Loader2 size={32} className="animate-spin text-[#336443]" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2a1d]">
                {isGeneral ? 'Processing your gift...' : `Honouring ${member.name}...`}
              </h3>
              <p className="mt-2 text-sm text-[#4b5b47]">Check your phone for the M-Pesa PIN prompt</p>
              <p className="mt-1 text-sm font-semibold text-[#336443]">KES {finalAmount.toLocaleString()}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#2d3a2a]/10">
                <div className="animate-progress-shine h-full w-full rounded-full bg-[#336443]/30" />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 animate-bounce-in items-center justify-center rounded-full bg-[#336443]">
                <Check size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#1f2a1d]">
                Asante sana{finalDonorName ? `, ${finalDonorName}` : ''}!
              </h3>
              <p className="mt-2 text-sm text-[#4b5b47]">
                {isGeneral
                  ? `Your gift of KES ${finalAmount.toLocaleString()} has been received.`
                  : `Your honour gift of KES ${finalAmount.toLocaleString()} for ${member.name} has been received.`}
              </p>
              {!isGeneral && (
                <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#85AB8B]/10 px-4 py-1.5">
                  <Heart size={12} className="text-[#336443]" />
                  <span className="text-xs font-bold text-[#336443]">In honour of {member.name}</span>
                </div>
              )}
              {receiptNumber && (
                <p className="mt-3 font-mono text-xs text-[#4b5b47]">Receipt: {receiptNumber}</p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={reset}
                  className="btn-lift flex-1 rounded-full border border-[#2d3a2a]/20 px-5 py-2.5 text-sm font-bold text-[#4b5b47] hover:border-[#336443] hover:text-[#336443]"
                >
                  Give Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
