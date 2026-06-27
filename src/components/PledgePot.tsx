import { useState, useEffect, useRef } from "react";

export default function PledgePot() {
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(0);
  const [animPct, setAnimPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  useEffect(() => {
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
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
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

    const W = 160, H = 160;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2, R = 72;
    const innerR = 68;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phase += 0.03;

      const waterH = innerR * 2;
      const waterBottom = cy + innerR;
      const waterTop = waterBottom - waterH * (animPct / 100);

      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, innerR * 0.5, cx, cy, innerR + 12);
      glow.addColorStop(0, "rgba(196, 150, 74, 0.08)");
      glow.addColorStop(1, "rgba(196, 150, 74, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR + 12, 0, Math.PI * 2);
      ctx.fill();

      // Subtle ring
      ctx.beginPath();
      ctx.arc(cx, cy, innerR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196, 150, 74, 0.12)";
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
        for (let a = -Math.PI; a <= Math.PI; a += 0.05) {
          const x = cx + Math.cos(a) * innerR;
          const waveOffset = Math.sin(a * 3 + phase) * 2 + Math.sin(a * 6 + phase * 0.7) * 1;
          const yBase = waterTop + waveOffset;
          const y = yBase + (waterBottom - yBase) * (1 - Math.abs(Math.cos(a))) * 0.15;
          ctx.lineTo(x, y);
        }
        for (let a = Math.PI; a >= -Math.PI; a -= 0.05) {
          const x = cx + Math.cos(a) * innerR;
          ctx.lineTo(x, waterBottom);
        }
        ctx.closePath();

        const g = ctx.createRadialGradient(cx, waterTop, 0, cx, waterBottom, innerR);
        g.addColorStop(0, "rgba(196, 150, 74, 0.6)");
        g.addColorStop(0.5, "rgba(196, 150, 74, 0.35)");
        g.addColorStop(1, "rgba(196, 150, 74, 0.08)");
        ctx.fillStyle = g;
        ctx.fill();

        // Wave surface line
        ctx.beginPath();
        for (let a = -Math.PI * 0.85; a <= Math.PI * 0.85; a += 0.03) {
          const x = cx + Math.cos(a) * innerR * 0.95;
          const waveOffset = Math.sin(a * 3 + phase) * 2.5 + Math.sin(a * 6 + phase * 0.7) * 1.2;
          const y = waterTop + waveOffset + (waterBottom - waterTop) * (1 - Math.abs(Math.cos(a))) * 0.15;
          if (a === -Math.PI * 0.85) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(196, 150, 74, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Subtle inner ring (always visible)
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196, 150, 74, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // Corner glints
      const glint = ctx.createRadialGradient(cx - innerR * 0.5, cy - innerR * 0.5, 0, cx - innerR * 0.5, cy - innerR * 0.5, 40);
      glint.addColorStop(0, "rgba(255,255,255,0.04)");
      glint.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.arc(cx - innerR * 0.5, cy - innerR * 0.5, 40, 0, Math.PI * 2);
      ctx.fill();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [animPct]);

  return (
    <div className={`transition-all duration-1000 ease-out ${loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      <div className="relative mx-auto" style={{ width: 160, height: 160 }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={160} height={160} />
        {/* Total — top */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[9px] font-medium text-white/40 uppercase tracking-wider">Pledged</div>
          <div className="text-sm font-bold text-white/90 tabular-nums">KES {total.toLocaleString()}</div>
        </div>
        {/* Paid — bottom */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[9px] font-medium text-green-400/50 uppercase tracking-wider">Paid</div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-sm font-bold text-green-400 tabular-nums">KES {paid.toLocaleString()}</span>
            <span className="text-[9px] text-green-400/60">{pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
