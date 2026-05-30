import { useState, type ReactNode, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Bus,
  Ticket,
  BarChart3,
  AlertCircle,
  CreditCard,
  Radio,
  Route as RouteIcon,
  Users,
  Settings,
  ScrollText,
  ShieldCheck,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { label: string; badge?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Administration",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/pos", label: "POS Booking", icon: CreditCard },
      { href: "/admin/fleet", label: "Fleet Management", icon: Bus },
      { href: "/admin/gps", label: "Live GPS", icon: Radio },
      { href: "/admin/routes", label: "Route Management", icon: RouteIcon },
      { href: "/admin/bookings", label: "Bookings", icon: Ticket },
      { href: "/admin/revenue", label: "Revenue Analytics", icon: BarChart3 },
      { href: "/admin/complaints", label: "Complaints", icon: AlertCircle },
    ],
  },
  {
    label: "Super Admin",
    badge: "Elevated",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: Users },
      { href: "/admin/settings", label: "System Settings", icon: Settings },
      { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

function NavList({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {GROUPS.map(group => (
        <div key={group.label}>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            {group.badge && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {group.badge}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {group.items.map(item => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
        <ShieldCheck className="w-5 h-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-extrabold text-sm text-slate-900">Admin Console</p>
        <p className="text-[11px] text-slate-400">TN Bus+ Control</p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-14 h-[calc(100vh-3.5rem)]">
        <SidebarHeader />
        <NavList location={location} />
        <div className="px-3 pb-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80%] bg-white shadow-xl h-full">
            <SidebarHeader />
            <NavList location={location} onNavigate={() => setOpen(false)} />
            <div className="px-3 pb-4 shrink-0">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to site
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-14 z-30 flex items-center gap-3 h-12 px-4 bg-white border-b border-slate-200">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-slate-800">Admin Console</span>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* close icon affordance is the overlay; X kept for a11y on small screens */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          aria-label="Close admin menu"
          className="lg:hidden fixed top-3 right-3 z-50 w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
