import { useState, useEffect, useRef } from 'react';
import { Medal, Search, Heart, HandHeart, DollarSign, ExternalLink, Check, X, Church, Users, User, Send, Gift } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import PersonalPortfolio from './PersonalPortfolio';
import PledgeForm from './PledgeForm';
import DonationModal from './DonationModal';

function PledgeRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="text-blue-600 transition-all duration-700" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central" className="fill-gray-900 text-xs font-bold" fontSize="10">{pct.toFixed(2)}%</text>
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
  galilee_fellowship: { label: 'Galilee Fellowship', icon: Users, color: 'bg-purple-100 text-purple-600' },
  bethel_fellowship: { label: 'Bethel Fellowship', icon: Users, color: 'bg-cyan-100 text-cyan-600' },
  berea_fellowship: { label: 'Berea Fellowship', icon: Users, color: 'bg-emerald-100 text-emerald-600' },
  judea_fellowship: { label: 'Judea Fellowship', icon: Users, color: 'bg-orange-100 text-orange-600' },
  general_member: { label: 'General Member', icon: Users, color: 'bg-gray-100 text-gray-600' },
};

function stars(paid: number, amount: number) {
  const pct = amount > 0 ? (paid / amount) * 100 : 0;
  const rating = pct >= 100 ? 5 : pct >= 75 ? 4 : pct >= 50 ? 3 : pct >= 25 ? 2 : pct > 0 ? 1 : 0;
  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];
  return (
    <div className="flex gap-0.5" title={`${pct.toFixed(2)}% fulfilled`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rating ? colors[rating - 1] : '#D1D5DB', fontSize: 10 }}>★</span>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

type Section = 'pledge' | 'commit' | 'track' | 'give';

export default function PledgeBoard() {
  const { t } = useLang();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [activeSection, setActiveSection] = useState<Section>('give');

  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ pledges: Pledge[]; donations: any[]; honoured: any[] } | null>(null);
  const [portfolioName, setPortfolioName] = useState<string | null>(null);
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [showGive, setShowGive] = useState(false);
  const [bulging, setBulging] = useState(false);

  // Commit state
  const [commitSearch, setCommitSearch] = useState('');
  const [commitPledges, setCommitPledges] = useState<any[] | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payPhones, setPayPhones] = useState<Record<string, string>>({});
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});
  const [payProcessing, setPayProcessing] = useState(false);

  // Adjust pledge state
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustNewAmount, setAdjustNewAmount] = useState('');
  const [adjustError, setAdjustError] = useState('');

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

  async function handleSearch(name?: string) {
    const q = (name ?? search).trim();
    if (!q) { setResult(null); return; }
    const res = await fetch(`/api/pledges/search/name?q=${encodeURIComponent(q)}`);
    if (res.ok) setResult(await res.json());
  }

  async function handleCommitSearch(name?: string) {
    try {
      const q = (name ?? commitSearch).trim();
      if (!q) { setCommitPledges(null); return; }
      setCommitLoading(true);
      const res = await fetch(`/api/pledges/search/name?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCommitPledges(data.pledges || []);
      }
      setCommitLoading(false);
    } catch { setCommitLoading(false); }
  }



  async function handlePay(pledgeId: string) {
    const amt = payAmounts[pledgeId] || '';
    const ph = payPhones[pledgeId] || '';
    if (!amt || Number(amt) <= 0) { setPayErrors(prev => ({ ...prev, [pledgeId]: 'Enter a valid amount' })); return; }
    const clean = ph.replace(/[\s\-\(\)]/g, '');
    if (!clean) { setPayErrors(prev => ({ ...prev, [pledgeId]: 'Enter your M-Pesa number' })); return; }
    setPayProcessing(true);
    setPayErrors(prev => ({ ...prev, [pledgeId]: '' }));
    try {
      const res = await fetch(`/api/pledges/${pledgeId}/pay-with-mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, amount: Number(amt) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.CheckoutRequestID) {
        setPayErrors(prev => ({ ...prev, [pledgeId]: body.error || 'M-Pesa request failed' }));
        setPayProcessing(false); return;
      }
      setPayErrors(prev => ({ ...prev, [pledgeId]: 'Check your phone and enter PIN to complete...' }));
      let pollCount = 0;
      const poll = () => {
        pollCount++;
        fetch(`/api/mpesa/status/${body.CheckoutRequestID}`)
          .then(r => r.json().catch(() => ({})))
          .then(s => {
            if (s.status === 'completed') {
              setPayProcessing(false);
              setPayAmounts(p => { const n = { ...p }; delete n[pledgeId]; return n; });
              setPayPhones(p => { const n = { ...p }; delete n[pledgeId]; return n; });
              setPayErrors(p => { const n = { ...p }; delete n[pledgeId]; return n; });
              handleCommitSearch();
              window.dispatchEvent(new Event('pledge:changed'));
              return;
            }
            if (s.status === 'failed') {
              setPayProcessing(false);
              setPayErrors(prev => ({ ...prev, [pledgeId]: 'Payment was cancelled or failed' }));
              return;
            }
            // Exponential backoff: 2s → 3s → 5s → 8s → max 10s
            const delay = Math.min(2000 * Math.pow(1.5, pollCount), 10000);
            setTimeout(poll, delay);
          })
          .catch(() => { setPayProcessing(false); setPayErrors(prev => ({ ...prev, [pledgeId]: 'Status check failed' })); });
      };
      poll();
    } catch {
      setPayProcessing(false);
      setPayErrors(prev => ({ ...prev, [pledgeId]: 'Network error. Try again.' }));
    }
  }

  async function handleAdjustPledge(pledgeId: string) {
    setAdjustError('');
    const raw = adjustNewAmount.replace(/[^0-9]/g, '');
    if (!raw) { setAdjustError('Enter a valid amount'); return; }
    const amt = parseInt(raw, 10);
    if (amt < 10) { setAdjustError('Minimum pledge is KES 10'); return; }
    const res = await fetch(`/api/pledges/${pledgeId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_amount: amt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to adjust' }));
      setAdjustError(err.error || 'Failed to adjust pledge');
      return;
    }
    setAdjustingId(null); setAdjustNewAmount('');
    handleCommitSearch();
    window.dispatchEvent(new Event('pledge:changed'));
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
    { key: 'give', icon: Gift, label: 'Give Now', labelSw: 'Toa Sasa' },
    { key: 'pledge', icon: HandHeart, label: 'Make a Pledge', labelSw: 'Weka Ahadi' },
    { key: 'commit', icon: DollarSign, label: 'Redeem', labelSw: 'Komboa' },
    { key: 'track', icon: Search, label: 'Track Progress', labelSw: 'Fuatilia Maendeleo' },
  ];

  const TABS = sections;

  return (
    <section className="sky-card-glass !bg-white/20 px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-widest">
            <Medal size={12} /> {t('Pledge Progress', 'Maendeleo ya Ahadi')}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">{t('See who has pledged and track fulfilment', 'Tazama walioahidi na ufuatilie utimilifu')}</h2>

          {/* Tab bar */}
          <div className="mx-auto mt-6 flex max-w-2xl gap-1 overflow-x-auto overflow-y-hidden flex-nowrap rounded-2xl bg-gray-100/80 p-1.5 shadow-inner scrollbar-hide [-webkit-overflow-scrolling:touch]">
            {TABS.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.key;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`relative flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-all duration-200 md:flex-1 md:gap-2 md:px-3 md:py-2.5 md:text-xs ${
                    isActive
                      ? 'bg-white text-sky-900 shadow-lg shadow-sky-900/10 scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                  }`}>
                  <Icon size={14} className={`${isActive ? 'text-sky-600' : 'text-gray-400'} md:size-[15px]`} />
                  {t(s.label, s.labelSw)}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-sky-500 md:w-8" />
                  )}
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
                {renderDropdown(trackOpen, trackFiltered, trackGrouped, trackAllCouncils, search, (name) => { setSearch(name); setTrackOpen(false); handleSearch(name); })}
                </div>

                {result && result.pledges.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {result.pledges.map((p: any) => {
                      const pct = p.amount > 0 ? Math.min(100, (p.paid / p.amount) * 100) : 0;
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
                              : <span className="text-sm font-bold text-blue-700">{pct.toFixed(2)}%</span>
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
                {renderDropdown(commitOpen, commitFiltered, commitGrouped, commitAllCouncils, commitSearch, (name) => { setCommitSearch(name); setCommitOpen(false); handleCommitSearch(name); })}
              </div>
              <button onClick={handleCommitSearch} disabled={commitLoading}
                className="mt-3 w-full rounded-full bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-all disabled:opacity-50">
                {commitLoading ? t('Searching...', 'Inatafuta...') : t('Find My Pledge', 'Tafuta Ahadi Yangu')}
              </button>
            </div>

            {commitPledges !== null && (
              <div className="mx-auto mt-6 max-w-lg space-y-3">
                {commitPledges.length > 0 ? commitPledges.map((p: any) => {
                  const pct = p.amount > 0 ? Math.min(100, (p.paid / p.amount) * 100) : 0;
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

                      {(p.status !== 'fulfilled') && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                          <label className="text-xs font-semibold text-green-800">{t('Amount (KES)', 'Kiasi (KES)')}</label>
                          <input type="number" value={payAmounts[p.id] || ''} onChange={e => setPayAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder={t('Enter amount', 'Weka kiasi')}
                            className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-green-500" />
                          <label className="text-xs font-semibold text-green-800">{t('M-Pesa Number', 'Nambari ya M-Pesa')}</label>
                          <input type="tel" value={payPhones[p.id] || ''} onChange={e => setPayPhones(prev => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="07XX XXX XXX"
                            className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-green-500" />
                          {payErrors[p.id] && <p className={`text-xs font-medium ${payProcessing ? 'text-blue-600' : 'text-red-600'}`}>{payErrors[p.id]}</p>}
                          <button onClick={() => handlePay(p.id)} disabled={payProcessing}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-all">
                            {payProcessing
                              ? <span className="flex items-center justify-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t('Sending PIN...', 'Inatuma PIN...')}</span>
                              : <><Send size={14} className="inline mr-1" /> {t('Pay with M-Pesa', 'Lipa kwa M-Pesa')}</>
                            }
                          </button>
                        </div>
                      )}

                      {/*
                        ── Adjust Pledge (Add / Reduce) ──
                      */}
                      {p.status !== 'fulfilled' && adjustingId !== p.id && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => { setAdjustingId(p.id); setAdjustNewAmount(String(p.amount + 1000)); setAdjustError(''); }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.97] transition-all">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            {t('Add to Pledge', 'Ongeza Ahadi')}
                          </button>
                          <button onClick={() => { setAdjustingId(p.id); setAdjustNewAmount(String(Math.max(10, p.amount - 1000))); setAdjustError(''); }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-orange-400 bg-orange-50 py-3 text-sm font-bold text-orange-700 shadow-sm hover:bg-orange-100 hover:shadow-md active:scale-[0.97] transition-all">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            {t('Reduce Pledge', 'Punguza Ahadi')}
                          </button>
                        </div>
                      )}
                      {adjustingId === p.id && (
                        <div className="mt-3 space-y-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">{t('Current Pledge:', 'Ahadi ya Sasa:')} KES {p.amount.toLocaleString()}</p>
                            <p className="text-sm font-bold text-green-700">{t('Paid:', 'Imelipwa:')} KES {p.paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="mb-1.5 text-sm font-bold text-gray-700">{t('New Pledge Amount (KES)', 'Kiasi Kipya cha Ahadi (KES)')}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setAdjustNewAmount(String(Math.max(10, Number(adjustNewAmount) - 1000)))}
                                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-bold text-xl transition-all shadow-sm active:scale-95">−</button>
                              <input type="text" inputMode="numeric" pattern="[0-9]*" value={adjustNewAmount} onChange={e => setAdjustNewAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder={String(p.amount)}
                                className="flex-1 rounded-xl border-2 border-blue-300 bg-white px-4 py-3 text-base text-gray-900 text-center font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                              <button onClick={() => setAdjustNewAmount(String(Number(adjustNewAmount) + 1000))}
                                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-bold text-xl transition-all shadow-sm active:scale-95">+</button>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleAdjustPledge(p.id)}
                              className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.97]">
                              {t('Save Changes', 'Hifadhi Mabadiliko')}
                            </button>
                            <button onClick={() => setAdjustingId(null)}
                              className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all">
                              {t('Cancel', 'Ghairi')}
                            </button>
                          </div>
                          {adjustError && <p className="text-sm font-bold text-red-600">{adjustError}</p>}
                        </div>
                      )}
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
                {renderDropdown(trackOpen, trackFiltered, trackGrouped, trackAllCouncils, search, (name) => { setSearch(name); setTrackOpen(false); handleSearch(name); })}
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

        {/* ── Section 4: Give Now ── */}
        {activeSection === 'give' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Gift size={28} className="text-amber-600" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">{t('Give to the Harambee', 'Toa kwa Harambee')}</h3>
            <p className="mb-6 text-sm text-gray-500 max-w-md mx-auto">
              {t('Make a direct donation to the AIPCA Bahati Cathedral Development Fund. Every contribution makes a difference.',
                'Toa mchango wa moja kwa moja kwa Mfuko wa Maendeleo wa AIPCA Bahati Cathedral. Kila mchango unaleta mabadiliko.')}
            </p>
            <button type="button" onClick={() => { setBulging(true); setShowGive(true); setTimeout(() => setBulging(false), 400); }}
              className={`btn-lift inline-flex items-center gap-2 rounded-full bg-amber-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-all ${bulging ? 'scale-110' : ''}`}>
              <Gift size={18} />
              {t('Give Now', 'Toa Sasa')}
            </button>
          </div>
        )}
      </div>

      {showGive && (
        <DonationModal
          member={{ id: 'general', name: '' }}
          onClose={() => setShowGive(false)}
        />
      )}

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
