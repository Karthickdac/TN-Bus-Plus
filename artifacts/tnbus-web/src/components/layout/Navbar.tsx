import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, User, Wallet, Sparkles, Sun, Moon, Bell, Heart, History, RefreshCcw, Ticket } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { lang, setLang, t } = useLang();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const passengerId = user?.id ?? 0;

  const { data: notifications } = useListNotifications(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListNotificationsQueryKey(passengerId) },
  });
  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length;

  const navLink = (href: string, label: string) => {
    const active = location === href || location.startsWith(href + "/");
    return (
      <Link href={href}
        className={`text-sm font-medium transition-colors px-1 py-0.5 ${active ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"}`}>
        {label}
      </Link>
    );
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-orange-500 flex items-center justify-center shadow shadow-indigo-200 dark:shadow-none">
            <span className="text-white font-extrabold text-sm tracking-tighter">TN</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-slate-100">TN Bus<span className="text-indigo-600 dark:text-indigo-400">+</span></span>
          </div>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          {navLink("/search", t.routes)}
          <Link href="/assistant"
            className={`hidden sm:inline-flex items-center gap-1 text-sm font-medium transition-colors px-1 py-0.5 ${location === "/assistant" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"}`}>
            <Sparkles className="w-3.5 h-3.5 text-violet-500" /> {t.assistant}
          </Link>
          {navLink("/pnr", t.pnrStatus)}
          {user && navLink("/dashboard", t.dashboard)}

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-amber-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            <Sun className="w-4 h-4 hidden dark:block" />
            <Moon className="w-4 h-4 block dark:hidden" />
          </button>

          {/* Notifications bell */}
          {user && (
            <Link href="/dashboard/notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border-2 border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
              title="Notifications" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Tamil / English"
          >
            {lang === "en" ? (
              <><span className="text-base leading-none">அ</span> தமிழ்</>
            ) : (
              <><span className="text-base leading-none">A</span> English</>
            )}
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2 text-indigo-500" /> My Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/trips")} className="cursor-pointer">
                  <Ticket className="w-4 h-4 mr-2 text-emerald-500" /> My Trips
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/saved")} className="cursor-pointer">
                  <Heart className="w-4 h-4 mr-2 text-rose-500" /> Saved Routes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/history")} className="cursor-pointer">
                  <History className="w-4 h-4 mr-2 text-sky-500" /> Travel History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/refunds")} className="cursor-pointer">
                  <RefreshCcw className="w-4 h-4 mr-2 text-blue-500" /> Refunds
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/passes")} className="cursor-pointer">
                  <Ticket className="w-4 h-4 mr-2 text-violet-500" /> Travel Passes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard/wallet")} className="cursor-pointer">
                  <Wallet className="w-4 h-4 mr-2 text-orange-500" />
                  Wallet · ₹{Number(user.walletBalance).toFixed(0)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                  <ShieldCheck className="w-4 h-4 mr-2 text-slate-400" /> {t.admin}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="h-8 text-xs border-indigo-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {t.admin}
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
