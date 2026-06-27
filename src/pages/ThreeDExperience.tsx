import { useEffect, useState, useRef } from "react";
import { ArrowDown, Cross } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ThreeDExperience() {
  const navigate = useNavigate();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);
  const [reveal, setReveal] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScroll(window.scrollY / max);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * -2,
      });
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  useEffect(() => {
    if (reveal < 1) {
      const t = setTimeout(() => setReveal(prev => Math.min(1, prev + 0.02)), 30);
      return () => clearTimeout(t);
    }
  }, [reveal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 25000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15 - 0.03,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    let mx = 0, my = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      mx += (mouse.x - mx) * 0.03;
      my += (mouse.y - my) * 0.03;
      const t = Date.now() * 0.001;

      for (const p of particles) {
        p.x += p.vx + mx * 0.3;
        p.y += p.vy + my * 0.2;
        p.phase += 0.015;

        if (p.x < -20) p.x = canvas.width + 20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        const flicker = 0.5 + 0.5 * Math.sin(p.phase + t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 150, 74, ${p.alpha * flicker})`;
        ctx.fill();

        const dx = mouse.x * window.innerWidth / 2 + window.innerWidth / 2 - p.x;
        const dy = -(mouse.y * window.innerHeight / 2) + window.innerHeight / 2 - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x * window.innerWidth / 2 + window.innerWidth / 2, -(mouse.y * window.innerHeight / 2) + window.innerHeight / 2);
          ctx.strokeStyle = `rgba(196, 150, 74, ${0.04 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      raf.current = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a1628] overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(ellipse at ${50 + mouse.x * 15}% ${50 + mouse.y * 15}%, rgba(196,150,74,0.06) 0%, transparent 60%)`,
          transition: "background 1s ease-out",
        }}
      />

      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white/90"
      >
        <Cross size={12} />
        AIPCA Bahati
      </button>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-2xl"
          style={{
            opacity: reveal,
            transform: `translateY(${(1 - reveal) * 50}px)`,
            transition: "opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="relative mx-auto mb-12 w-[65vw] max-w-[400px] aspect-[9/16] overflow-hidden rounded-2xl"
            style={{
              transform: `
                perspective(1200px)
                rotateY(${mouse.x * 12}deg)
                rotateX(${mouse.y * 8}deg)
              `,
              transformStyle: "preserve-3d",
              transition: "transform 0.08s ease-out",
              boxShadow: `
                0 0 40px rgba(196,150,74,0.08),
                0 20px 60px rgba(0,0,0,0.5)
              `,
            }}
          >
            <img
              src="/images/a.jpeg"
              alt="AIPCA Bahati Cathedral"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, rgba(196,150,74,0.12) 0%, transparent 40%, rgba(91,155,213,0.08) 100%)",
              }}
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
          </div>

          <div className="text-center">
            <p
              className="mb-3 text-xs font-semibold tracking-[0.25em] text-amber/60 uppercase"
              style={{
                opacity: Math.max(0, (reveal - 0.3) / 0.7),
                transform: `translateY(${(1 - Math.max(0, (reveal - 0.3) / 0.7)) * 20}px)`,
                transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
              }}
            >
              2026 · Tujenge Pamoja
            </p>

            <h1
              className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
              style={{
                opacity: Math.max(0, (reveal - 0.5) / 0.5),
                transform: `translateY(${(1 - Math.max(0, (reveal - 0.5) / 0.5)) * 30}px)`,
                transition: "opacity 0.8s ease-out 0.2s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s",
              }}
            >
              Building His House,<br />
              <span className="text-amber">Together.</span>
            </h1>

            <p
              className="mx-auto mb-8 max-w-md text-sm text-white/50"
              style={{
                opacity: Math.max(0, (reveal - 0.7) / 0.3),
                transform: `translateY(${(1 - Math.max(0, (reveal - 0.7) / 0.3)) * 20}px)`,
                transition: "opacity 0.8s ease-out 0.4s, transform 0.8s ease-out 0.4s",
              }}
            >
              <span className="italic text-amber/60">&ldquo;Unless the Lord builds the house, its builders labour in vain.&rdquo;</span>
              <br />
              <span className="text-white/20">Psalm 127:1</span>
            </p>

            <div
              style={{
                opacity: Math.max(0, (reveal - 0.85) / 0.15),
                transform: `translateY(${(1 - Math.max(0, (reveal - 0.85) / 0.15)) * 15}px)`,
                transition: "opacity 0.6s ease-out 0.6s, transform 0.6s ease-out 0.6s",
              }}
            >
              <button
                onClick={() => navigate("/")}
                className="group relative overflow-hidden rounded-full bg-white/10 px-8 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:shadow-lg hover:shadow-white/5 active:scale-[0.97]"
              >
                <span className="relative z-10">Enter the Harambee</span>
                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-700 ease-in-out group-hover:translate-x-[100%]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity: reveal > 0.9 ? 0.4 : 0, transition: "opacity 1s ease-out 1s" }}
      >
        <span className="text-[10px] font-medium tracking-widest text-white/20 uppercase">Scroll</span>
        <div className="h-8 w-[1px] bg-gradient-to-b from-white/30 to-transparent animate-scroll-indicator" />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-0"
        style={{
          background: "linear-gradient(to top, #0a1628 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
