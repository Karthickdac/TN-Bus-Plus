import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, MapPin, Search, ArrowRight, Bus, Clock, Shield, Star, Wifi, Zap, ArrowLeftRight } from "lucide-react";
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
              <p className="text-white text-sm font-bold">Thiru. C. Joseph Vijay</p>
              <p className="text-yellow-200 text-xs">Tamil Nadu</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-[3px] border-yellow-300 shadow-lg shrink-0">
              <img src="/images/cm-vijay.png" alt="Thiru. C. Joseph Vijay, Chief Minister"
                className="w-full h-full object-cover object-center" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero Section ──────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #3730a3 0%, #6d28d9 35%, #0891b2 70%, #0e7490 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-orange-400/10 rounded-full" />

        <div className="container mx-auto px-6 pt-10 pb-16 flex flex-col md:flex-row items-center gap-8 relative z-10">

          {/* Left — Tagline */}
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 bg-white/15 text-orange-200 text-xs font-bold px-3 py-1 rounded-full border border-white/20 mb-4 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Live Booking Open
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                Tamil Nadu's <span className="text-orange-300">#1 Official</span><br />Bus Booking Portal
              </h1>
              <p className="text-indigo-100 text-base sm:text-lg max-w-md mx-auto md:mx-0 mb-6">
                Book government AC buses, track live location, and travel safely across every corner of Tamil Nadu.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center md:justify-start gap-3"
            >
              {[
                { icon: <Bus className="w-3.5 h-3.5" />, label: "10+ Bus Types" },
                { icon: <Shield className="w-3.5 h-3.5" />, label: "Govt. Certified" },
                { icon: <Star className="w-3.5 h-3.5" />, label: "87% On-time" },
                { icon: <Wifi className="w-3.5 h-3.5" />, label: "AC & WiFi" },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                  {b.icon} {b.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — Search Card (login-form style) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full md:w-[380px] shrink-0"
          >
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-white/60 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Search Buses</p>
                  <p className="text-indigo-200 text-xs">Find your perfect journey</p>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleSearch} className="px-6 py-5 space-y-4">
                {/* From */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4" />
                    <Input
                      placeholder="Departure city"
                      className="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                    />
                  </div>
                </div>

                {/* Swap button */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={() => { const t = origin; setOrigin(destination); setDestination(t); }}
                    className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* To */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-4 h-4" />
                    <Input
                      placeholder="Arrival city"
                      className="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Date of Journey</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4 pointer-events-none" />
                    <Input
                      type="date"
                      className="pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 text-sm text-foreground"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-200 transition-all">
                  <Search className="mr-2 w-4 h-4" /> Search Buses
                </Button>

                <p className="text-center text-xs text-slate-400">
                  <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => setLocation("/pnr")}>Check PNR Status</span>
                  {" · "}
                  <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => setLocation("/dashboard")}>My Trips</span>
                </p>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f4f6fb"/>
          </svg>
        </div>
      </div>

      {/* ── Popular Routes ─────────────────────────────────── */}
      <section className="container mx-auto px-4 py-10">
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
                  <div className="ml-1 w-px h-4 bg-slate-200" style={{ marginLeft: "3px" }} />
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
