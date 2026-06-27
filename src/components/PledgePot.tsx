import { useState, useEffect, useRef } from "react";
import { Droplets } from "lucide-react";

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
    if (!canvas || !(animPct > 0)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 200, H = 130;
    canvas.width = W;
    canvas.height = H;
    const p = 3, bw = W - p * 2, bh = H - p * 2, cr = 8;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phase += 0.035;

      const wt = (p + bh) - bh * (animPct / 100);

      // Glass box outline
      ctx.beginPath();
      ctx.moveTo(p + cr, p);
      ctx.lineTo(p + bw - cr, p);
      ctx.quadraticCurveTo(p + bw, p, p + bw, p + cr);
      ctx.lineTo(p + bw, p + bh - cr);
      ctx.quadraticCurveTo(p + bw, p + bh, p + bw - cr, p + bh);
      ctx.lineTo(p + cr, p + bh);
      ctx.quadraticCurveTo(p, p + bh, p, p + bh - cr);
      ctx.lineTo(p, p + cr);
      ctx.quadraticCurveTo(p, p, p + cr, p);
      ctx.closePath();
      ctx.strokeStyle = "rgba(196, 150, 74, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.clip();

      // Water body
      ctx.beginPath();
      ctx.moveTo(p, p + bh);
      for (let x = p; x <= p + bw; x += 2) {
        const wy = wt
          + Math.sin((x - p) * 0.05 + phase) * 3
          + Math.sin((x - p) * 0.1 + phase * 0.5) * 1.5;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(p + bw, p + bh);
      ctx.closePath();

      const g = ctx.createLinearGradient(0, wt, 0, p + bh);
      g.addColorStop(0, "rgba(196, 150, 74, 0.55)");
      g.addColorStop(0.4, "rgba(196, 150, 74, 0.3)");
      g.addColorStop(1, "rgba(196, 150, 74, 0.08)");
      ctx.fillStyle = g;
      ctx.fill();

      // Wave line
      ctx.beginPath();
      let first = true;
      for (let x = p + 2; x <= p + bw - 2; x += 2) {
        const wy = wt + Math.sin((x - p) * 0.05 + phase) * 3
          + Math.sin((x - p) * 0.1 + phase * 0.5) * 1.5;
        if (first) { ctx.moveTo(x, wy); first = false; }
        else ctx.lineTo(x, wy);
      }
      ctx.strokeStyle = "rgba(196, 150, 74, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [animPct]);

  return (
    <div className={`transition-all duration-1000 ease-out ${loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      <div className="relative mx-auto" style={{ width: 200, height: 130 }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={200} height={130} />
        {/* Total pledges — top */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <Droplets size={9} className="text-amber" />
          <span className="text-[10px] font-bold text-white/90 tabular-nums tracking-tight">
            KES {total.toLocaleString()}
          </span>
        </div>
        {/* Total paid — bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <span className="text-[9px] font-medium text-green-400/80 tabular-nums tracking-tight">
            KES {paid.toLocaleString()}
          </span>
          <span className="h-[1px] w-4 bg-green-400/40" />
          <span className="text-[9px] font-medium text-green-400/60 tabular-nums">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
