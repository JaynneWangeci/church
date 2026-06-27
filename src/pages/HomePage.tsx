import { useState, useEffect, useCallback } from 'react';
import { Globe, MapPin, Heart, HandHeart, Phone, Share2 } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useInView } from '../hooks/useInView';
import useParallax from '../hooks/useParallax';
import SlideshowBackground from "../components/SlideshowBackground";
import Ambient3D from "../components/Ambient3D";
import ChurchHero from "../components/ChurchHero";
import LiveProgress from "../components/LiveProgress";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import MemberRegistration from "../components/MemberRegistration";
import PledgeBoard from "../components/PledgeBoard";

import Footer from "../components/Footer";
import FellowshipProgress from "../components/FellowshipProgress";
import GenderCompetition from "../components/GenderCompetition";

const SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'register', label: 'Register' },
  { id: 'contribute', label: 'Honour' },
  { id: 'pledge-board', label: 'Pledge' },
  { id: 'live-progress', label: 'Progress' },
  { id: 'fellowships', label: 'Fellowships' },
  { id: 'gender-challenge', label: 'Men vs Women' },
  { id: 'about', label: 'About' },
];

export default function HomePage() {
  const { lang, setLang, t } = useLang();
  const { ref: mapRef, inView: mapInView } = useInView();
  const [activeSection, setActiveSection] = useState('hero');
  const [phone, setPhone] = useState("0727278577");
  useParallax();
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id') || 'hero';
          setActiveSection(id);
        }
      }
    }, { rootMargin: '-40% 0px -55% 0px' });

    const sections = document.querySelectorAll('section[id]');
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.settings?.church_phone) setPhone(data.settings.church_phone);
      })
      .catch(() => {});
  }, []);

  const handleShare = useCallback(() => {
    const text = `🏛️ Support AIPCA Bahati Cathedral Harambee!\n\nGive at https://aipcaharambee.com`;
    if (navigator.share) { navigator.share({ title: 'AIPCA Bahati Cathedral', text }).catch(() => {}); }
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
  }, []);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#1a3a5c] text-gray-100">
      {/* Language toggle */}
      <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
        className="fixed top-4 right-4 z-50 flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/60 backdrop-blur-sm transition hover:bg-white/20 hover:text-white/90">
        <Globe size={10} />
        {lang === 'en' ? 'SW' : 'EN'}
      </button>

      {/* Section nav dots */}
      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              activeSection === s.id
                ? 'nav-dot-active scale-150 bg-amber'
                : 'bg-white/30 hover:bg-white/60'
            }`}
            title={s.label}
          />
        ))}
      </div>

      <SlideshowBackground />
      <Ambient3D />
      <div className="relative z-10 pt-4">
        <section id="hero"><ChurchHero /></section>

        <section id="register" data-parallax="0.08"><MemberRegistration /></section>
        <div data-parallax="-0.05"><ContributeSection /></div>
        <section id="pledge-board" data-parallax="0.06"><PledgeBoard /></section>
        <section id="live-progress" data-parallax="-0.04"><LiveProgress /></section>
        <section id="fellowships" data-parallax="0.05"><FellowshipProgress /></section>
        <div data-parallax="-0.03"><GenderCompetition /></div>
        <section data-parallax="0.04"><AboutSection /></section>

        {/* Map section — static OpenStreetMap tile with directions CTA */}
        <section ref={mapRef} className={`relative overflow-hidden px-4 py-16 transition-all duration-700 ${mapInView ? "animate-fade-in" : "opacity-0"}`}>
          {/* Map background as image (no iframe, works on all devices) */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <img
              src="https://staticmap.openstreetmap.de/staticmap.php?center=-1.29098,36.85438&zoom=16&size=1200x600&maptype=mapnik&markers=-1.29098,36.85438,red-pushpin"
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/92 via-[#0a1628]/70 to-[#0a1628]/92" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 backdrop-blur-sm">
              <MapPin size={14} className="text-blue-300" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{t('Find Us', 'Tupate')}</span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{t('Visit AIPCA Bahati Cathedral', 'Tembelea AIPCA Bahati Cathedral')}</h2>
            <p className="mb-2 text-sm text-blue-200/70">
              {t('We welcome you to worship with us.', 'Tunakukaribisha kuabudu pamoja nasi.')}
            </p>
            <p className="mb-6 font-mono text-xs text-blue-300/60">
              1.29098°S 36.85438°E &middot; Jogoo Road, Nairobi
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://maps.google.com/maps?daddr=-1.29098,36.85438"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 active:scale-95"
              >
                <MapPin size={16} />
                {t('Open in Google Maps', 'Fungua kwenye Google Maps')}
              </a>
              <a
                href="https://maps.google.com/maps?q=-1.29098,36.85438+(AIPCA+Bahati+Cathedral)"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
              >
                <Globe size={16} />
                {t('View on Web', 'Tazama kwenye Tovuti')}
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Mobile bottom action bar */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="pointer-events-auto mx-3 mb-3 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0f2847]/90 px-2 py-2 backdrop-blur-xl shadow-lg">
          <button onClick={() => { const el = document.getElementById('hero'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Heart size={18} className="text-amber" />
            <span className="text-[9px] font-bold text-white/70">Give</span>
          </button>
          <button onClick={() => { const el = document.getElementById('pledge-board'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <HandHeart size={18} className="text-green-400" />
            <span className="text-[9px] font-bold text-white/70">Pledge</span>
          </button>
          <button onClick={() => window.open(`tel:${phone.replace(/\s/g, '')}`)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Phone size={18} className="text-blue-400" />
            <span className="text-[9px] font-bold text-white/70">Call</span>
          </button>
          <button onClick={handleShare}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Share2 size={18} className="text-amber" />
            <span className="text-[9px] font-bold text-white/70">Share</span>
          </button>
        </div>
      </div>
    </main>
  );
}
