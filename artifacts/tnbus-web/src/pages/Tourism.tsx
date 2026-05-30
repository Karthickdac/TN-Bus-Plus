import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTourismPackages } from "@workspace/api-client-react";

export default function Tourism() {
  const { data: packages, isLoading } = useListTourismPackages();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Tourism Packages</h1>
      <p className="text-muted-foreground mb-6">
        Curated Tamil Nadu getaways with TNSTC coaches, stays and sightseeing — booked end to end.
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (packages ?? []).length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl px-5 py-10 text-center text-muted-foreground text-sm">
          No tourism packages available right now. Check back soon.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(packages ?? []).map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/tourism/${pkg.id}`}>
                <div className="group h-full flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 transition-colors cursor-pointer">
                  <div className="relative h-28 bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-orange-500/20 flex items-center justify-center text-5xl">
                    {pkg.heroEmoji}
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide bg-background/80 backdrop-blur px-2 py-1 rounded-full text-muted-foreground">
                      {pkg.region}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    <h2 className="font-semibold mb-1">{pkg.name}</h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {pkg.destination}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {pkg.durationDays}D / {pkg.nights}N</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{pkg.summary}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="text-lg font-bold text-primary">₹{pkg.price.toLocaleString("en-IN")}<span className="text-xs font-normal text-muted-foreground"> /person</span></p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        View <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
