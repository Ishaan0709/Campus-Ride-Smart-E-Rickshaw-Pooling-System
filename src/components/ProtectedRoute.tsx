// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: "student" | "driver" | "admin";
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const currentUser = useAppStore((s) => s.currentUser);

  // If no user is logged in, redirect to home
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // If user's role doesn't match the allowed role, redirect to their own dashboard
  if (currentUser.role !== allowedRole) {
    // Redirect each role to their own dashboard
    switch (currentUser.role) {
      case "student":
        return <Navigate to="/student-dashboard" replace />;
      case "driver":
        return <Navigate to="/driver-dashboard" replace />;
      case "admin":
        return <Navigate to="/admin-dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // If role matches, show the protected content
  return <>{children}</>;
}