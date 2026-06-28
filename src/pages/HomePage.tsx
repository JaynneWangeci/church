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
    <main className="relative min-h-screen text-white">
      <div className="page-bg" />
      <div className="page-content">
      {/* Language toggle */}
      <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
        className="fixed top-4 right-4 z-50 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/25 hover:text-white shadow-lg shadow-sky-900/10">
        <Globe size={10} />
        {lang === 'en' ? 'SW' : 'EN'}
      </button>

      {/* Section nav dots */}
      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              activeSection === s.id
                ? 'scale-150 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                : 'bg-white/40 hover:bg-white/70'
            }`}
            title={s.label}
          />
        ))}
      </div>

      <SlideshowBackground />
      <Ambient3D />
      <div className="relative z-10 pt-4">
        <section id="hero"><ChurchHero /></section>

        <section id="pledge-board" className="scroll-mt-20"><PledgeBoard /></section>

        <section id="register" data-parallax="0.08"><MemberRegistration /></section>
        <div data-parallax="-0.05"><ContributeSection /></div>
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
            <div className="absolute inset-0 bg-gradient-to-b from-sky-900/85 via-sky-800/70 to-sky-900/85" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
              <MapPin size={14} className="text-white/80" />
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Find Us', 'Tupate')}</span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{t('Visit AIPCA Bahati Cathedral', 'Tembelea AIPCA Bahati Cathedral')}</h2>
            <p className="mb-2 text-sm text-white/70">
              {t('We welcome you to worship with us.', 'Tunakukaribisha kuabudu pamoja nasi.')}
            </p>
            <p className="mb-6 font-mono text-xs text-white/50">
              1.29098°S 36.85438°E &middot; Jogoo Road, Nairobi
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://maps.google.com/maps?daddr=-1.29098,36.85438"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-900/30 transition-all hover:bg-amber-dark active:scale-95"
              >
                <MapPin size={16} />
                {t('Open in Google Maps', 'Fungua kwenye Google Maps')}
              </a>
              <a
                href="https://maps.google.com/maps?q=-1.29098,36.85438+(AIPCA+Bahati+Cathedral)"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
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
        <div className="pointer-events-auto mx-3 mb-3 flex items-center justify-around rounded-2xl border border-white/20 bg-white/15 px-2 py-2 backdrop-blur-xl shadow-lg shadow-sky-900/20">
          <button onClick={() => { const el = document.getElementById('hero'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Heart size={18} className="text-amber" />
            <span className="text-[9px] font-bold text-white/80">Give</span>
          </button>
          <button onClick={() => { const el = document.getElementById('pledge-board'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <HandHeart size={18} className="text-amber" />
            <span className="text-[9px] font-bold text-white/80">Pledge</span>
          </button>
          <button onClick={() => window.open(`tel:${phone.replace(/\s/g, '')}`)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Phone size={18} className="text-white/80" />
            <span className="text-[9px] font-bold text-white/80">Call</span>
          </button>
          <button onClick={handleShare}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:scale-90">
            <Share2 size={18} className="text-amber" />
            <span className="text-[9px] font-bold text-white/80">Share</span>
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}
