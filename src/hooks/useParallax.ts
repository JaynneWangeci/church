import { useEffect } from "react";

export default function useParallax() {
  useEffect(() => {
    const els: { el: HTMLElement; speed: number }[] = [];
    document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      els.push({ el, speed: parseFloat(el.dataset.parallax || "0.3") });
    });

    let rafId = 0;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const sy = window.scrollY;
        const vh = window.innerHeight;
        for (const { el, speed } of els) {
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const viewCenter = vh / 2;
          const dist = (center - viewCenter) / vh;
          const offset = dist * speed * 60;
          el.style.transform = `translateY(${offset}px)`;
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);
}
