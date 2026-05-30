import { ShieldCheck, Video, MapPin, UserCheck, Phone } from "lucide-react";

const FEATURES = [
  { icon: ShieldCheck, title: "Women-only seats", desc: "Reserved front-row seats for women travellers on every bus." },
  { icon: Video, title: "CCTV monitored", desc: "Live camera coverage inside and around the cabin." },
  { icon: MapPin, title: "GPS tracked", desc: "Every trip is location-tracked and shareable in one tap." },
  { icon: UserCheck, title: "Verified crew", desc: "Background-checked, rated drivers and trained conductors." },
];

export default function SafetyPanel({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-5 h-5 text-rose-400" />
        <h3 className="font-semibold">Your safety, our priority</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <div key={f.title} className="flex gap-2.5">
            <f.icon className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-rose-500/15 pt-3">
        <Phone className="w-3.5 h-3.5 text-rose-400" />
        <span>
          Women Helpline <span className="font-semibold text-rose-300">1091</span> · Emergency{" "}
          <span className="font-semibold text-rose-300">112</span> — also available via the SOS button on your live trip.
        </span>
      </div>
    </div>
  );
}
