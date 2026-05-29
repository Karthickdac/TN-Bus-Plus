import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Navbar from "@/components/layout/Navbar";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import BusDetail from "@/pages/BusDetail";
import Book from "@/pages/Book";
import PNR from "@/pages/PNR";
import Track from "@/pages/Track";
import Dashboard from "@/pages/Dashboard";
import Trips from "@/pages/Trips";
import WalletPage from "@/pages/WalletPage";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminFleet from "@/pages/admin/AdminFleet";
import AdminBookings from "@/pages/admin/AdminBookings";
import AdminRevenue from "@/pages/admin/AdminRevenue";
import AdminComplaints from "@/pages/admin/AdminComplaints";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/search" component={Search} />
          <Route path="/bus/:id" component={BusDetail} />
          <Route path="/book" component={Book} />
          <Route path="/pnr" component={PNR} />
          <Route path="/track/:busId" component={Track} />
          <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
          <Route path="/dashboard/trips">{() => <ProtectedRoute component={Trips} />}</Route>
          <Route path="/dashboard/wallet">{() => <ProtectedRoute component={WalletPage} />}</Route>
          <Route path="/dashboard/profile">{() => <ProtectedRoute component={Profile} />}</Route>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/fleet" component={AdminFleet} />
          <Route path="/admin/bookings" component={AdminBookings} />
          <Route path="/admin/revenue" component={AdminRevenue} />
          <Route path="/admin/complaints" component={AdminComplaints} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LanguageProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
