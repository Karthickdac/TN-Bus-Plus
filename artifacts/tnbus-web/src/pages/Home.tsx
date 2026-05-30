import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { Calendar, MapPin, Search, ArrowRight, Bus, Clock, Shield, Star, Wifi, Zap, ArrowLeftRight, UserRound, Users, Route as RouteIcon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListRoutes } from "@workspace/api-client-react";
import { useLang } from "@/contexts/LanguageContext";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { TN_CITIES } from "@/data/tnCities";

function Counter({ to, suffix = "", duration = 1500 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString("en-IN")}{suffix}</span>;
}

function SetcBus({ className = "" }: { className?: string }) {
  return (
    <img
      src="/images/setc-bus.png"
      alt="SETC government bus"
      draggable={false}
      className={`h-16 w-auto max-w-none select-none ${className}`}
      style={{ filter: "drop-shadow(0 8px 12px rgba(15,23,42,.22))" }}
    />
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);
  const { data: routes } = useListRoutes();
  const { t } = useLang();

  const places = Array.from(
    new Set([
      ...TN_CITIES,
      ...(routes ?? []).flatMap(r => [r.origin, r.destination, ...(r.stops ?? [])]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (origin) p.append("origin", origin);
    if (destination) p.append("destination", destination);
    if (date) p.append("date", date);
    if (womenOnly) p.append("women", "1");
    setLocation(`/search?${p.toString()}`);
  };

  const tickerMessages = [
    "🚌 New express route launched: Chennai ↔ Coimbatore via Salem — Book now!",
    "🎉 Special fare: 20% off on all AC Sleeper bookings this weekend",
    "📢 Pongal Special buses: Extra services from Chennai to all major districts",
    "✅ Online booking now available for SETC Deluxe buses on all routes",
    "🛡️ Safety update: All buses equipped with GPS tracking & CCTV cameras",
    "⏰ Revised timings: Chennai–Madurai night service now departs at 10:30 PM",
    "💳 Pay with UPI, Net Banking or Cards — zero convenience fee",
    "🆕 New route: Trichy ↔ Tirunelveli Super Deluxe — starting June 1st",
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#f4f6fb]">

      {/* ── Government Banner ─────────────────────────────── */}
      <div className="relative w-full overflow-hidden border-b border-slate-200" style={{ background: "linear-gradient(110deg, #ffffff 0%, #eef2ff 50%, #ffffff 100%)" }}>
        {/* subtle decorative glow */}
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(circle at 12% 50%, rgba(99,102,241,.12) 0, transparent 45%), radial-gradient(circle at 88% 50%, rgba(245,158,11,.10) 0, transparent 45%)" }} />
        <div className="relative container mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 shrink-0">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-md bg-white p-1 shrink-0"
            >
              <img src="/images/tn-emblem-fitted.png" alt="Tamil Nadu Government Emblem" className="w-full h-full object-contain" />
            </motion.div>
            <div className="hidden sm:block">
              <p className="text-amber-600 text-[11px] font-semibold tracking-wide">தமிழ்நாடு அரசு</p>
              <p className="text-slate-900 text-sm font-bold tracking-tight">Government of Tamil Nadu</p>
              <p className="text-slate-500 text-[11px] tracking-wide">வாய்மையே வெல்லும்</p>
            </div>
          </div>

          <div className="text-center flex-1 px-2">
            <p className="text-slate-900 text-sm sm:text-lg md:text-xl font-bold tracking-tight leading-tight">
              Tamil Nadu State Transport Corporation
            </p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400/70" />
              <p className="text-indigo-600/80 text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase">
                TN Bus+ · Official Booking System
              </p>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400/70" />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-slate-500 text-[11px] tracking-wide">Hon'ble Chief Minister</p>
              <p className="text-slate-900 text-sm font-bold tracking-tight">Thiru. C. Joseph Vijay</p>
              <p className="text-amber-600 text-[11px] tracking-wide">Tamil Nadu</p>
            </div>
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: 20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.05 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-md shrink-0"
            >
              <img src="/images/cm-vijay-fitted.png" alt="Thiru. C. Joseph Vijay, Chief Minister" className="w-full h-full object-cover object-center" />
            </motion.div>
          </div>
        </div>
        {/* refined tricolor hairline accent */}
        <div className="relative h-[3px] w-full flex">
          <span className="flex-1 bg-[#ff9933]" />
          <span className="flex-1 bg-white/85" />
          <span className="flex-1 bg-[#138808]" />
        </div>
      </div>

      {/* ── Announcement Ticker ───────────────────────────── */}
      <div className="w-full bg-amber-50 border-b border-amber-200 overflow-hidden">
        <div className="flex items-center">
          <div className="shrink-0 bg-orange-600 text-white text-xs font-bold px-4 py-2 uppercase tracking-widest flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {t.notice}
          </div>
          <div className="overflow-hidden flex-1 relative">
            <div className="flex gap-12 whitespace-nowrap text-amber-900 text-xs font-medium py-2" style={{ animation: "ticker 40s linear infinite" }}>
              {tickerMessages.map((msg, i) => <span key={i} className="inline-block">{msg}</span>)}
              {tickerMessages.map((msg, i) => <span key={`b-${i}`} className="inline-block">{msg}</span>)}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-22px); } }
        @keyframes drive { 0% { transform: translateX(-18vw); } 100% { transform: translateX(118vw); } }
        @keyframes driveSlow { 0% { transform: translateX(-26vw); } 100% { transform: translateX(126vw); } }
        @keyframes roadDash { 0% { background-position: 0 0; } 100% { background-position: -84px 0; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes busBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes headlight { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
        @keyframes speedline { 0% { opacity: 0; transform: translateX(6px) scaleX(.6); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateX(-22px) scaleX(1.4); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="ticker"], [style*="floatY"], [style*="drive"], [style*="driveSlow"], [style*="roadDash"], [style*="shimmer"], [style*="spin"], [style*="busBob"], [style*="headlight"], [style*="speedline"] { animation: none !important; }
        }
      `}</style>

      {/* ── Hero Section ──────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-200" style={{ background: "linear-gradient(135deg, #ffffff 0%, #eef2ff 36%, #e0e7ff 66%, #eaf5ff 100%)" }}>
        {/* Animated decorative backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-indigo-300/40 blur-3xl" style={{ animation: "floatY 9s ease-in-out infinite" }} />
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-cyan-300/35 blur-3xl" style={{ animation: "floatY 11s ease-in-out infinite", animationDelay: "1.5s" }} />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-amber-300/30 blur-3xl" style={{ animation: "floatY 13s ease-in-out infinite", animationDelay: "0.8s" }} />
          {/* subtle grid */}
          <div className="absolute inset-0 opacity-[0.6]" style={{ backgroundImage: "linear-gradient(rgba(79,70,229,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.06) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        </div>

        <div className="relative w-full px-8 md:px-16 pt-8 pb-12 flex flex-col md:flex-row items-start gap-10">
          {/* Left — Tagline */}
          <div className="flex-1 text-left flex flex-col justify-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="inline-flex w-fit items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 mb-4 uppercase tracking-wider shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              {t.heroTag}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.05] mb-3"
            >
              {t.heroTitle1}{" "}
              <span className="relative inline-block text-orange-500">
                {t.heroHighlight}
                <motion.span
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
                  className="absolute left-0 -bottom-1 h-1 w-full origin-left rounded-full bg-orange-400/70"
                />
              </span>
              <br />{t.heroTitle2}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-slate-600 text-base md:text-lg mb-5 max-w-md"
            >
              {t.heroSub}
            </motion.p>

            <motion.div
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
              className="flex flex-wrap gap-2"
            >
              {[
                { icon: <Bus className="w-3.5 h-3.5" />, label: t.badge1 },
                { icon: <Shield className="w-3.5 h-3.5" />, label: t.badge2 },
                { icon: <Star className="w-3.5 h-3.5" />, label: t.badge3 },
                { icon: <Wifi className="w-3.5 h-3.5" />, label: t.badge4 },
              ].map(b => (
                <motion.span
                  key={b.label}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -3, scale: 1.04 }}
                  className="flex items-center gap-1.5 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full border border-slate-200 shadow-sm cursor-default"
                >
                  {b.icon} {b.label}
                </motion.span>
              ))}
            </motion.div>

            {/* Animated road + driving SETC bus scene */}
            <div className="relative h-28 mt-6 w-full overflow-hidden pointer-events-none">
              {/* distant glow horizon */}
              <div className="absolute bottom-9 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              {/* faded background bus (depth) */}
              <div className="absolute bottom-[40px] opacity-30 blur-[1.5px] scale-[0.7]" style={{ animation: "driveSlow 22s linear infinite" }}>
                <SetcBus />
              </div>
              {/* road surface */}
              <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-b from-slate-300/70 to-slate-100/20" />
              {/* lane dashes */}
              <div className="absolute bottom-[12px] left-0 right-0 h-[3px] opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(100,116,139,.7) 0 30px, transparent 30px 60px)", backgroundSize: "84px 100%", animation: "roadDash 0.85s linear infinite" }} />
              {/* foreground driving bus */}
              <div className="absolute bottom-[16px]" style={{ animation: "drive 12s linear infinite" }}>
                <div style={{ animation: "busBob 0.55s ease-in-out infinite" }} className="relative">
                  {/* speed lines */}
                  <span className="absolute top-4 -left-5 h-[2px] w-5 rounded-full bg-slate-400/70" style={{ animation: "speedline 0.5s linear infinite" }} />
                  <span className="absolute top-8 -left-7 h-[2px] w-6 rounded-full bg-slate-400/55" style={{ animation: "speedline 0.5s linear infinite", animationDelay: "0.15s" }} />
                  <span className="absolute top-12 -left-4 h-[2px] w-4 rounded-full bg-slate-400/40" style={{ animation: "speedline 0.5s linear infinite", animationDelay: "0.3s" }} />
                  <SetcBus />
                </div>
              </div>
            </div>
          </div>

          {/* Right — Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 28, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.55, delay: 0.15, type: "spring", stiffness: 90 }}
            className="w-full md:w-[368px] shrink-0"
          >
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 border border-white/60 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,.4) 50%, transparent 70%)", backgroundSize: "200% 100%", animation: "shimmer 4s linear infinite" }} />
                <div className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <div className="relative">
                  <p className="text-white font-bold text-base leading-tight">{t.searchTitle}</p>
                  <p className="text-indigo-200 text-xs">{t.searchSub}</p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t.from}</label>
                  <PlaceAutocomplete
                    value={origin}
                    onChange={setOrigin}
                    options={places}
                    placeholder={t.departurePlaceholder}
                    iconClassName="text-indigo-400"
                    ariaLabel={t.from}
                    inputClassName="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <motion.button
                    type="button" whileTap={{ rotate: 180, scale: 0.9 }} transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => { const tmp = origin; setOrigin(destination); setDestination(tmp); }}
                    className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                  </motion.button>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t.to}</label>
                  <PlaceAutocomplete
                    value={destination}
                    onChange={setDestination}
                    options={places}
                    placeholder={t.arrivalPlaceholder}
                    iconClassName="text-orange-400"
                    ariaLabel={t.to}
                    inputClassName="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t.dateOfJourney}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4 pointer-events-none" />
                    <Input type="date" className="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm text-foreground" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>

                <button
                  type="button" onClick={() => setWomenOnly(w => !w)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${womenOnly ? "bg-pink-50 border-pink-400 text-pink-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className={`w-4 h-4 ${womenOnly ? "text-pink-500" : "text-slate-400"}`} />
                    {t.bookingForWomen}
                    {womenOnly && <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold">{t.ladiesOnly}</span>}
                  </span>
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${womenOnly ? "bg-pink-500" : "bg-slate-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${womenOnly ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </button>

                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                  <Button type="submit" className="w-full h-11 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-200 transition-all">
                    <Search className="mr-2 w-4 h-4" /> {t.searchBuses}
                  </Button>
                </motion.div>

                <p className="text-center text-xs text-slate-400">
                  <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => setLocation("/pnr")}>{t.checkPNR}</span>
                  {" · "}
                  <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => setLocation("/dashboard")}>{t.myTrips}</span>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Stats Band ──────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Bus className="w-5 h-5" />, to: 5200, suffix: "+", label: "Daily Services", color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: <Users className="w-5 h-5" />, to: 48, suffix: "L+", label: "Passengers / Year", color: "text-orange-600", bg: "bg-orange-50" },
              { icon: <RouteIcon className="w-5 h-5" />, to: 360, suffix: "+", label: "Routes Covered", color: "text-cyan-600", bg: "bg-cyan-50" },
              { icon: <TrendingUp className="w-5 h-5" />, to: 99, suffix: "%", label: "On-time Rate", color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className={`w-11 h-11 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
                <div>
                  <p className={`text-2xl font-extrabold ${s.color} leading-none`}><Counter to={s.to} suffix={s.suffix} /></p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Routes ─────────────────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-0.5">{t.mostBooked}</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{t.popularRoutes}</h2>
          </div>
          <button onClick={() => setLocation("/search")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
            {t.viewAll} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {routes?.slice(0, 6).map((route, i) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: (i % 3) * 0.08 }}
              whileHover={{ y: -6 }}
              onClick={() => setLocation(`/search?origin=${route.origin}&destination=${route.destination}`)}
              className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100 hover:border-indigo-200 transition-all duration-200 p-5 cursor-pointer group overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50 group-hover:bg-indigo-100/70 transition-colors" />
              <div className="relative flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-800">{route.origin}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200 ml-[3px]" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-slate-800">{route.destination}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-indigo-600">₹{route.basefare}</p>
                  <p className="text-xs text-slate-400">{t.onwards}</p>
                </div>
              </div>
              <div className="relative flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {Math.floor(Number(route.durationMinutes) / 60)}h {Number(route.durationMinutes) % 60}m
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  {Number(route.distanceKm)} km
                </span>
                <span className="text-xs font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                  {t.bookNow} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features strip ──────────────────────────────────── */}
      <section className="bg-white border-t border-slate-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: <Shield className="w-6 h-6 text-indigo-500" />, title: t.certTitle, desc: t.certDesc, bg: "bg-indigo-50" },
              { icon: <Zap className="w-6 h-6 text-orange-500" />, title: t.trackTitle, desc: t.trackDesc, bg: "bg-orange-50" },
              { icon: <Star className="w-6 h-6 text-yellow-500" />, title: t.ontimeTitle, desc: t.ontimeDesc, bg: "bg-yellow-50" },
              { icon: <Wifi className="w-6 h-6 text-emerald-500" />, title: t.wifiTitle, desc: t.wifiDesc, bg: "bg-emerald-50" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center border border-slate-100 shadow-sm`}>
                  {f.icon}
                </div>
                <p className="font-extrabold text-sm text-slate-900">{f.title}</p>
                <p className="text-xs text-slate-600 max-w-[180px]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-slate-200" style={{ background: "linear-gradient(120deg, #eef2ff 0%, #f5f3ff 55%, #ecfeff 100%)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(99,102,241,.12) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(245,158,11,.10) 0, transparent 40%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative container mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
        >
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">{t.heroTitle1} <span className="text-orange-500">{t.heroHighlight}</span> {t.heroTitle2}</h3>
            <p className="text-slate-600 text-sm max-w-lg">{t.heroSub}</p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="shrink-0">
            <Button onClick={() => setLocation("/search")} className="h-12 px-8 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200">
              <Search className="mr-2 w-4 h-4" /> {t.searchBuses}
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
