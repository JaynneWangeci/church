import { useState, useEffect, useRef } from "react";

export default function PledgePot() {
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(0);
  const [animPct, setAnimPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  function fetchData() {
    fetch("/api/pledges")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.pledges?.length) {
          setTotal(d.pledges.reduce((s: number, p: any) => s + Number(p.amount), 0));
          setPaid(d.pledges.reduce((s: number, p: any) => s + Number(p.paid), 0));
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchData();
    window.addEventListener("pledge:changed", fetchData);
    const iv = setInterval(fetchData, 15000);
    return () => {
      clearInterval(iv);
      window.removeEventListener("pledge:changed", fetchData);
    };
  }, []);

  useEffect(() => {
    setAnimPct(0);
    const duration = 2000;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      setAnimPct(pct * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [pct]);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 180, H = 180;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;
    const innerR = 78;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phase += 0.035;

      const waterBottom = cy + innerR;
      const waterH = innerR * 2;
      const waterTop = waterBottom - waterH * (animPct / 100);

      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, innerR * 0.3, cx, cy, innerR + 20);
      glow.addColorStop(0, "rgba(196, 150, 74, 0.06)");
      glow.addColorStop(1, "rgba(196, 150, 74, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR + 20, 0, Math.PI * 2);
      ctx.fill();

      // Thin ring
      ctx.beginPath();
      ctx.arc(cx, cy, innerR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196, 150, 74, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.clip();

      // Water fill
      if (animPct > 0) {
        ctx.beginPath();
        ctx.moveTo(cx - innerR, waterBottom);
        for (let a = -Math.PI; a <= Math.PI; a += 0.04) {
          const x = cx + Math.cos(a) * innerR;
          const wave = Math.sin(a * 3 + phase) * 3 + Math.sin(a * 5 + phase * 0.6) * 1.5;
          const yBase = waterTop + wave;
          const bulge = (waterBottom - yBase) * (1 - Math.abs(Math.cos(a * 0.5))) * 0.1;
          ctx.lineTo(x, yBase + bulge);
        }
        ctx.lineTo(cx + innerR, waterBottom);
        ctx.lineTo(cx - innerR, waterBottom);
        ctx.closePath();

        const g = ctx.createRadialGradient(cx, waterTop, 0, cx, waterBottom, innerR);
        g.addColorStop(0, "rgba(196, 150, 74, 0.6)");
        g.addColorStop(0.5, "rgba(196, 150, 74, 0.3)");
        g.addColorStop(1, "rgba(196, 150, 74, 0.06)");
        ctx.fillStyle = g;
        ctx.fill();

        // Wave line
        ctx.beginPath();
        let first = true;
        for (let a = -Math.PI * 0.9; a <= Math.PI * 0.9; a += 0.03) {
          const x = cx + Math.cos(a) * innerR * 0.95;
          const wave = Math.sin(a * 3 + phase) * 3 + Math.sin(a * 5 + phase * 0.6) * 1.5;
          const y = waterTop + wave + (waterBottom - waterTop) * (1 - Math.abs(Math.cos(a * 0.5))) * 0.1;
          if (first) { ctx.moveTo(x, y); first = false; }
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(196, 150, 74, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bubbles
        for (let i = 0; i < 4; i++) {
          const ba = Math.random() * Math.PI * 2;
          const br = Math.random() * innerR * 0.7;
          const bx = cx + Math.cos(ba) * br;
          const by = waterBottom - 10 - Math.random() * (waterBottom - waterTop - 15);
          ctx.beginPath();
          ctx.arc(bx, by, 1 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196, 150, 74, ${0.08 + Math.random() * 0.12})`;
          ctx.fill();
        }
      }

      ctx.restore();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [animPct]);

  return (
    <div className={`transition-all duration-1000 ease-out ${loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={180} height={180} />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[8px] font-medium text-white/40 uppercase tracking-widest">Pledged</div>
          <div className="text-xs font-bold text-white/80 tabular-nums">KES {total.toLocaleString()}</div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[8px] font-medium text-green-400/50 uppercase tracking-widest">Paid</div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xs font-bold text-green-400 tabular-nums">KES {paid.toLocaleString()}</span>
            <span className="text-[8px] text-green-400/50">{pct.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
