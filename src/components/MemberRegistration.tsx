import { useState, useEffect, useRef } from 'react';
import { UserPlus, Church, Users, CheckCircle, Loader2, Search } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface Council {
  slug: string;
  name: string;
}

const COUNCIL_LABELS: Record<string, string> = {
  maranatha_fellowship: "Maranatha",
  bethlehem_fellowship: "Bethlehem",
  jerusalem_fellowship: "Jerusalem",
  aefeso_fellowship: "Aefeso",
  galilee_fellowship: "Galilee",
  bethel_fellowship: "Bethel",
  berea_fellowship: "Berea",
  judea_fellowship: "Judea",
  general_member: "General",
};

export default function MemberRegistration() {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [council, setCouncil] = useState('');
  const [gender, setGender] = useState('');
  const [councils, setCouncils] = useState<Council[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const searchTimer = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/councils')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.councils?.length) setCouncils(data.councils);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isUpdating = !!selectedMemberId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) { setMessage('Name must be at least 2 characters'); return; }
    if (!council) { setMessage('Please select your fellowship'); return; }
    if (!gender) { setMessage('Please select your gender'); return; }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/members/auto-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, council, gender: gender || undefined }),
      });

      const data = await res.json();

      if (res.ok) {
        setDone(true);
        if (data.existed) {
          const updated = trimmed === name && (data.member.council !== council || data.member.gender !== gender);
          setMessage(updated
            ? `Updated successfully, ${trimmed}!`
            : `Welcome back, ${trimmed}! You're already registered.`);
        } else {
          setMessage(`Thank you, ${trimmed}! You've been registered successfully.`);
        }
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMember(m: any) {
    setName(m.name);
    setCouncil(m.council);
    setGender(m.gender || "");
    setSelectedMemberId(m.id);
    setShowSuggestions(false);
    setMessage(`Editing ${m.name} — update fellowship or gender if wrong, then save.`);
  }

  if (done) {
    return (
      <section className="px-4 py-16" style={{ background: 'linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(15,40,71,0.9) 100%)' }}>
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 backdrop-blur-sm">
            <CheckCircle size={14} className="text-emerald-300" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">{isUpdating ? 'Updated' : 'Registered'}</span>
          </div>
          <p className="mb-4 text-lg font-bold text-white">{message}</p>
          <button onClick={() => { setDone(false); setName(''); setCouncil(''); setGender(''); setMessage(''); setSelectedMemberId(null); }}
            className="rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white/80 backdrop-blur-sm hover:bg-white/20 transition">
            {isUpdating ? 'Update another' : 'Register another member'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16" style={{ background: 'linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(15,40,71,0.9) 100%)' }}>
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 backdrop-blur-sm">
            <UserPlus size={14} className="text-blue-300" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{isUpdating ? 'Update' : t('Register', 'Jiandikisha')}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{isUpdating ? 'Update Your Details' : t('Join Our Church Family', 'Jiunge na Familia ya Kanisa')}</h2>
          <p className="mt-1 text-sm text-blue-200/70">
            {isUpdating
              ? 'Change your fellowship or gender below, then save.'
              : t('Register your name and fellowship so your donations are counted.', 'Andika jina lako na ushirika ili michango yako ihesabiwe.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-blue-400/20 bg-white/5 p-6 backdrop-blur-sm">
          <div ref={dropdownRef} className="relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
              <UserPlus size={14} className="text-blue-300" /> {t('Your Name', 'Jina Lako')}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50" />
              <input type="text" value={name} onChange={e => {
                const val = e.target.value;
                setName(val);
                setSelectedMemberId(null);
                setShowSuggestions(true);
                if (searchTimer.current) clearTimeout(searchTimer.current);
                if (val.trim().length >= 1) {
                  setSearching(true);
                  searchTimer.current = setTimeout(async () => {
                    try {
                      const res = await fetch(`/api/members/search?q=${encodeURIComponent(val.trim())}`);
                      if (res.ok) { const d = await res.json(); setSuggestions(d.members || []); }
                    } catch {}
                    setSearching(false);
                  }, 200);
                } else {
                  fetch(`/api/members/search`).then(r => r.ok ? r.json() : null).then(d => setSuggestions(d?.members || [])).catch(() => {});
                  setSearching(false);
                }
              }}
                onFocus={() => {
                  setShowSuggestions(true);
                  if (!name.trim()) {
                    fetch(`/api/members/search`).then(r => r.ok ? r.json() : null).then(d => setSuggestions(d?.members || [])).catch(() => {});
                  }
                }}
                placeholder={t('Type your name or select from list...', 'Andika jina lako au chagua kutoka orodha...')}
                className="w-full rounded-xl border border-blue-400/20 bg-white/10 pl-9 pr-3 py-3 text-sm text-white outline-none transition focus:border-blue-300 placeholder:text-blue-300/40" />
            </div>
            {showSuggestions && (name.trim() || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-blue-400/20 bg-[#0f2847] shadow-xl backdrop-blur-sm">
                {searching ? (
                  <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-300" /></div>
                ) : suggestions.length > 0 ? (
                  (() => {
                    const councilsInResults = [...new Set(suggestions.map((m: any) => m.council))];
                    return councilsInResults.map(council => {
                      const members = suggestions.filter((m: any) => m.council === council);
                      return (
                        <div key={council}>
                          <div className="sticky top-0 flex items-center gap-2 bg-blue-900/60 px-3 py-1.5">
                            <Church size={10} className="text-blue-300" />
                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">{COUNCIL_LABELS[council] || council.replace(/_/g, " ")}</span>
                          </div>
                          {members.map((m: any) => (
                            <button key={m.id} type="button" onClick={() => handleSelectMember(m)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/10">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400/20 text-xs font-bold text-blue-200">
                                {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{m.name}</p>
                                <p className="text-[10px] text-blue-300/60">{COUNCIL_LABELS[m.council] || m.council?.replace(/_/g, " ")}{m.gender ? ` · ${m.gender}` : ""}</p>
                              </div>
                              <span className="shrink-0 text-[10px] text-blue-300 underline">Select</span>
                            </button>
                          ))}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="px-3 py-3 text-center text-xs text-blue-300/60">
                    Will be registered as: <span className="font-bold text-white">{name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
              <Church size={14} className="text-blue-300" /> {t('Fellowship', 'Ushirika')}
            </label>
            <select value={council} onChange={e => setCouncil(e.target.value)}
              className="w-full rounded-xl border border-blue-400/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300">
              <option value="" className="text-gray-800">{t('Select your fellowship...', 'Chagua ushirika wako...')}</option>
              {councils.map(c => (
                <option key={c.slug} value={c.slug} className="text-gray-800">{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
              <Users size={14} className="text-blue-300" /> {t('Gender', 'Jinsia')} <span className="text-red-400">*</span>
            </label>
            <select value={gender} onChange={e => setGender(e.target.value)}
              className="w-full rounded-xl border border-blue-400/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300">
              <option value="" className="text-gray-800">{t('Select gender...', 'Chagua jinsia...')}</option>
              <option value="male" className="text-gray-800">{t('Male', 'Mwanaume')}</option>
              <option value="female" className="text-gray-800">{t('Female', 'Mwanamke')}</option>
            </select>
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              message.includes('Thank you') || message.includes('Welcome back') || message.includes('Updated') || message.includes('Editing')
                ? 'bg-blue-500/20 text-blue-200'
                : 'bg-red-500/20 text-red-200'
            }`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading || !name.trim() || !council || !gender}
            className="btn-lift flex w-full items-center justify-center gap-2 rounded-full bg-amber px-5 py-3 text-sm font-bold text-[#0a1628] shadow-lg hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 transition">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? (isUpdating ? 'Updating...' : t('Registering...', 'Inaandikisha...')) : (isUpdating ? 'Save Changes' : t('Register', 'Jiandikisha'))}
          </button>
        </form>
      </div>
    </section>
  );
}
