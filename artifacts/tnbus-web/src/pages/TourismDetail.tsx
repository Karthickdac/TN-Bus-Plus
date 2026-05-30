import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Clock, Check, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGetTourismPackage, getGetTourismPackageQueryKey } from "@workspace/api-client-react";

export default function TourismDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const { data: pkg, isLoading, isError } = useGetTourismPackage(id, {
    query: { enabled: !!id, queryKey: getGetTourismPackageQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <p className="text-muted-foreground mb-4">This tourism package could not be found.</p>
        <Link href="/tourism">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to packages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/tourism" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All packages
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-40 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-orange-500/20 flex items-center justify-center text-7xl mb-6"
      >
        {pkg.heroEmoji}
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wide bg-background/80 backdrop-blur px-2 py-1 rounded-full text-muted-foreground">
          {pkg.region}
        </span>
      </motion.div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{pkg.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {pkg.destination}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4" /> {pkg.durationDays} days / {pkg.nights} nights</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">From</p>
          <p className="text-2xl font-bold text-primary">₹{pkg.price.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">per person</p>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">{pkg.summary}</p>

      {pkg.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {pkg.highlights.map(h => (
            <span key={h} className="text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 rounded-full px-3 py-1">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Itinerary */}
      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Day-by-day itinerary
        </h2>
        <div className="space-y-3">
          {pkg.itinerary.map(stop => (
            <div key={stop.day} className="flex gap-4 bg-card border border-border/50 rounded-2xl p-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                D{stop.day}
              </div>
              <div>
                <p className="font-medium">{stop.title}</p>
                <p className="text-sm text-muted-foreground">{stop.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inclusions */}
      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">What's included</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {pkg.inclusions.map(inc => (
            <li key={inc} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {inc}
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-4 bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total per person</p>
          <p className="text-xl font-bold text-primary">₹{pkg.price.toLocaleString("en-IN")}</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => toast({ title: "Enquiry received", description: `Our travel desk will call you about the ${pkg.name}.` })}
        >
          Enquire & Book
        </Button>
      </div>
    </div>
  );
}
