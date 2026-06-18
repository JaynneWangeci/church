import { useEffect, useState } from "react";
import { ChevronDown, MapPin, Heart } from "lucide-react";

const churchHero = "/images/church-opening.jpg";

export default function Hero() {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = churchHero;
    img.onload = () => setImgLoaded(true);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className={`absolute inset-0 bg-nobuk transition-opacity duration-1000 ${imgLoaded ? "opacity-0" : "opacity-100"}`} />

      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundImage: `url(${churchHero})` }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-nobuk/85 via-nobuk/60 to-nobuk/90" />

      <div className="absolute top-20 left-10 h-64 w-64 animate-float rounded-full bg-amber/15 blur-3xl" />
      <div className="absolute bottom-20 right-10 h-80 w-80 animate-float rounded-full bg-white/8 blur-3xl" style={{ animationDelay: "-3s" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 text-center">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-nobuk/60 px-4 py-1.5 text-xs font-semibold tracking-widest text-amber uppercase backdrop-blur-sm">
            <Heart size={12} className="animate-pulse-soft" />
            2026 Harambee · Tujenge Pamoja
          </span>
        </div>

        <h1 className="mt-8 animate-slide-up font-heading text-5xl font-bold leading-tight text-white md:text-7xl lg:text-8xl" style={{ animationDelay: "0.05s" }}>
          AIPCA
          <span className="block text-amber">Bahati Cathedral</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-slide-up text-base leading-relaxed text-white/70 md:text-lg" style={{ animationDelay: "0.1s" }}>
          <span className="font-heading text-xl italic text-amber/80 md:text-2xl">&ldquo;Unless the Lord builds the house, its builders labour in vain.&rdquo;</span>
          <br />
          <span className="text-white/60">Psalm 127:1</span>
        </p>

        <p className="mx-auto mt-4 max-w-lg animate-slide-up text-sm text-white/50 md:text-base" style={{ animationDelay: "0.12s" }}>
          Join us in completing this Great House of God — sanctuary, fellowship hall, and ministry grounds.
        </p>

        <div className="mt-10 flex animate-slide-up flex-col gap-4 sm:flex-row" style={{ animationDelay: "0.2s" }}>
          <a
            href="#give"
            className="btn-lift inline-flex items-center justify-center gap-2.5 rounded-full bg-amber px-10 py-4 text-base font-bold text-nobuk shadow-lg shadow-amber/20 hover:bg-amber-dark"
          >
            <Heart size={18} />
            Give to the Harambee
          </a>
          <a
            href="#location"
            className="btn-lift inline-flex items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20"
          >
            <MapPin size={18} />
            Visit Us
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <a href="#about" aria-label="Scroll down">
          <ChevronDown size={24} className="text-white/40" />
        </a>
      </div>
    </section>
  );
}
