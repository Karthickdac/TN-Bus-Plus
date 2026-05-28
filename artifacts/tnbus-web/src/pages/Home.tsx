import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, MapPin, Search, ArrowRight, Bus, Clock, Shield, Star, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListRoutes } from "@workspace/api-client-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const { data: routes } = useListRoutes();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (origin) p.append("origin", origin);
    if (destination) p.append("destination", destination);
    if (date) p.append("date", date);
    setLocation(`/search?${p.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#f4f6fb]">

      {/* ── Government Banner ─────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-green-700 via-green-600 to-green-700 border-b-4 border-orange-400">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">

          {/* Left — TN Emblem */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-[3px] border-yellow-300 shadow-lg bg-white shrink-0">
              <img src="/images/tn-emblem.png" alt="Tamil Nadu Government Emblem"
                className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <p className="text-yellow-200 text-xs font-medium">தமிழ்நாடு அரசு</p>
              <p className="text-white text-sm font-bold">Government of Tamil Nadu</p>
              <p className="text-green-200 text-xs">வாய்மையே வெல்லும்</p>
            </div>
          </div>

          {/* Centre */}
          <div className="text-center flex-1 px-2">
            <p className="text-white text-sm sm:text-lg md:text-xl font-extrabold tracking-wide uppercase leading-tight">
              Tamil Nadu State Transport Corporation
            </p>
            <div className="w-3/4 mx-auto h-px bg-yellow-300/60 my-1.5" />
            <p className="text-yellow-200 text-xs sm:text-sm font-medium tracking-wider">
              TN Bus+ · Official Online Bus Booking System
            </p>
          </div>

          {/* Right — CM Photo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-green-200 text-xs">Hon'ble Chief Minister</p>
              <p className="text-white text-sm font-bold">Thiru. Vijay</p>
              <p className="text-yellow-200 text-xs">Tamil Nadu</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-[3px] border-yellow-300 shadow-lg shrink-0">
              <img src="/images/cm-vijay.png" alt="Thiru. Vijay, Chief Minister"
                className="w-full h-full object-cover object-center" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero Section ──────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #3730a3 0%, #6d28d9 35%, #0891b2 70%, #0e7490 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-10 right-20 w-40 h-40 bg-orange-400/10 rounded-full" />

        <div className="container mx-auto px-6 pt-10 pb-40 flex items-center gap-8 relative z-10">
          {/* Left — Text */}
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-3"
            >
              Tamil Nadu's #1<br />
              <span className="text-orange-300">Official Bus</span> Booking
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-indigo-100 text-base sm:text-lg max-w-md"
            >
              Book government AC buses, track live location, and travel safely across Tamil Nadu.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 mt-5"
            >
              {[
                { icon: <Bus className="w-3.5 h-3.5" />, label: "10+ Bus Types" },
                { icon: <Shield className="w-3.5 h-3.5" />, label: "Govt. Certified" },
                { icon: <Star className="w-3.5 h-3.5" />, label: "87% On-time" },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                  {b.icon} {b.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — Bus Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden md:block flex-shrink-0"
          >
            <svg viewBox="0 0 320 180" className="w-72 xl:w-96 drop-shadow-2xl" fill="none">
              {/* Road */}
              <ellipse cx="160" cy="168" rx="150" ry="12" fill="rgba(0,0,0,0.15)" />
              {/* Bus body */}
              <rect x="20" y="60" width="240" height="100" rx="14" fill="#FFF" opacity="0.95"/>
              {/* Bus top */}
              <rect x="30" y="40" width="200" height="30" rx="10" fill="#E0E7FF"/>
              {/* Windows */}
              {[50,100,150,195].map(x => (
                <rect key={x} x={x} y="72" width="34" height="26" rx="5" fill="#BAE6FD" opacity="0.9" />
              ))}
              {/* Door */}
              <rect x="218" y="110" width="26" height="50" rx="4" fill="#C7D2FE"/>
              {/* Wheels */}
              <circle cx="70" cy="163" r="22" fill="#1e293b"/>
              <circle cx="70" cy="163" r="12" fill="#64748b"/>
              <circle cx="70" cy="163" r="5" fill="#e2e8f0"/>
              <circle cx="205" cy="163" r="22" fill="#1e293b"/>
              <circle cx="205" cy="163" r="12" fill="#64748b"/>
              <circle cx="205" cy="163" r="5" fill="#e2e8f0"/>
              {/* Front */}
              <rect x="245" y="80" width="30" height="80" rx="8" fill="#E0E7FF"/>
              <rect x="250" y="85" width="20" height="28" rx="4" fill="#BAE6FD" opacity="0.9"/>
              {/* Headlight */}
              <rect x="268" y="120" width="12" height="8" rx="3" fill="#FDE68A"/>
              {/* Stripe */}
              <rect x="20" y="130" width="240" height="8" rx="2" fill="#6366F1" opacity="0.3"/>
              {/* TN text on bus */}
              <text x="90" y="118" fill="#4338CA" fontSize="13" fontWeight="bold" fontFamily="sans-serif">TN BUS+</text>
              {/* Trees */}
              <rect x="310" y="100" width="6" height="50" rx="2" fill="#4ade80" opacity="0.6"/>
              <ellipse cx="313" cy="98" rx="12" ry="14" fill="#22c55e" opacity="0.7"/>
              <rect x="5" y="110" width="5" height="40" rx="2" fill="#4ade80" opacity="0.6"/>
              <ellipse cx="7" cy="108" rx="10" ry="12" fill="#22c55e" opacity="0.7"/>
            </svg>
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f4f6fb"/>
          </svg>
        </div>
      </div>

      {/* ── Floating Search Card ───────────────────────────── */}
      <div className="container mx-auto px-4 -mt-24 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl shadow-indigo-200/50 border border-slate-100 p-5 sm:p-6"
        >
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4" />
                <Input
                  placeholder="From (e.g. Chennai)"
                  className="pl-9 h-12 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                />
              </div>

              {/* Swap arrow */}
              <div className="hidden sm:flex items-center">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  onClick={() => { const t = origin; setOrigin(destination); setDestination(t); }}>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-4 h-4" />
                <Input
                  placeholder="To (e.g. Madurai)"
                  className="pl-9 h-12 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>

              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4" />
                <Input
                  type="date"
                  className="pl-9 h-12 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm text-foreground"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 transition-all">
              <Search className="mr-2 w-5 h-5" /> Search Buses
            </Button>
          </form>
        </motion.div>
      </div>

      {/* ── Popular Routes ─────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-0.5">Most Booked</p>
            <h2 className="text-2xl font-extrabold text-slate-800">Popular Routes</h2>
          </div>
          <button onClick={() => setLocation("/search")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {routes?.slice(0, 3).map((route, i) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setLocation(`/search?origin=${route.origin}&destination=${route.destination}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 p-5 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-800">{route.origin}</span>
                  </div>
                  <div className="ml-1 w-px h-4 bg-slate-200 mx-auto" style={{ marginLeft: "3px" }} />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-slate-800">{route.destination}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-indigo-600">₹{route.basefare}</p>
                  <p className="text-xs text-slate-400">onwards</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {Math.floor(Number(route.durationMinutes) / 60)}h {Number(route.durationMinutes) % 60}m
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  {Number(route.distanceKm)} km
                </span>
                <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
                  Book now →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features strip ──────────────────────────────────── */}
      <section className="bg-white border-t border-slate-100 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: <Shield className="w-6 h-6 text-indigo-500" />, title: "Govt. Certified", desc: "All buses TNSTC approved" },
              { icon: <Zap className="w-6 h-6 text-orange-500" />, title: "Live Tracking", desc: "Real-time GPS on every bus" },
              { icon: <Star className="w-6 h-6 text-yellow-500" />, title: "87% On-Time", desc: "Industry-leading punctuality" },
              { icon: <Wifi className="w-6 h-6 text-emerald-500" />, title: "AC & WiFi", desc: "Premium comfort guaranteed" },
            ].map(f => (
              <div key={f.title} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {f.icon}
                </div>
                <p className="font-bold text-sm text-slate-800">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
