import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Church, Heart, Target, Users } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useLang } from "../context/LanguageContext";

function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }, []);
  const handleLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg)';
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      className={className} style={{ ...style, transformStyle: 'preserve-3d', transition: 'transform 0.15s ease-out' }}>
      {children}
    </div>
  );
}

export default function AboutSection() {
  const { t } = useLang();
  const { ref: gridRef, inView } = useInView();
  const [activeCard, setActiveCard] = useState(0);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cards = useMemo(() => [
    {
      icon: Target,
      title: t("Our Goal", "Lengo Letu"),
      text: t(
        "Raise KES 30,000,000 for the AIPCA Bahati Cathedral sanctuary improvements, fellowship hall expansion, ministry growth, and grounds development.",
        "Kukusanya KES 30,000,000 kwa ajili ya kuboresha patakatifu pa AIPCA Bahati Cathedral, kupanua ukumbi wa ushirika, kukuza huduma, na kuendeleza eneo la kanisa."
      ),
    },
    {
      icon: Users,
      title: t("Our Community", "Jamii Yetu"),
      text: t(
        "A growing congregation of over 500 families in Bahati, Eastlands Nairobi. Together we are building a house of worship for generations to come.",
        "Jumuiya inayokua ya zaidi ya familia 500 huko Bahati, Eastlands Nairobi. Kwa pamoja tunajenga nyumba ya ibada kwa vizazi vijavyo."
      ),
    },
    {
      icon: Heart,
      title: t("Give with Purpose", "Toa kwa Kusudi"),
      text: t(
        "Every contribution goes directly to the Development Fund. Honor a committee member and leave a legacy in this sacred work.",
        "Kila mchango huenda moja kwa moja kwenye Mfuko wa Maendeleo. Mheshimu mjumbe wa kamati na uache urithi katika kazi hii takatifu."
      ),
    },
  ], [t]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setActiveCard(prev => (prev + 1) % cards.length);
        setExiting(false);
      }, 700);
    }, 15000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeCard, cards.length]);

  const goToCard = useCallback((index: number) => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setActiveCard(index);
      setExiting(false);
    }, 700);
  }, [exiting]);

  return (
    <section id="about" className="scroll-mt-16 bg-white/10 backdrop-blur-sm px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-xs font-bold text-amber-dark uppercase tracking-widest">
            <Church size={12} />
            {t("About", "Kuhusu")}
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Tujenge Pamoja
          </h2>
          <div className="mt-4 space-y-3 text-left text-sm leading-relaxed text-muted md:text-center md:text-base">
            <p>
              {t(
                "The construction of this Great House of God started in 2006. Now we unite to complete what was started with faith and determination.",
                "Ujenzi wa Nyumba hii Kuu ya Mungu ulianza mwaka 2006. Sasa tunaungana kukamilisha kilichoanza kwa imani na dhamira."
              )}
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Mobile carousel — auto-advance every 60s */}
          <div className="md:hidden">
            <div className="relative mx-auto max-w-sm" style={{ minHeight: 240 }}>
              {cards.map((card, i) => {
                const Icon = card.icon;
                const isActive = i === activeCard;
                return (
                  <div key={card.title}
                    className={`rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-5 shadow-sm w-full transition-all duration-700 ${
                      isActive
                        ? exiting
                          ? 'opacity-0 scale-75 -rotate-6 translate-y-8'
                          : 'opacity-100 scale-100 rotate-0 translate-y-0'
                        : 'opacity-0 scale-50 pointer-events-none absolute inset-0'
                    }`}
                    style={{ transitionTimingFunction: isActive && exiting ? 'cubic-bezier(.6,.04,.98,.34)' : 'cubic-bezier(.34,1.56,.64,1)' }}
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-500 ${
                        isActive ? 'bg-nobuk scale-110' : 'bg-nobuk-muted'
                      }`}>
                      <Icon size={18} className={`transition-colors duration-500 ${isActive ? 'text-white' : 'text-nobuk'}`} />
                    </div>
                    <h3 className="text-sm font-bold text-nobuk">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{card.text}</p>
                  </div>
                );
              })}
            </div>
            {/* Dot indicators (mobile only) */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {cards.map((_, i) => (
                <button key={i} onClick={() => goToCard(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeCard ? "w-8 bg-amber" : "w-2 bg-amber/30 hover:bg-amber/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Desktop grid */}
          <div ref={gridRef} className="hidden md:grid md:grid-cols-3 gap-6">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <TiltCard key={card.title}
                  className={`card-hover group rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-8 shadow-sm ${
                    inView ? "animate-slide-up" : "opacity-0"
                  }`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-nobuk-muted transition-colors group-hover:bg-nobuk">
                    <Icon size={22} className="text-nobuk transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-nobuk">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{card.text}</p>
                </TiltCard>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
