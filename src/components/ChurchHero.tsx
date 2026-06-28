import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import DonationModal from './DonationModal';
import HarambeeCountdown from './HarambeeCountdown';
import NobukProgress from './NobukProgress';
import LiveProgress from './LiveProgress';

const TITLE = 'Building His House, Together.';
const SW_TITLE = 'Kujenga Nyumba Yake, Pamoja.';

export default function ChurchHero() {
  const { lang, t } = useLang();
  const [showGive, setShowGive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heading = lang === 'en' ? TITLE : SW_TITLE;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-16 pb-8 sm:pt-28">
      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'top-3 mx-4 max-w-6xl xl:mx-auto rounded-2xl bg-white/20 backdrop-blur-xl border border-white/25 shadow-2xl shadow-sky-900/20'
            : 'top-0 bg-transparent'
        }`}
        style={{
          left: scrolled ? '50%' : '0',
          transform: scrolled ? 'translateX(-50%)' : 'none',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#38BDF8]/40 to-[#38BDF8]/10 animate-pulse" />
              <img
                src="/images/a.jpeg"
                alt="AIPCA"
                className="relative h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white">AIPCA</span>
              <span className="hidden sm:inline text-sm font-medium text-white/50">Bahati Cathedral</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGive(true)}
              className="group relative overflow-hidden rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:shadow-lg hover:shadow-white/10 active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Heart size={14} className="text-[#38BDF8] group-hover:scale-110 transition-transform duration-300" />
                {t('Give Now', 'Toa Sasa')}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 backdrop-blur-sm"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease-out 0.1s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#38BDF8] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#38BDF8]" />
        </span>
        <span className="text-[9px] font-semibold tracking-[0.2em] text-[#38BDF8] uppercase">
          2026 · {t('Tujenge Pamoja', 'Tujenge Pamoja')}
        </span>
      </div>

      {/* Heading */}
      <h1
        className="mt-3 text-center text-[2rem] leading-[1] font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
        style={{
          fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '-0.04em',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'opacity 0.6s ease-out 0.2s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
        }}
      >
        {heading}
      </h1>

      {/* Verse */}
      <p
        className="mt-2 max-w-xs text-center text-sm text-white/60 leading-relaxed"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease-out 0.3s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
        }}
      >
        <span className="italic text-[#38BDF8]/70">&ldquo;{t('Unless the Lord builds the house, its builders labour in vain.', 'Bwana asipoijenga nyumba, wajengi hufanya kazi bure.')}&rdquo;</span>
        <br />
        <span className="text-white/20">Psalm 127:1</span>
      </p>

      {/* CTA */}
      <div
        className="mt-4 flex items-center gap-4"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease-out 0.4s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
        }}
      >
        <button
          onClick={() => setShowGive(true)}
          className="group relative overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-bold text-sky-900 transition-all duration-300 hover:shadow-xl hover:shadow-white/20 active:scale-[0.97]"
        >
          <span className="relative z-10">{t('Give to the Harambee', 'Toa kwa Harambee')}</span>
          <span className="absolute inset-0 bg-gradient-to-r from-white via-[#E8F0FE] to-white translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
        </button>
      </div>

      {/* Countdown */}
      <div
        className="mt-4 w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center backdrop-blur-sm"
        style={{
          opacity: revealed ? 1 : 0,
          transition: 'opacity 0.6s ease-out 0.5s',
        }}
      >
        <HarambeeCountdown />
      </div>

      {/* Harambee progress — minimized above pledges */}
      <div
        className="mt-4 w-full max-w-sm"
        style={{
          opacity: revealed ? 1 : 0,
          transition: 'opacity 0.6s ease-out 0.55s',
        }}
      >
        <LiveProgress compact />
      </div>

      {/* Pledges progress — below harambee progress */}
      <div
        className="mt-3 w-full max-w-sm"
        style={{
          opacity: revealed ? 1 : 0,
          transition: 'opacity 0.6s ease-out 0.6s',
        }}
      >
        <NobukProgress />
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        style={{
          opacity: revealed ? 0.4 : 0,
          transition: 'opacity 0.8s ease-out 0.8s',
        }}
      >
        <span className="text-[9px] font-medium tracking-widest text-white/30 uppercase">{t('Scroll', 'Tembeza')}</span>
        <div className="h-6 w-[1px] bg-gradient-to-b from-white/40 to-transparent animate-scroll-indicator" />
      </div>

      {showGive && (
        <DonationModal
          member={{ id: 'general', name: '' }}
          onClose={() => setShowGive(false)}
        />
      )}
    </section>
  );
}
