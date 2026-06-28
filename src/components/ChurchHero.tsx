import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Heart } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import DonationModal from './DonationModal';
import HarambeeCountdown from './HarambeeCountdown';
import PledgePot from './PledgePot';

const TITLE = 'Building His House, Together.';
const SW_TITLE = 'Kujenga Nyumba Yake, Pamoja.';

export default function ChurchHero() {
  const { lang, t } = useLang();
  const [showGive, setShowGive] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const heading = lang === 'en' ? TITLE : SW_TITLE;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (revealedChars < heading.length) {
      const timer = setTimeout(() => setRevealedChars(prev => prev + 1), 30);
      return () => clearTimeout(timer);
    }
  }, [revealedChars, heading.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; pulse: number;
    }[] = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    const handleMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', handleMouse);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.001;

      for (const p of particles) {
        p.x += p.vx + (mouseX - canvas.width / 2) * 0.0001;
        p.y += p.vy + (mouseY - canvas.height / 2) * 0.0001;
        p.pulse += 0.02;

        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(91,155,213,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const headingRevealed = revealedChars >= heading.length;

  return (
    <section className="relative z-10 flex min-h-screen flex-col">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

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

      {/* Compact hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-10">
        {/* Countdown */}
        <div
          className="mb-3 w-full max-w-xs rounded-xl border border-blue-400/15 bg-white/[0.03] p-3 text-center backdrop-blur-sm"
          style={{
            opacity: revealedChars > 0 ? 1 : 0,
            transform: revealedChars > 0 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="mb-1.5 flex items-center justify-center gap-1.5">
            <Clock size={10} className="text-amber" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber">Harambee Countdown</span>
          </div>
          <HarambeeCountdown />
        </div>

        {/* Pledge Box — pure fluid animation, no numbers */}
        <div
          className="mb-3"
          style={{
            opacity: revealedChars > 0 ? 1 : 0,
            transition: 'opacity 0.6s ease-out 0.1s',
          }}
        >
          <PledgePot />
        </div>

        {/* Badge */}
        <div
          className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 backdrop-blur-sm"
          style={{
            opacity: revealedChars > 0 ? 1 : 0,
            transform: revealedChars > 0 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out 0.15s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
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
          className="text-center text-[1.6rem] leading-[1] font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
          style={{
            fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Helvetica Neue", Arial, sans-serif',
            letterSpacing: '-0.04em',
          }}
        >
          {heading.split('').map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                opacity: i < revealedChars ? 1 : 0,
                transform: i < revealedChars ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
                transition: `opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.02}s`,
                color: char === '.' || char === ',' ? '#38BDF8' : undefined,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        {/* Verse */}
        <p
          className="mt-2 max-w-xs text-center text-xs text-white/50 leading-relaxed"
          style={{
            opacity: headingRevealed ? 1 : 0,
            transform: headingRevealed ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out 0.2s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
          }}
        >
          <span className="italic text-[#38BDF8]/70">&ldquo;{t('Unless the Lord builds the house, its builders labour in vain.', 'Bwana asipoijenga nyumba, wajengi hufanya kazi bure.')}&rdquo;</span>
          <br />
          <span className="text-white/20">Psalm 127:1</span>
        </p>

        {/* CTA */}
        <div
          className="mt-3 flex items-center gap-4"
          style={{
            opacity: headingRevealed ? 1 : 0,
            transform: headingRevealed ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out 0.3s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
          }}
        >
          <button
            onClick={() => setShowGive(true)}
            className="group relative overflow-hidden rounded-full bg-white px-5 py-2.5 text-xs font-bold text-sky-900 transition-all duration-300 hover:shadow-xl hover:shadow-white/20 active:scale-[0.97]"
          >
            <span className="relative z-10">{t('Give to the Harambee', 'Toa kwa Harambee')}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-white via-[#E8F0FE] to-white translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5"
        style={{
          opacity: headingRevealed ? 0.4 : 0,
          transition: 'opacity 0.8s ease-out 0.6s',
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
