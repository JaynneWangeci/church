import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Zap, ExternalLink, Heart, Clock, Share2 } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export default function LiveProgress() {
  const [raised, setRaised] = useState(0);
  const [goal, setGoal] = useState(30000000);
  const [displayRaised, setDisplayRaised] = useState(0);
  const [harambeeDays, setHarambeeDays] = useState(0);
  const [width, setWidth] = useState(0);
  const [pledgeTotal, setPledgeTotal] = useState(0);
  const [pledgePaid, setPledgePaid] = useState(0);
  const [pledgeCount, setPledgeCount] = useState(0);
  const [pledgeWidth, setPledgeWidth] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView();
  const prevPct = useRef(0);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [siteContent, setSiteContent] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const pct = Math.min((raised / goal) * 100, 100);
  const pledgePct = pledgeTotal > 0 ? Math.min((pledgePaid / pledgeTotal) * 100, 100) : 0;

  function fetchPledges() {
    fetch('/api/pledges')
      .then(r => r.ok && r.json())
      .then(data => {
        if (data?.pledges?.length) {
          const total = data.pledges.reduce((s: number, p: any) => s + Number(p.amount), 0);
          const paid = data.pledges.reduce((s: number, p: any) => s + Number(p.paid), 0);
          setPledgeTotal(total);
          setPledgePaid(paid);
          setPledgeCount(data.pledges.length);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetch('/api/campaigns/development-fund')
      .then(r => r.ok && r.json())
      .then(data => { if (data) { setRaised(Number(data.raised ?? 0)); setGoal(Number(data.goal ?? 30000000)); setEndsAt(data.ends_at || null); } })
      .catch(() => {});
    fetch('/api/settings/harambee')
      .then(r => r.ok && r.json())
      .then(data => { if (data) setHarambeeDays(data.days_remaining); })
      .catch(() => {});
    fetch('/api/settings')
      .then(r => r.ok && r.json())
      .then(data => {
        if (data?.settings?.site_content) {
          try { setSiteContent(JSON.parse(data.settings.site_content)); } catch {}
        }
      })
      .catch(() => {});
    fetchPledges();

    const interval = setInterval(() => {
      fetch('/api/campaigns/development-fund')
        .then(r => r.ok && r.json())
        .then(data => { if (data) { setRaised(Number(data.raised ?? 0)); setGoal(Number(data.goal ?? 30000000)); setEndsAt(data.ends_at || null); } })
        .catch(() => {});
      fetchPledges();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (siteContent?.goal_amount) setGoal(Number(siteContent.goal_amount));
  }, [siteContent]);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    fetch('/api/donations?status=completed&limit=10')
      .then(r => r.ok && r.json())
      .then(data => { if (data?.donations?.length) setRecentDonations(data.donations.slice(0, 10)); })
      .catch(() => {});
    const interval = setInterval(() => {
      fetch('/api/donations?status=completed&limit=10')
        .then(r => r.ok && r.json())
        .then(data => { if (data?.donations?.length) setRecentDonations(data.donations.slice(0, 10)); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!inView) return;
    setWidth(0);
    setDisplayRaised(0);
    const duration = 1500;
    const steps = 40;
    const stepInterval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setDisplayRaised(Math.round(raised * eased));
      setWidth(pct * eased);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayRaised(raised);
        setWidth(pct);
      }
    }, stepInterval);
    return () => clearInterval(timer);
  }, [raised, pct, inView]);

  useEffect(() => {
    if (!inView) return;
    setPledgeWidth(0);
    const duration = 1200;
    const steps = 35;
    const stepInterval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setPledgeWidth(pledgePct * eased);
      if (step >= steps) {
        clearInterval(timer);
        setPledgeWidth(pledgePct);
      }
    }, stepInterval);
    return () => clearInterval(timer);
  }, [pledgePct, inView]);

  function handleShare() {
    const text = `🏛️ AIPCA Bahati Cathedral Harambee Progress\n\n💰 Raised: KES ${displayRaised.toLocaleString()}\n🎯 Goal: KES ${goal.toLocaleString()}\n📊 ${pct.toFixed(2)}% Complete\n\n👉 Give at https://aipcaharambee.com`;
    if (navigator.share) { navigator.share({ title: 'AIPCA Bahati Cathedral', text }).catch(() => {}); }
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
  }

  return (
    <section className="relative overflow-hidden bg-[#0f1a13] px-4 py-20 md:py-28">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.02] blur-2xl" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber/20 animate-pulse-soft"
            style={{
              top: `${15 + i * 14}%`,
              left: `${5 + (i * 17) % 90}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div ref={ref} className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className={`mb-10 text-center transition-all duration-700 ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-4 py-1.5 text-xs font-bold text-amber uppercase tracking-widest">
            <TrendingUp size={12} />
            Harambee Progress
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-white md:text-4xl">
            Tujenge Pamoja
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            {siteContent?.harambee_reason_en || 'Together we are building the house of the Lord. Every contribution brings us closer to our goal.'}
          </p>
        </div>

        {/* Main progress card */}
        <div className={`relative rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm transition-all duration-700 delay-200 md:p-12 ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {/* Live marquee ticker */}
          {recentDonations.length > 0 && (
            <div className="mb-5 flex items-center gap-3 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <div className="relative flex-1 overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)' }}>
                <div className="flex animate-marquee gap-10" style={{ width: 'max-content' }}>
                  {[...recentDonations, ...recentDonations].map((d, i) => (
                    <span key={i} className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
                      <span className="font-medium text-white/80">{d.donor_name || 'Anonymous'}</span>
                      <span className="font-semibold text-amber">KES {Number(d.amount).toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raised & Goal display */}
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">Total Raised</p>
              <p className="mt-1 text-3xl font-bold text-white md:text-4xl tabular-nums">
                KES {displayRaised.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-widest text-white/40">Goal</p>
                <p className="mt-1 text-lg font-semibold text-white/60 md:text-xl tabular-nums">
                  KES {goal.toLocaleString()}
                </p>
              </div>
              <div className="group flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-amber/20 bg-amber/5 transition-all duration-300 hover:border-amber/40 hover:bg-amber/10 hover:shadow-lg hover:shadow-amber/20">
                <span className="text-2xl font-bold text-amber tabular-nums transition-all duration-300 group-hover:scale-110">{pct.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div ref={barRef} className="relative">
            <div className="h-4 overflow-hidden rounded-full bg-white/5 shadow-inner md:h-5">
              <div
                className="relative h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${width}%`,
                  background: 'linear-gradient(90deg, #C4964A, #D4A853, #E8C06A, #C4964A)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-shine" />
                {/* LIVE badge */}
                <div className="absolute -top-2 right-0 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 shadow-lg shadow-red-500/30">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white">LIVE</span>
                </div>
                {width > 15 && (
                  <div className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-amber bg-white shadow-lg shadow-amber/30 md:h-7 md:w-7">
                    <div className="flex h-full w-full items-center justify-center">
                      <Zap size={12} className="text-amber" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Milestone markers */}
            <div className="relative mt-2 flex justify-between px-0">
              {[25, 50, 75].map(m => (
                <div key={m} className="flex flex-col items-center">
                  <div className={`h-2 w-0.5 ${pct >= m ? 'bg-amber/50' : 'bg-white/10'}`} />
                  <span className={`mt-1 text-[10px] ${pct >= m ? 'text-amber/60' : 'text-white/20'}`}>
                    KES {(goal * m / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
            <div className="group text-center transition-all duration-300 hover:scale-105">
              <Target size={16} className="mx-auto mb-1 text-amber transition-all duration-300 group-hover:scale-125" />
              <p className="text-lg font-bold text-white tabular-nums">{pct.toFixed(2)}%</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Complete</p>
            </div>
            <div className="group text-center transition-all duration-300 hover:scale-105">
              <TrendingUp size={16} className="mx-auto mb-1 text-amber transition-all duration-300 group-hover:scale-125" />
              <p className="text-lg font-bold text-white tabular-nums">KES {(goal - raised > 0 ? (goal - raised) : 0).toLocaleString()}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Remaining</p>
            </div>
            <div className="group text-center transition-all duration-300 hover:scale-105">
              <Clock size={16} className="mx-auto mb-1 text-amber transition-all duration-300 group-hover:scale-125" />
              <p className="text-lg font-bold text-amber tabular-nums">
                {endsAt
                  ? `${String(timeLeft.days).padStart(2,'0')}:${String(timeLeft.hours).padStart(2,'0')}:${String(timeLeft.minutes).padStart(2,'0')}:${String(timeLeft.seconds).padStart(2,'0')}`
                  : harambeeDays > 0 ? `${harambeeDays}d` : "—"}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Time Left</p>
            </div>
          </div>

          {/* Share button */}
          <div className="mt-6 flex justify-center">
            <button onClick={handleShare}
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-xs font-semibold text-white/50 transition-all duration-300 hover:border-amber/30 hover:bg-amber/5 hover:text-amber hover:shadow-lg hover:shadow-amber/10">
              <Share2 size={14} className="transition-all duration-300 group-hover:scale-110" />
              Share Progress
            </button>
          </div>

          {/* Pledge Progress */}
          {pledgeTotal > 0 && (
            <div className="mt-6 border-t border-white/5 pt-6">
              <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/40">Total Pledges</p>
                  <p className="mt-1 text-xl font-bold text-white md:text-2xl tabular-nums">
                    KES {pledgePaid.toLocaleString()}
                    <span className="text-base font-normal text-white/40"> / KES {pledgeTotal.toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-green-500/20 bg-green-500/5">
                  <span className="text-lg font-bold text-green-400 tabular-nums">{pledgePct.toFixed(2)}%</span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5 shadow-inner md:h-4">
                <div
                  className="relative h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${pledgeWidth}%`,
                    background: 'linear-gradient(90deg, #22c55e, #4ade80, #86efac, #22c55e)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-shine" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400 tabular-nums">{pledgePct.toFixed(2)}%</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Fulfilled</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white tabular-nums">KES {(pledgeTotal - pledgePaid > 0 ? (pledgeTotal - pledgePaid) : 0).toLocaleString()}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Outstanding</p>
                </div>
                <div className="text-center">
                  <Heart size={14} className="mx-auto mb-0.5 text-green-400" />
                  <p className="text-sm font-bold text-white tabular-nums">{pledgeCount}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Pledges</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
