import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

/**
 * Blocks unauthenticated access.
 * Shows nothing while auth is still loading (avoids flash).
 * Redirects to /Login if not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  return children;
}
