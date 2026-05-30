import { useState, type ReactNode, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ScanLine,
  Users,
  Gauge,
  Wallet,
  CalendarClock,
  Fuel,
  ClipboardCheck,
  Siren,
  Menu,
  X,
  ArrowLeft,
  LogOut,
  BadgeCheck,
  Bus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const CONDUCTOR_NAV: NavItem[] = [
  { href: "/conductor", label: "Overview", icon: LayoutDashboard },
  { href: "/conductor/validate", label: "Validate Ticket", icon: ScanLine },
  { href: "/conductor/manifest", label: "Passenger Manifest", icon: Users },
  { href: "/conductor/occupancy", label: "Live Occupancy", icon: Gauge },
  { href: "/conductor/cash", label: "Cash Collection", icon: Wallet },
];

const DRIVER_NAV: NavItem[] = [
  { href: "/driver", label: "Overview", icon: LayoutDashboard },
  { href: "/driver/duty", label: "Duty Schedule", icon: CalendarClock },
  { href: "/driver/fuel", label: "Fuel Log", icon: Fuel },
  { href: "/driver/inspection", label: "Inspection", icon: ClipboardCheck },
  { href: "/driver/emergency", label: "Emergency", icon: Siren },
];

function navForRole(role: string | undefined): { items: NavItem[]; title: string; subtitle: string } {
  if (role === "driver") return { items: DRIVER_NAV, title: "Driver Portal", subtitle: "TN Bus+ Crew" };
  return { items: CONDUCTOR_NAV, title: "Conductor Portal", subtitle: "TN Bus+ Crew" };
}

function NavList({
  items,
  location,
  onNavigate,
}: {
  items: NavItem[];
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {items.map((item) => {
        const active = location === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { items, title, subtitle } = navForRole(user?.role);

  const Header = () => (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
        <BadgeCheck className="w-5 h-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-extrabold text-sm text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );

  const Footer = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="px-3 pb-4 shrink-0 space-y-1">
      <button
        onClick={() => {
          onNavigate?.();
          void logout();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to site
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-14 h-[calc(100vh-3.5rem)]">
        <Header />
        <NavList items={items} location={location} />
        <Footer />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80%] bg-white shadow-xl h-full">
            <Header />
            <NavList items={items} location={location} onNavigate={() => setOpen(false)} />
            <Footer onNavigate={() => setOpen(false)} />
          </aside>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="fixed top-3 right-3 z-50 w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-14 z-30 flex items-center gap-3 h-12 px-4 bg-white border-b border-slate-200">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Bus className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-sm text-slate-800">{title}</span>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
