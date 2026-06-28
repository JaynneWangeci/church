import { useEffect, useState, useRef } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; phase: number;
}

export default function Ambient3D() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScroll(window.scrollY / max);
    };
    onScroll();
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(30, Math.floor((canvas.width * canvas.height) / 40000));
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2 - 0.05,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.15 + 0.05,
      phase: Math.random() * Math.PI * 2,
    }));

    let mx = 0, my = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      mx += (mouse.x - mx) * 0.05;
      my += (mouse.y - my) * 0.05;
      const t = Date.now() * 0.001;

      for (const p of particles.current) {
        p.x += p.vx + mx * 0.15;
        p.y += p.vy + my * 0.1;
        p.phase += 0.01;

        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        const flicker = 0.6 + 0.4 * Math.sin(p.phase + t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 150, 74, ${p.alpha * flicker})`;
        ctx.fill();
      }
      raf.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div
        className="absolute w-[80vmax] h-[80vmax] rounded-full transition-all duration-[800ms] ease-out"
        style={{
          background: "radial-gradient(circle, rgba(196,150,74,0.04) 0%, rgba(91,155,213,0.03) 30%, transparent 70%)",
          left: `${50 + mouse.x * 20}%`,
          top: `${50 + mouse.y * 20}%`,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        className="absolute w-[40vmax] h-[40vmax] rounded-full transition-all duration-[1200ms] ease-out"
        style={{
          background: "radial-gradient(circle, rgba(91,155,213,0.04) 0%, transparent 60%)",
          left: `${50 - mouse.x * 15}%`,
          top: `${50 - mouse.y * 15}%`,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        className="absolute right-[-8%] bottom-[-5%] w-[42vw] max-w-[480px] aspect-[9/16] opacity-[0.05] transition-opacity duration-700"
        style={{
          transform: `
            perspective(1000px)
            rotateY(${mouse.x * 10}deg)
            rotateX(${mouse.y * 6}deg)
            translateY(${scroll * 20}vh)
          `,
          transformStyle: "preserve-3d",
          transition: "transform 0.12s ease-out",
        }}
      >
        <div className="relative w-full h-full overflow-hidden">
          <img
            src="/images/a.jpeg"
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(0.4) brightness(0.8) contrast(1.1)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-950 via-transparent to-transparent" />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(196,150,74,0.15) 0%, transparent 50%, rgba(91,155,213,0.1) 100%)",
            }}
          />
        </div>
      </div>

      <div
        className="absolute bottom-[15%] left-[8%] w-2 h-2 rounded-full border border-amber/20"
        style={{
          transform: `translate(-50%, -50%) scale(${1 + mouse.y * 0.15})`,
          transition: "transform 0.4s ease-out",
          opacity: 0.3 + Math.sin(Date.now() * 0.001) * 0.1,
        }}
      />
      <div
        className="absolute top-[30%] left-[12%] w-1.5 h-1.5 rounded-full border border-blue-400/15"
        style={{
          transform: `translate(-50%, -50%) scale(${1 - mouse.x * 0.1})`,
          transition: "transform 0.5s ease-out",
          opacity: 0.2 + Math.cos(Date.now() * 0.0015) * 0.08,
        }}
      />
    </div>
  );
}
