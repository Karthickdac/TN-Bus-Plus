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
import Assistant from "@/pages/Assistant";
import Search from "@/pages/Search";
import BusDetail from "@/pages/BusDetail";
import Book from "@/pages/Book";
import Confirmation from "@/pages/Confirmation";
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
import AdminPOS from "@/pages/admin/AdminPOS";
import ComingSoon from "@/pages/admin/ComingSoon";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Settings, ScrollText } from "lucide-react";
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
          <Route path="/assistant" component={Assistant} />
          <Route path="/login" component={Login} />
          <Route path="/search" component={Search} />
          <Route path="/bus/:id" component={BusDetail} />
          <Route path="/book" component={Book} />
          <Route path="/booking/:id" component={Confirmation} />
          <Route path="/pnr" component={PNR} />
          <Route path="/track/:busId" component={Track} />
          <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
          <Route path="/dashboard/trips">{() => <ProtectedRoute component={Trips} />}</Route>
          <Route path="/dashboard/wallet">{() => <ProtectedRoute component={WalletPage} />}</Route>
          <Route path="/dashboard/profile">{() => <ProtectedRoute component={Profile} />}</Route>
          <Route path="/admin">{() => <AdminLayout><AdminDashboard /></AdminLayout>}</Route>
          <Route path="/admin/pos">{() => <AdminLayout><AdminPOS /></AdminLayout>}</Route>
          <Route path="/admin/fleet">{() => <AdminLayout><AdminFleet /></AdminLayout>}</Route>
          <Route path="/admin/bookings">{() => <AdminLayout><AdminBookings /></AdminLayout>}</Route>
          <Route path="/admin/revenue">{() => <AdminLayout><AdminRevenue /></AdminLayout>}</Route>
          <Route path="/admin/complaints">{() => <AdminLayout><AdminComplaints /></AdminLayout>}</Route>
          <Route path="/admin/users">
            {() => (
              <AdminLayout>
                <ComingSoon
                  title="Users & Roles"
                  description="Manage staff accounts, assign roles, and control access permissions across the platform."
                  icon={Users}
                />
              </AdminLayout>
            )}
          </Route>
          <Route path="/admin/settings">
            {() => (
              <AdminLayout>
                <ComingSoon
                  title="System Settings"
                  description="Configure platform-wide settings, fares, booking rules, and operational defaults."
                  icon={Settings}
                />
              </AdminLayout>
            )}
          </Route>
          <Route path="/admin/audit">
            {() => (
              <AdminLayout>
                <ComingSoon
                  title="Audit Logs"
                  description="Review a complete history of administrative actions and system events for compliance."
                  icon={ScrollText}
                />
              </AdminLayout>
            )}
          </Route>
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
