import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, roleHome, type UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  component: React.ComponentType;
  // When set, only these roles may view the route. Other signed-in users are
  // bounced to their own role home; signed-out users go to /login.
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      setLocation(roleHome(user.role));
    }
  }, [loading, user, allowedRoles, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <Component />;
}
