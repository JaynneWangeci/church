import { useState, useEffect, useRef } from "react";
import { Droplets, Target, Heart } from "lucide-react";

export default function PledgePot() {
  const [pledgeTotal, setPledgeTotal] = useState(0);
  const [pledgePaid, setPledgePaid] = useState(0);
  const [count, setCount] = useState(0);
  const [animPct, setAnimPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  const pct = pledgeTotal > 0 ? Math.min((pledgePaid / pledgeTotal) * 100, 100) : 0;

  useEffect(() => {
    function fetchData() {
      fetch("/api/pledges")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.pledges?.length) {
            setPledgeTotal(d.pledges.reduce((s: number, p: any) => s + Number(p.amount), 0));
            setPledgePaid(d.pledges.reduce((s: number, p: any) => s + Number(p.paid), 0));
            setCount(d.pledges.length);
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
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimPct(pct * eased);
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

    const W = 280, H = 320;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2;
    const r = W / 2 - 6;
    const bowlTop = 38;
    const bowlBottom = H - 22;
    const bowlH = bowlBottom - bowlTop;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phase += 0.025;

      const waterFillTop = animPct > 0
        ? bowlBottom - bowlH * (animPct / 100)
        : bowlBottom;

      // Bowl outline
      ctx.beginPath();
      ctx.moveTo(cx - r, bowlTop);
      ctx.quadraticCurveTo(cx - r - 6, bowlTop + bowlH * 0.3, cx - r - 4, bowlTop + bowlH * 0.5);
      ctx.quadraticCurveTo(cx - r - 6, bowlTop + bowlH * 0.7, cx - r, bowlBottom);
      ctx.quadraticCurveTo(cx - r * 0.5, bowlBottom + 12, cx, bowlBottom + 12);
      ctx.quadraticCurveTo(cx + r * 0.5, bowlBottom + 12, cx + r, bowlBottom);
      ctx.quadraticCurveTo(cx + r + 6, bowlTop + bowlH * 0.7, cx + r + 4, bowlTop + bowlH * 0.5);
      ctx.quadraticCurveTo(cx + r + 6, bowlTop + bowlH * 0.3, cx + r, bowlTop);
      ctx.closePath();
      ctx.strokeStyle = "rgba(196, 150, 74, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle inner glow
      const ig = ctx.createRadialGradient(cx, bowlBottom, 0, cx, bowlBottom, r);
      ig.addColorStop(0, "rgba(196, 150, 74, 0.03)");
      ig.addColorStop(1, "rgba(196, 150, 74, 0)");
      ctx.fillStyle = ig;
      ctx.fill();

      if (animPct > 0) {
        ctx.save();

        // Clip to bowl shape
        ctx.beginPath();
        ctx.moveTo(cx - r + 2, bowlTop);
        ctx.quadraticCurveTo(cx - r - 4, bowlTop + bowlH * 0.3, cx - r - 2, bowlTop + bowlH * 0.5);
        ctx.quadraticCurveTo(cx - r - 4, bowlTop + bowlH * 0.7, cx - r + 2, bowlBottom - 2);
        ctx.quadraticCurveTo(cx - r * 0.5, bowlBottom + 10, cx, bowlBottom + 10);
        ctx.quadraticCurveTo(cx + r * 0.5, bowlBottom + 10, cx + r - 2, bowlBottom - 2);
        ctx.quadraticCurveTo(cx + r + 4, bowlTop + bowlH * 0.7, cx + r + 2, bowlTop + bowlH * 0.5);
        ctx.quadraticCurveTo(cx + r + 4, bowlTop + bowlH * 0.3, cx + r - 2, bowlTop);
        ctx.closePath();
        ctx.clip();

        // Water gradient
        const wg = ctx.createLinearGradient(0, waterFillTop, 0, bowlBottom);
        wg.addColorStop(0, "rgba(196, 150, 74, 0.45)");
        wg.addColorStop(0.3, "rgba(196, 150, 74, 0.3)");
        wg.addColorStop(0.6, "rgba(196, 150, 74, 0.18)");
        wg.addColorStop(1, "rgba(196, 150, 74, 0.06)");

        // Water body
        ctx.beginPath();
        ctx.moveTo(cx - r + 2, bowlBottom - 2);
        for (let x = cx - r + 2; x <= cx + r - 2; x += 2) {
          const wY = waterFillTop
            + Math.sin((x - (cx - r)) * 0.035 + phase) * 4
            + Math.sin((x - (cx - r)) * 0.07 + phase * 0.6) * 2;
          ctx.lineTo(x, wY);
        }
        ctx.lineTo(cx + r - 2, bowlBottom - 2);
        ctx.closePath();
        ctx.fillStyle = wg;
        ctx.fill();

        // Surface wave line
        ctx.beginPath();
        let first = true;
        for (let x = cx - r + 4; x <= cx + r - 4; x += 2) {
          const wY = waterFillTop
            + Math.sin((x - (cx - r)) * 0.035 + phase) * 4
            + Math.sin((x - (cx - r)) * 0.07 + phase * 0.6) * 2;
          if (first) { ctx.moveTo(x, wY); first = false; }
          else ctx.lineTo(x, wY);
        }
        ctx.strokeStyle = "rgba(196, 150, 74, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // Rising particles
        for (let i = 0; i < 2; i++) {
          const px = cx - r * 0.5 + Math.random() * r;
          const py = bowlBottom - 10 - Math.random() * (bowlBottom - waterFillTop - 10);
          ctx.beginPath();
          ctx.arc(px, py, 1 + Math.random() * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196, 150, 74, ${0.12 + Math.random() * 0.12})`;
          ctx.fill();
        }
      }

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(raf.current);
  }, [animPct]);

  return (
    <section className="relative overflow-hidden px-4 py-8 md:py-12">
      <div
        className={`mx-auto max-w-sm transition-all duration-1000 ease-out ${
          loaded ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
        }`}
      >
        <div className="mb-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber">
            <Droplets size={10} />
            Pledge Pot
          </span>
        </div>

        <div className="relative flex flex-col items-center">
          <div className="mb-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
              Total Pledges
            </p>
            <p className="text-xl font-bold text-white tabular-nums">
              KES {pledgeTotal.toLocaleString()}
            </p>
          </div>

          <div className="relative" style={{ width: 280, height: 320 }}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              width={280}
              height={320}
            />

            {animPct > 0 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/10 backdrop-blur-sm transition-all duration-500 z-10"
                style={{
                  bottom: `${Math.max(6, (animPct / 100) * 72 + 4)}%`,
                }}
              >
                <Heart size={8} className="text-green-400" />
                <span className="text-[9px] font-bold text-green-400 tabular-nums whitespace-nowrap">
                  KES {pledgePaid.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-1 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
              Fulfilled
            </p>
            <p className="text-base font-semibold text-green-400 tabular-nums">
              {pct.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <Target size={10} /> {count} pledges
          </span>
          <span>·</span>
          <span>Live</span>
        </div>
      </div>
    </section>
  );
}
