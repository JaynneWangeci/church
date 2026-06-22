import { useState, useEffect, useCallback } from 'react';
import { Globe, MapPin, Heart, HandHeart, Phone, Share2, Sun, Moon } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useInView } from '../hooks/useInView';
import SlideshowBackground from "../components/SlideshowBackground";
import ChurchHero from "../components/ChurchHero";
import LiveProgress from "../components/LiveProgress";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import PledgeBoard from "../components/PledgeBoard";
import Footer from "../components/Footer";

const SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'contribute', label: 'Honour' },
  { id: 'pledge-board', label: 'Pledge' },
  { id: 'live-progress', label: 'Progress' },
  { id: 'about', label: 'About' },
];

export default function HomePage() {
  const { lang, setLang, t } = useLang();
  const { ref: mapRef, inView: mapInView } = useInView();
  const [lightMode, setLightMode] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

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

  const handleShare = useCallback(() => {
    const text = `🏛️ Support AIPCA Bahati Cathedral Harambee!\n\nGive at https://aipcaharambee.com`;
    if (navigator.share) { navigator.share({ title: 'AIPCA Bahati Cathedral', text }).catch(() => {}); }
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
  }, []);

  return (
    <main className={`relative min-h-screen transition-colors duration-500 ${lightMode ? 'bg-gradient-to-b from-blue-50 via-white to-blue-50 text-gray-800' : 'bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#1a3a5c] text-gray-100'}`}>
      {/* Language toggle */}
      <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
        className="fixed top-4 right-12 z-50 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0f2847]/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md hover:bg-[#1a3a5c] transition-all hover:scale-105">
        <Globe size={14} />
        {lang === 'en' ? 'Kiswahili' : 'English'}
      </button>

      {/* Dark/Light toggle */}
      <button onClick={() => setLightMode(!lightMode)}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0f2847]/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md hover:bg-[#1a3a5c] transition-all hover:scale-105">
        {lightMode ? <Moon size={14} /> : <Sun size={14} />}
        {lightMode ? 'Dark' : 'Light'}
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
      <div className="relative z-10 pt-10">
        <section id="hero"><ChurchHero /></section>
        <ContributeSection />
        <section id="pledge-board"><PledgeBoard /></section>
        <section id="live-progress"><LiveProgress /></section>
        <AboutSection />

        {/* Google Maps pin */}
        <section ref={mapRef} className={`px-4 py-16 transition-all duration-700 ${mapInView ? "animate-fade-in" : "opacity-0"}`}
          style={{ background: lightMode ? 'linear-gradient(180deg, #f0f5ff 0%, #e8f0fe 100%)' : 'linear-gradient(180deg, rgba(15,40,71,0.95) 0%, rgba(10,22,40,0.98) 100%)' }}>
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 backdrop-blur-sm">
              <MapPin size={14} className="text-blue-300" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{t('Find Us', 'Tupate')}</span>
            </div>
            <h2 className={`mb-2 text-2xl font-bold ${lightMode ? 'text-gray-800' : 'text-white'}`}>{t('Visit AIPCA Bahati Cathedral', 'Tembelea AIPCA Bahati Cathedral')}</h2>
            <p className={`mb-6 text-sm ${lightMode ? 'text-gray-500' : 'text-blue-200/70'}`}>
              {t('We welcome you to worship with us. Use the map below for directions.', 'Tunakukaribisha kuabudu pamoja nasi. Tumia ramani hapa chini kwa maelekezo.')}
            </p>
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-blue-400/20 shadow-lg shadow-blue-900/30">
              <iframe
                src="https://www.google.com/maps?q=-1.29098,36.85438+(AIPCA+Bahati+Cathedral)&z=18&output=embed"
                width="100%" height="400" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                title="AIPCA Bahati Cathedral Location"
              />
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Mobile bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0f2847]/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
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
          <button onClick={() => window.open('tel:+254700000000')}
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
