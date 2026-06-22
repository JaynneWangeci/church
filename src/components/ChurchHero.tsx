import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import DonationModal from './DonationModal';

const TITLE = 'Building His House, Together.';
const SW_TITLE = 'Kujenga Nyumba Yake, Pamoja.';

export default function ChurchHero() {
  const { lang, t } = useLang();
  const [showGive, setShowGive] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
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
      const timer = setTimeout(() => setRevealedChars(prev => prev + 1), 40);
      return () => clearTimeout(timer);
    }
  }, [revealedChars, heading.length]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

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

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
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

  return (
    <section
      onMouseMove={onMouseMove}
      className="relative z-10 flex min-h-screen flex-col"
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Liquid-glass navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'top-3 mx-4 max-w-6xl xl:mx-auto rounded-2xl bg-[#1B2838]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20'
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
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5B9BD5]/40 to-[#5B9BD5]/10 animate-pulse" />
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
                <Heart size={14} className="text-[#5B9BD5] group-hover:scale-110 transition-transform duration-300" />
                {t('Give Now', 'Toa Sasa')}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20 pt-28">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm"
          style={{
            opacity: revealedChars > 0 ? 1 : 0,
            transform: revealedChars > 0 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5B9BD5] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5B9BD5]" />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-[#5B9BD5] uppercase">
            2026 · {t('Tujenge Pamoja', 'Tujenge Pamoja')}
          </span>
        </div>

        <h1
          className="text-center text-[2.5rem] leading-[1] font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
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
                color: char === '.' || char === ',' ? '#5B9BD5' : undefined,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        <p
          className="mt-6 max-w-lg text-center text-sm text-white/50 sm:text-base"
          style={{
            opacity: revealedChars >= heading.length ? 1 : 0,
            transform: revealedChars >= heading.length ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.8s ease-out 0.2s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
          }}
        >
          <span className="italic text-[#5B9BD5]/70">&ldquo;{t('Unless the Lord builds the house, its builders labour in vain.', 'Bwana asipoijenga nyumba, wajengi hufanya kazi bure.')}&rdquo;</span>
          <br />
          <span className="text-white/30">Psalm 127:1</span>
        </p>

        <div
          style={{
            opacity: revealedChars >= heading.length ? 1 : 0,
            transform: revealedChars >= heading.length ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.8s ease-out 0.4s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
          }}
          className="mt-8 flex items-center gap-4"
        >
          <button
            onClick={() => setShowGive(true)}
            className="group relative overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1B2838] transition-all duration-300 hover:shadow-xl hover:shadow-white/20 active:scale-[0.97]"
          >
            <span className="relative z-10">{t('Give to the Harambee', 'Toa kwa Harambee')}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-white via-[#E8F0FE] to-white translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        style={{
          opacity: revealedChars >= heading.length ? 0.4 : 0,
          transition: 'opacity 1s ease-out 0.8s',
        }}
      >
        <span className="text-[10px] font-medium tracking-widest text-white/30 uppercase">{t('Scroll', 'Tembeza')}</span>
        <div className="h-8 w-[1px] bg-gradient-to-b from-white/40 to-transparent animate-scroll-indicator" />
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
