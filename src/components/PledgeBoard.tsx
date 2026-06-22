import { useState, useEffect, useRef } from 'react';
import { Medal, Search, Heart, HandHeart, DollarSign, ExternalLink, Check, X, Church, Users, User, Send } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import PersonalPortfolio from './PersonalPortfolio';
import PledgeForm from './PledgeForm';

function PledgeRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="text-blue-600 transition-all duration-700" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central" className="fill-gray-900 text-xs font-bold" fontSize="10">{Math.round(pct)}%</text>
    </svg>
  );
}

interface Pledge {
  id: string;
  donor_name: string;
  amount: number;
  paid: number;
  remaining: number;
  status: string;
  rating: number;
  color_hex: string;
}

interface Member { id: string; name: string; council: string; }

const councilMeta: Record<string, { label: string; icon: typeof Church; color: string }> = {
  maranatha_fellowship: { label: 'Maranatha Fellowship', icon: Church, color: 'bg-blue-100 text-blue-600' },
  bethlehem_fellowship: { label: "Bethlehem Fellowship", icon: Users, color: 'bg-pink-100 text-pink-600' },
  jerusalem_fellowship: { label: "Jerusalem Fellowship", icon: Users, color: 'bg-indigo-100 text-indigo-600' },
  aefeso_fellowship: { label: 'Aefeso Fellowship', icon: Medal, color: 'bg-amber-100 text-amber-600' },
};

function stars(paid: number, amount: number) {
  const pct = amount > 0 ? (paid / amount) * 100 : 0;
  const rating = pct >= 100 ? 5 : pct >= 75 ? 4 : pct >= 50 ? 3 : pct >= 25 ? 2 : pct > 0 ? 1 : 0;
  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];
  return (
    <div className="flex gap-0.5" title={`${pct.toFixed(1)}% fulfilled`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rating ? colors[rating - 1] : '#D1D5DB', fontSize: 10 }}>★</span>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

type Section = 'pledge' | 'commit' | 'track';

export default function PledgeBoard() {
  const { t } = useLang();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [activeSection, setActiveSection] = useState<Section>('pledge');

  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ pledges: Pledge[]; donations: any[]; honoured: any[] } | null>(null);
  const [portfolioName, setPortfolioName] = useState<string | null>(null);
  const [showPledgeForm, setShowPledgeForm] = useState(false);

  // Commit state
  const [commitSearch, setCommitSearch] = useState('');
  const [commitPledges, setCommitPledges] = useState<any[] | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [commitLoading, setCommitLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [payPollInterval, setPayPollInterval] = useState<any>(null);

  // Adjust pledge state
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustPhone, setAdjustPhone] = useState('');
  const [adjustPhoneVerified, setAdjustPhoneVerified] = useState(false);
  const [adjustNewAmount, setAdjustNewAmount] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustVerifying, setAdjustVerifying] = useState(false);

  // Member dropdown shared state
  const [members, setMembers] = useState<Member[]>([]);
  const trackDropdownRef = useRef<HTMLDivElement>(null);
  const commitDropdownRef = useRef<HTMLDivElement>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);

  useEffect(() => {
    fetch('/api/pledges')
      .then(r => r.ok && r.json())
      .then(d => { if (d?.pledges) setPledges(d.pledges); })
      .catch(() => {});
    fetch('/api/members')
      .then(r => r.ok && r.json())
      .then(d => { if (d?.members?.length) setMembers(d.members); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (trackDropdownRef.current && !trackDropdownRef.current.contains(e.target as Node)) setTrackOpen(false);
      if (commitDropdownRef.current && !commitDropdownRef.current.contains(e.target as Node)) setCommitOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function scoreMember(name: string, query: string): number {
    const n = name.toLowerCase();
    const q = query.toLowerCase();
    if (n === q) return 3;
    if (n.startsWith(q)) return 2;
    if (n.includes(q)) return 1;
    return 0;
  }

  function filterMembers(members: Member[], query: string) {
    if (!query) return members;
    return members
      .map(m => ({ ...m, _score: scoreMember(m.name, query) }))
      .filter(m => (m as any)._score > 0)
      .sort((a, b) => (b as any)._score - (a as any)._score || a.name.localeCompare(b.name));
  }

  const trackFiltered = filterMembers(members, search);
  const trackGrouped = trackFiltered.reduce((acc: Record<string, Member[]>, m) => {
    const key = m.council || 'other';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});
  const trackCouncilOrder = Object.keys(councilMeta).filter(c => trackGrouped[c]?.length);
  const trackExtra = Object.keys(trackGrouped).filter(c => !councilMeta[c]);
  const trackAllCouncils = [...trackCouncilOrder, ...trackExtra];

  const commitFiltered = filterMembers(members, commitSearch);
  const commitGrouped = commitFiltered.reduce((acc: Record<string, Member[]>, m) => {
    const key = m.council || 'other';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});
  const commitCouncilOrder = Object.keys(councilMeta).filter(c => commitGrouped[c]?.length);
  const commitExtra = Object.keys(commitGrouped).filter(c => !councilMeta[c]);
  const commitAllCouncils = [...commitCouncilOrder, ...commitExtra];

  async function handleSearch() {
    if (!search.trim()) { setResult(null); return; }
    const res = await fetch(`/api/pledges/search/name?q=${encodeURIComponent(search.trim())}`);
    if (res.ok) setResult(await res.json());
  }

  async function handleCommitSearch() {
    if (!commitSearch.trim()) { setCommitPledges(null); return; }
    setCommitLoading(true);
    const res = await fetch(`/api/pledges/search/name?q=${encodeURIComponent(commitSearch.trim())}`);
    if (res.ok) {
      const data = await res.json();
      setCommitPledges(data.pledges || []);
    }
    setCommitLoading(false);
  }

  async function handlePay(pledgeId: string) {
    setPayError('');
    const amt = Number(payAmount);
    if (!payAmount || amt <= 0) { setPayError('Enter a valid payment amount'); return; }
    const cleanPhone = payPhone.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone) { setPayError('Enter your M-Pesa phone number'); return; }

    setPayProcessing(true);
    const res = await fetch(`/api/pledges/${pledgeId}/pay-with-mpesa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, amount: amt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.CheckoutRequestID) {
      setPayError(data.error || 'M-Pesa request failed. Please try again.');
      setPayProcessing(false);
      return;
    }

    setPayError('Check your phone and enter your M-Pesa PIN to complete payment...');

    // Poll for payment status
    const pollId = setInterval(async () => {
      const statusRes = await fetch(`/api/mpesa/status/${data.CheckoutRequestID}`);
      const statusData = await statusRes.json().catch(() => ({}));
      if (statusData.status === "completed") {
        clearInterval(pollId);
        setPayPollInterval(null);
        setPayProcessing(false);
        setPayingId(null); setPayAmount(''); setPayPhone('');
        handleCommitSearch();
      } else if (statusData.status === "failed") {
        clearInterval(pollId);
        setPayPollInterval(null);
        setPayProcessing(false);
        setPayError('Payment failed or was cancelled. Please try again.');
      }
    }, 3000);
    setPayPollInterval(pollId);
  }

  async function handleVerifyPhone(pledgeId: string) {
    setAdjustError('');
    if (!adjustPhone.trim()) { setAdjustError('Enter your phone number'); return; }
    setAdjustVerifying(true);
    const res = await fetch(`/api/pledges/${pledgeId}/verify-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: adjustPhone.trim() }),
    });
    const data = await res.json().catch(() => ({ verified: false }));
    if (data.verified) {
      setAdjustPhoneVerified(true);
    } else {
      setAdjustError('Phone number does not match. Use the number you entered when making this pledge.');
    }
    setAdjustVerifying(false);
  }

  async function handleAdjustPledge(pledgeId: string) {
    setAdjustError('');
    const amt = Number(adjustNewAmount);
    if (!adjustNewAmount || amt < 10) { setAdjustError('Minimum pledge is KES 10'); return; }
    const res = await fetch(`/api/pledges/${pledgeId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: adjustPhone.trim(), new_amount: amt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to adjust' }));
      setAdjustError(err.error || 'Failed to adjust pledge');
      return;
    }
    setAdjustingId(null); setAdjustPhone(''); setAdjustPhoneVerified(false); setAdjustNewAmount('');
    handleCommitSearch();
  }

  function renderDropdown(
    open: boolean,
    filtered: any[],
    grouped: Record<string, Member[]>,
    allCouncils: string[],
    query: string,
    onSelect: (name: string) => void,
  ) {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-scale-in">
        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
          {allCouncils.length > 0 ? allCouncils.map(council => {
            const councilMembers = grouped[council];
            if (!councilMembers?.length) return null;
            const meta = councilMeta[council] || { label: council.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: Church, color: 'bg-gray-100 text-gray-600' };
            const Icon = meta.icon;
            return (
              <div key={council}>
                <div className="sticky top-0 flex items-center gap-2 bg-gray-50 px-4 py-1.5">
                  <Icon size={12} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{meta.label}</span>
                </div>
                {councilMembers.map(m => (
                  <button key={m.id} type="button" onClick={() => { onSelect(m.name); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-blue-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                      {initials(m.name)}
                    </div>
                    <p className="text-sm text-gray-900">{m.name}</p>
                  </button>
                ))}
              </div>
            );
          }) : (
            <div className="px-4 py-4 text-center text-xs text-gray-400">
              {query.trim() ? `Will be added as: "${query}"` : 'Type to search...'}
            </div>
          )}
        </div>
      </div>
    );
  }

  const sections: { key: Section; icon: typeof Medal; label: string; labelSw: string }[] = [
    { key: 'pledge', icon: HandHeart, label: 'Make a Pledge', labelSw: 'Weka Ahadi' },
    { key: 'commit', icon: DollarSign, label: 'Redeem', labelSw: 'Komboa' },
    { key: 'track', icon: Search, label: 'Track Progress', labelSw: 'Fuatilia Maendeleo' },
  ];

  const TABS = sections;

  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-widest">
            <Medal size={12} /> {t('Pledge Progress', 'Maendeleo ya Ahadi')}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">{t('See who has pledged and track fulfilment', 'Tazama walioahidi na ufuatilie utimilifu')}</h2>

          {/* Tab bar */}
          <div className="mx-auto mt-6 flex max-w-lg rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {TABS.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.key;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon size={14} />
                  {t(s.label, s.labelSw)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section 1: Make a Pledge ── */}
        {activeSection === 'pledge' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <HandHeart size={28} className="text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">{t('Make a Pledge', 'Weka Ahadi')}</h3>
            <p className="mb-6 text-sm text-gray-500 max-w-md mx-auto">
              {t('Commit to give towards the AIPCA Bahati Cathedral Development Fund. You can pay in instalments at your convenience.',
                'Ahidi kuchangia Mfuko wa Maendeleo wa AIPCA Bahati Cathedral. Unaweza kulipa kwa awamu kwa wakati unaofaa.')}
            </p>
            <button type="button" onClick={() => setShowPledgeForm(true)}
              className="btn-lift inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all">
              <HandHeart size={18} />
              {t('Make a Pledge', 'Weka Ahadi')}
            </button>

            {/* Pledge progress lookup */}
            {pledges.length > 0 && (
              <div className="mx-auto mt-8 max-w-md border-t border-gray-100 pt-6">
                <p className="mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('My Pledge Progress', 'Maendeleo ya Ahadi Yangu')}</p>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); setTrackOpen(true); }}
                    onFocus={() => setTrackOpen(true)}
                    placeholder={t('Type your name to see progress...', 'Andika jina lako kuona maendeleo...')}
                    className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500" />
                  {renderDropdown(trackOpen, trackFiltered, trackGrouped, trackAllCouncils, search, (name) => { setSearch(name); setTrackOpen(false); handleSearch(); })}
                </div>

                {result && result.pledges.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {result.pledges.map((p: any) => {
                      const pct = p.amount > 0 ? Math.min(100, Math.round((p.paid / p.amount) * 100)) : 0;
                      return (
                        <div key={p.id} className="rounded-lg bg-blue-50 p-3 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PledgeRing pct={pct} />
                              <div>
                                <p className="text-sm font-bold text-gray-900">{p.donor_name}</p>
                                <p className="text-xs text-gray-500">{t('Pledged:', 'Ameahidi:')} KES {p.amount.toLocaleString()}</p>
                              </div>
                            </div>
                            {p.status === 'fulfilled'
                              ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{t('Fulfilled ✓', 'Imekamilika ✓')}</span>
                              : <span className="text-sm font-bold text-blue-700">{pct}%</span>
                            }
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-gray-600">
                            <span>{t('Paid:', 'Amelipa:')} KES {p.paid.toLocaleString()}</span>
                            <span className="font-bold text-blue-600">{t('Remaining:', 'Inabaki:')} KES {p.remaining.toLocaleString()}</span>
                          </div>
                          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {result && !result.pledges.length && (
                  <p className="mt-3 text-xs text-gray-400">{t('No pledges yet. Make one above!', 'Hakuna ahadi bado. Weka moja hapo juu!')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Section 2: Redeem Pledge ── */}
        {activeSection === 'commit' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <DollarSign size={28} className="text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{t('Redeem Your Pledge', 'Komboa Ahadi Yako')}</h3>
              <p className="mb-6 text-sm text-gray-500 max-w-md mx-auto">
                {t('Search for your pledge by name and redeem it.',
                  'Tafuta ahadi yako kwa jina na uikomboe.')}
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <div ref={commitDropdownRef} className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={commitSearch} onChange={e => { setCommitSearch(e.target.value); setCommitOpen(true); }}
                  onFocus={() => setCommitOpen(true)}
                  onKeyDown={e => e.key === 'Enter' && handleCommitSearch()}
                  placeholder={t('Search your name...', 'Tafuta jina lako...')}
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-green-500" />
                {renderDropdown(commitOpen, commitFiltered, commitGrouped, commitAllCouncils, commitSearch, (name) => { setCommitSearch(name); setCommitOpen(false); handleCommitSearch(); })}
              </div>
              <button onClick={handleCommitSearch} disabled={commitLoading}
                className="mt-3 w-full rounded-full bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-all disabled:opacity-50">
                {commitLoading ? t('Searching...', 'Inatafuta...') : t('Find My Pledge', 'Tafuta Ahadi Yangu')}
              </button>
            </div>

            {commitPledges !== null && (
              <div className="mx-auto mt-6 max-w-lg space-y-3">
                {commitPledges.length > 0 ? commitPledges.map((p: any) => {
                  const pct = p.amount > 0 ? Math.min(100, Math.round((p.paid / p.amount) * 100)) : 0;
                  return (
                    <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.donor_name}</p>
                          <p className="text-xs text-gray-500">KES {p.amount.toLocaleString()} pledged</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          p.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{p.status}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>{t('Paid', 'Amelipa')}: KES {p.paid.toLocaleString()}</span>
                        <span className="font-bold text-green-600">{t('Remaining', 'Inabaki')}: KES {p.remaining.toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>

                      {p.status !== 'fulfilled' && (
                        <>
                          {payingId !== p.id ? (
                            <button onClick={() => { setPayingId(p.id); setPayAmount(''); setPayPhone(''); setPayError(''); if (payPollInterval) clearInterval(payPollInterval); setPayPollInterval(null); setPayProcessing(false); }}
                              className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition-all">
                              <DollarSign size={14} /> {t('Redeem Now', 'Komboa Sasa')}
                            </button>
                          ) : (
                            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                              <label className="text-xs font-semibold text-green-800">{t('Amount (KES)', 'Kiasi (KES)')}</label>
                              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                placeholder={t('Enter amount', 'Weka kiasi')}
                                className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                              <label className="text-xs font-semibold text-green-800">{t('M-Pesa Number', 'Nambari ya M-Pesa')}</label>
                              <input type="tel" value={payPhone} onChange={e => setPayPhone(e.target.value)}
                                placeholder="07XX XXX XXX"
                                className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                              {payError && <p className={`text-xs font-medium ${payProcessing ? 'text-blue-600' : 'text-red-600'}`}>{payError}</p>}
                              <div className="flex gap-2">
                                <button onClick={() => handlePay(p.id)} disabled={payProcessing}
                                  className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                                  {payProcessing
                                    ? <span className="flex items-center justify-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t('Sending PIN...', 'Inatuma PIN...')}</span>
                                    : <><Send size={14} className="inline mr-1" /> {t('Pay with M-Pesa', 'Lipa kwa M-Pesa')}</>
                                  }
                                </button>
                                <button onClick={() => { if (payPollInterval) clearInterval(payPollInterval); setPayPollInterval(null); setPayingId(null); setPayError(''); setPayProcessing(false); }}
                                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100">
                                  <X size={14} className="inline" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/*
                        ── Adjust Pledge ──
                      */}
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        {adjustingId !== p.id ? (
                          <button onClick={() => { setAdjustingId(p.id); setAdjustPhone(''); setAdjustPhoneVerified(false); setAdjustNewAmount(''); setAdjustError(''); }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                            {t('Adjust Pledge', 'Badilisha Ahadi')}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {!adjustPhoneVerified ? (
                              <>
                                <label className="text-xs font-semibold text-gray-700">{t('Verify your phone number', 'Thibitisha nambari yako')}</label>
                                <div className="flex gap-2">
                                  <input type="tel" value={adjustPhone} onChange={e => setAdjustPhone(e.target.value)}
                                    placeholder={t('Phone used when pledging', 'Nambari uliyotumia kuweka ahadi')}
                                    className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                                  <button onClick={() => handleVerifyPhone(p.id)} disabled={adjustVerifying}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                                    {adjustVerifying ? '...' : t('Verify', 'Thibitisha')}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-green-700 font-semibold">✓ {t('Phone verified', 'Nambari imethibitishwa')}</p>
                                <label className="text-xs font-semibold text-gray-700">{t('New Pledge Amount (KES)', 'Kiasi Kipya cha Ahadi (KES)')}</label>
                                <input type="number" value={adjustNewAmount} onChange={e => setAdjustNewAmount(e.target.value)}
                                  placeholder={String(p.amount)}
                                  className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                                <div className="flex gap-2">
                                  <button onClick={() => handleAdjustPledge(p.id)}
                                    className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700">
                                    {t('Save Changes', 'Hifadhi Mabadiliko')}
                                  </button>
                                  <button onClick={() => { setAdjustingId(null); setAdjustPhoneVerified(false); }}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100">
                                    <X size={14} className="inline" />
                                  </button>
                                </div>
                              </>
                            )}
                            {adjustError && <p className="text-xs text-red-600 font-medium">{adjustError}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">{t('No pledges found for this name', 'Hakuna ahadi zilizopatikana kwa jina hili')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Section 3: Track Progress ── */}
        {activeSection === 'track' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <Search size={28} className="text-amber-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{t('Track Progress', 'Fuatilia Maendeleo')}</h3>
              <p className="mb-6 text-sm text-gray-500 max-w-md mx-auto">
{t('Enter your full name to see all your pledges, donations, and contributions made in your honour.',
        'Ingiza jina lako kamili kuona ahadi zako zote, michango yako, na michango iliyotolewa kwa heshima yako.')}
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <div ref={trackDropdownRef} className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => { setSearch(e.target.value); setTrackOpen(true); }}
                  onFocus={() => setTrackOpen(true)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={t('Search your full name...', 'Tafuta jina lako kamili...')}
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-amber-500" />
                {renderDropdown(trackOpen, trackFiltered, trackGrouped, trackAllCouncils, search, (name) => { setSearch(name); setTrackOpen(false); handleSearch(); })}
              </div>
              <button onClick={handleSearch}
                className="mt-3 w-full rounded-full bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 transition-all">
                {t('View My Contributions', 'Angalia Michango Yangu')}
              </button>
            </div>

            {result && (
              <div className="mx-auto mt-6 max-w-lg">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase">{t('Your Contributions', 'Michango Yako')}</p>
                  </div>

                  {result.pledges.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-bold text-gray-500">{t('Pledges', 'Ahadi')}</p>
                      {result.pledges.map((p: any) => (
                        <div key={p.id} className="mb-2 rounded-lg bg-blue-50 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900">{p.donor_name}</p>
                            {stars(p.paid, p.amount)}
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-gray-600">
                            <span>{t('Pledged:', 'Ameahidi:')} KES {p.amount.toLocaleString()}</span>
                            <span>{t('Paid:', 'Amelipa:')} KES {p.paid.toLocaleString()}</span>
                            <span className="font-bold text-blue-600">{t('Remaining:', 'Inabaki:')} KES {p.remaining.toLocaleString()}</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, (p.paid / p.amount) * 100)}%` }} />
                          </div>
                          {p.status === 'fulfilled' && <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{t('Fulfilled ✓', 'Imekamilika ✓')}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.donations?.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-bold text-gray-500">{t('Donations Made', 'Michango Iliyotolewa')}</p>
                      {result.donations.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 mb-1">
                          <span className="text-xs text-gray-700">{d.donor_name || t('Anonymous', 'Asiyejulikana')}</span>
                          <span className="text-xs font-bold text-gray-900">KES {Number(d.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.honoured?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-bold text-gray-500">{t('Honoured By', 'Kuheshimiwa Na')}</p>
                      {result.honoured.map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 mb-1">
                          <div className="flex items-center gap-2">
                            <Heart size={12} className="text-amber-500" />
                            <div>
                              <span className="text-xs text-gray-700">{h.honour_known_as || h.donor_name || t('Anonymous', 'Asiyejulikana')}</span>
                              {h.phone && <p className="text-[10px] text-gray-400">{h.phone}</p>}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-700">KES {Number(h.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!result.pledges.length && !result.donations?.length && !result.honoured?.length && (
                    <p className="text-xs text-gray-400 text-center py-4">{t('No records found for this name', 'Hakuna rekodi zilizopatikana kwa jina hili')}</p>
                  )}
                </div>
                {result && (result.pledges.length > 0 || result.donations?.length > 0 || result.honoured?.length > 0) && (
                  <button onClick={() => setPortfolioName(search.trim())}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all">
                    <ExternalLink size={18} /> {t('View Full Portfolio', 'Tazama Wasifu Kamili')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {portfolioName && (
        <PersonalPortfolio name={portfolioName} onClose={() => setPortfolioName(null)} />
      )}

      {showPledgeForm && (
        <PledgeForm
          donorName=""
          onClose={() => setShowPledgeForm(false)}
          onCreated={() => {}}
        />
      )}
    </section>
  );
}
