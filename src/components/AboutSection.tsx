import { useState, useRef, useCallback, useEffect } from "react";
import { Church, Heart, Target, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useLang } from "../context/LanguageContext";

export default function AboutSection() {
  const { t, lang } = useLang();
  const { ref, inView } = useInView();
  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [dynamicContent, setDynamicContent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.settings?.site_content) {
          try { setDynamicContent(JSON.parse(data.settings.site_content)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const siteCards = dynamicContent?.cards;
  const icons = [Target, Users, Heart];

  const cards = siteCards && siteCards.length === 3
    ? siteCards.map((c: any, i: number) => ({
        icon: icons[i] || Target,
        title: lang === 'sw' ? (c.title_sw || c.title_en) : c.title_en,
        text: lang === 'sw' ? (c.text_sw || c.text_en) : c.text_en,
      }))
    : null;

  const defaultCards = [
    {
      icon: Target,
      title: t("Our Goal", "Lengo Letu"),
      text: t(
        "Raise KES 30,000,000 for the AIPCA Bahati Cathedral sanctuary improvements, fellowship hall expansion, ministry growth, and grounds development.",
        "Kuchangisha KES 30,000,000 kwa ajili ya uboreshaji wa patakatifu pa AIPCA Bahati Cathedral, upanuzi wa ukumbi wa ushirika, ukuzaji wa huduma, na maendeleo ya misingi."
      ),
    },
    {
      icon: Users,
      title: t("Our Community", "Jamii Yetu"),
      text: t(
        "A growing congregation of over 500 families in Bahati, Eastlands Nairobi. Together we are building a house of worship for generations to come.",
        "Mkutano unaokua wa zaidi ya familia 500 huko Bahati, Eastlands Nairobi. Kwa pamoja tunajenga nyumba ya ibada kwa vizazi vijavyo."
      ),
    },
    {
      icon: Heart,
      title: t("Give with Purpose", "Toa kwa Kusudi"),
      text: t(
        "Every contribution goes directly to the Development Fund. Honor a committee member and leave a legacy in this sacred work.",
        "Kila mchango huenda moja kwa moja kwa Mfuko wa Maendeleo. Mheshimu mjumbe wa kamati na uache urithi katika kazi hii takatifu."
      ),
    },
  ];

  const scrollTo = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement;
    if (child) {
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
      setActiveCard(index);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const children = Array.from(el.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childStart = child.offsetLeft - el.offsetLeft;
      const childEnd = childStart + child.offsetWidth;
      if (scrollLeft >= childStart - 50 && scrollLeft < childEnd - 50) {
        setActiveCard(i);
        break;
      }
    }
  }, []);

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
          <p className="mt-3 text-muted">
            {dynamicContent?.about_desc_en
              ? (lang === 'sw' ? (dynamicContent.about_desc_sw || dynamicContent.about_desc_en) : dynamicContent.about_desc_en)
              : t(
                "The construction of this Great House of God started in 2006. Now we unite to complete what was started with faith and determination.",
                "Ujenzi wa Nyumba hii Kuu ya Mungu ulianza mwaka 2006. Sasa tunaungana kukamilisha kilichoanazwa kwa imani na dhamira."
              )
            }
          </p>
        </div>

        <div className="relative">
          {/* Mobile carousel */}
          <div
            ref={(el) => { carouselRef.current = el; ref.current = el; }}
            onScroll={handleScroll}
            className="carousel-snap flex gap-5 overflow-x-auto pb-4 scrollbar-hide md:hidden"
          >
            {(cards || defaultCards).map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`min-w-[80vw] shrink-0 snap-start card-hover group rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-6 shadow-sm transition-all duration-500 ${
                    inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-nobuk-muted transition-colors group-hover:bg-nobuk">
                    <Icon size={20} className="text-nobuk transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-bold text-nobuk">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{card.text}</p>
                </div>
              );
            })}
          </div>

          {/* Desktop grid */}
          <div ref={ref} className="hidden md:grid md:grid-cols-3 gap-6">
            {(cards || defaultCards).map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
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
                </div>
              );
            })}
          </div>

          {/* Dot indicators (mobile only) */}
          <div className="mt-5 flex items-center justify-center gap-2 md:hidden">
            {(cards || defaultCards).map((_, i) => (
              <button key={i} onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeCard ? "w-8 bg-amber" : "w-2 bg-amber/30 hover:bg-amber/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
