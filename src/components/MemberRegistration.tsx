import { useState, useEffect } from 'react';
import { UserPlus, Church, Users, CheckCircle, Loader2 } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface Council {
  slug: string;
  name: string;
}

export default function MemberRegistration() {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [council, setCouncil] = useState('');
  const [gender, setGender] = useState('');
  const [councils, setCouncils] = useState<Council[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/councils')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.length) setCouncils(data);
      })
      .catch(() => {});
  }, []);

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
        setMessage(data.existed
          ? `Welcome back, ${trimmed}! You're already registered.`
          : `Thank you, ${trimmed}! You've been registered successfully.`);
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="px-4 py-16" style={{ background: 'linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(15,40,71,0.9) 100%)' }}>
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 backdrop-blur-sm">
            <CheckCircle size={14} className="text-emerald-300" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Registered</span>
          </div>
          <p className="mb-4 text-lg font-bold text-white">{message}</p>
          <button onClick={() => { setDone(false); setName(''); setCouncil(''); setGender(''); setMessage(''); }}
            className="rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white/80 backdrop-blur-sm hover:bg-white/20 transition">
            Register another member
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
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{t('Register', 'Jiandikisha')}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{t('Join Our Church Family', 'Jiunge na Familia ya Kanisa')}</h2>
          <p className="mt-1 text-sm text-blue-200/70">
            {t('Register your name and fellowship so your donations are counted.', 'Andika jina lako na ushirika ili michango yako ihesabiwe.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-blue-400/20 bg-white/5 p-6 backdrop-blur-sm">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
              <UserPlus size={14} className="text-blue-300" /> {t('Your Name', 'Jina Lako')}
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('e.g. John Kamau', 'mf. John Kamau')}
              className="w-full rounded-xl border border-blue-400/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300 placeholder:text-blue-300/40" />
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
            <div className={`rounded-xl px-4 py-3 text-sm ${message.includes('Thank you') || message.includes('Welcome back') ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading || !name.trim() || !council || !gender}
            className="btn-lift flex w-full items-center justify-center gap-2 rounded-full bg-amber px-5 py-3 text-sm font-bold text-[#0a1628] shadow-lg hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-40 transition">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? t('Registering...', 'Inaandikisha...') : t('Register', 'Jiandikisha')}
          </button>
        </form>
      </div>
    </section>
  );
}
