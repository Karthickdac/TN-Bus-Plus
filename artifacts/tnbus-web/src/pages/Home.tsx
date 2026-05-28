import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, MapPin, Search, Star, Clock, Shield, Bus } from "lucide-react";
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
    const params = new URLSearchParams();
    if (origin) params.append("origin", origin);
    if (destination) params.append("destination", destination);
    if (date) params.append("date", date);
    setLocation(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">

      {/* ── Government Banner ─────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-amber-950 via-[#5a2e00] to-amber-950 border-b-2 border-amber-600/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">

          {/* Left — TN Emblem */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-[3px] border-amber-400/80 shadow-xl shadow-amber-900/60 bg-white shrink-0">
              <img
                src="/images/tn-emblem.png"
                alt="Tamil Nadu Government Emblem"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-amber-200 text-sm font-semibold leading-snug">தமிழ்நாடு அரசு</p>
              <p className="text-amber-100 text-base font-bold leading-snug">Government of Tamil Nadu</p>
              <p className="text-amber-400/80 text-xs mt-0.5">வாய்மையே வெல்லும்</p>
            </div>
          </div>

          {/* Centre — Title */}
          <div className="text-center flex-1 px-2">
            <h1 className="text-amber-100 text-base sm:text-xl md:text-2xl font-extrabold leading-tight tracking-widest uppercase">
              Tamil Nadu State Transport Corporation
            </h1>
            <div className="w-2/3 mx-auto h-px bg-amber-500/50 my-2" />
            <p className="text-amber-300 text-sm sm:text-base font-semibold tracking-wide">TN Bus+ Premium Portal</p>
            <p className="text-amber-400/70 text-xs mt-0.5 tracking-wider">Official Online Bus Booking System</p>
          </div>

          {/* Right — CM Photo */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-amber-400/80 text-xs leading-tight mb-0.5">Hon'ble Chief Minister</p>
              <p className="text-amber-100 text-base font-extrabold leading-tight">Thiru. Vijay</p>
              <p className="text-amber-300 text-xs leading-tight">Tamil Nadu</p>
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-[3px] border-amber-400/80 shadow-xl shadow-amber-900/60 bg-amber-950/60 shrink-0">
              <img
                src="/images/cm-vijay.png"
                alt="Thiru. Vijay, Chief Minister of Tamil Nadu"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="relative flex-1 flex flex-col justify-center items-center overflow-hidden py-20 px-4">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px] z-0 pointer-events-none" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[128px] z-0 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] z-0 pointer-events-none" />

        <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-6"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-semibold tracking-wider uppercase">Live Booking Now Open</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500">Government Travel,</span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">Elevated.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            Experience the new standard of transit in Tamil Nadu. Book premium AC sleeper buses, track in real-time, and manage your journey.
          </motion.p>

          {/* Search form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass p-2 rounded-2xl mx-auto max-w-3xl"
          >
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70 w-5 h-5" />
                <Input
                  placeholder="From (e.g. Chennai)"
                  className="pl-10 h-14 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-lg"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70 w-5 h-5" />
                <Input
                  placeholder="To (e.g. Madurai)"
                  className="pl-10 h-14 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-lg"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70 w-5 h-5" />
                <Input
                  type="date"
                  className="pl-10 h-14 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-lg text-foreground"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Search className="mr-2 w-5 h-5" /> Search
              </Button>
            </form>
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: <Bus className="w-3.5 h-3.5" />, text: "10 Bus Types" },
              { icon: <Shield className="w-3.5 h-3.5" />, text: "Govt. Certified" },
              { icon: <Star className="w-3.5 h-3.5" />, text: "90%+ On Time" },
              { icon: <Clock className="w-3.5 h-3.5" />, text: "Live Tracking" },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                <span className="text-primary">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Popular Routes ─────────────────────────────────── */}
      <section className="py-20 bg-card/30 relative z-10 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">Most Travelled</p>
              <h2 className="text-3xl font-bold tracking-tight">Popular Routes</h2>
            </div>
            <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm" onClick={() => setLocation("/search")}>
              View all →
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {routes?.slice(0, 3).map((route, i) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-6 rounded-2xl hover:-translate-y-1 transition-all duration-300 hover:border-primary/30 cursor-pointer group"
                onClick={() => setLocation(`/search?origin=${route.origin}&destination=${route.destination}`)}
              >
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{route.origin}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-12 h-px bg-primary/40" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    </div>
                    <p className="text-muted-foreground mt-1">{route.destination}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">₹{route.basefare}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">from</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-secondary" />
                    {Math.floor(Number(route.durationMinutes) / 60)}h {Number(route.durationMinutes) % 60}m
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-secondary" />
                    {Number(route.distanceKm)} km
                  </span>
                  <Button size="sm" variant="secondary" className="h-7 px-3 text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                    Book →
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Strip ────────────────────────────────────── */}
      <section className="py-8 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10+", label: "Bus Types" },
              { value: "50+", label: "Daily Routes" },
              { value: "10,000+", label: "Happy Passengers" },
              { value: "87%", label: "On-time Rate" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-2xl font-bold text-primary">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
