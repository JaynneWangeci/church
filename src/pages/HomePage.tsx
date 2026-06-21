import { Globe, MapPin } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useInView } from '../hooks/useInView';
import SlideshowBackground from "../components/SlideshowBackground";
import ChurchHero from "../components/ChurchHero";
import LiveProgress from "../components/LiveProgress";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import PledgeBoard from "../components/PledgeBoard";
import Footer from "../components/Footer";

export default function HomePage() {
  const { lang, setLang, t } = useLang();
  const { ref: mapRef, inView: mapInView } = useInView();

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#1a3a5c] text-gray-100">
      {/* Language toggle - top right */}
      <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0f2847]/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md hover:bg-[#1a3a5c] transition-all hover:scale-105">
        <Globe size={14} />
        {lang === 'en' ? 'Kiswahili' : 'English'}
      </button>

      <SlideshowBackground />
      <div className="relative z-10 pt-10">
        <ChurchHero />
        <ContributeSection />
        <PledgeBoard />
        <LiveProgress />
        <AboutSection />

        {/* Google Maps pin */}
        <section ref={mapRef} className={`px-4 py-16 transition-all duration-700 ${mapInView ? "animate-fade-in" : "opacity-0"}`}
          style={{ background: 'linear-gradient(180deg, rgba(15,40,71,0.95) 0%, rgba(10,22,40,0.98) 100%)' }}>
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 backdrop-blur-sm">
              <MapPin size={14} className="text-blue-300" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{t('Find Us', 'Tupate')}</span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{t('Visit AIPCA Bahati Cathedral', 'Tembelea AIPCA Bahati Cathedral')}</h2>
            <p className="mb-6 text-sm text-blue-200/70">
              {t('We welcome you to worship with us. Use the map below for directions.', 'Tunakukaribisha kuabudu pamoja nasi. Tumia ramani hapa chini kwa maelekezo.')}
            </p>
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-blue-400/20 shadow-lg shadow-blue-900/30">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.654!2d36.815!3d-1.283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTYnNTguOCJTIDM2wrA0OCc1NC4wIkU!5e0!3m2!1sen!2ske!4v1"
                width="100%" height="400" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                title="AIPCA Bahati Cathedral Location"
              />
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
