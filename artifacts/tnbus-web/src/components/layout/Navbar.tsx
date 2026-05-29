import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Navbar() {
  const [location] = useLocation();
  const { lang, setLang, t } = useLang();

  const navLink = (href: string, label: string) => {
    const active = location === href || location.startsWith(href + "/");
    return (
      <Link href={href}
        className={`text-sm font-medium transition-colors px-1 py-0.5 ${active ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-600 hover:text-indigo-600"}`}>
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-orange-500 flex items-center justify-center shadow shadow-indigo-200">
            <span className="text-white font-extrabold text-sm tracking-tighter">TN</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-extrabold text-lg tracking-tight text-slate-800">TN Bus<span className="text-indigo-600">+</span></span>
          </div>
        </Link>

        <nav className="flex items-center gap-5">
          {navLink("/search", t.routes)}
          {navLink("/pnr", t.pnrStatus)}
          {navLink("/dashboard", t.dashboard)}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
            title="Toggle Tamil / English"
          >
            {lang === "en" ? (
              <><span className="text-base leading-none">அ</span> தமிழ்</>
            ) : (
              <><span className="text-base leading-none">A</span> English</>
            )}
          </button>

          <Link href="/admin">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {t.admin}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
