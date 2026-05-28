import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg tracking-tighter">TN</span>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
            TN Bus<span className="text-primary">+</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Routes
          </Link>
          <Link href="/pnr" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            PNR Status
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Button variant="outline" className="hidden sm:inline-flex border-primary/20 hover:bg-primary/10">
            Admin
          </Button>
        </nav>
      </div>
    </header>
  );
}