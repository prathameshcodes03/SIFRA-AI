import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import PageTransition  from "./components/PageTransition";
import ProtectedRoute  from "./components/ProtectedRoute";
import ErrorBoundary   from "./components/ErrorBoundary";

const Landing_Page = lazy(() => import("./pages/Landing_Page"));
const NotFound     = lazy(() => import("./pages/NotFound"));
const Login        = lazy(() => import("./pages/Login"));
const Register     = lazy(() => import("./pages/Register"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Profile      = lazy(() => import("./pages/Profile"));
const Workout      = lazy(() => import("./pages/Workout"));
const WorkoutPlan  = lazy(() => import("./pages/WorkoutPlan"));

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFC]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  );
}

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <PageTransition key={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
          {/* Public */}
          <Route path="/"             element={<Landing_Page/>}/>

          <Route path="/Login"        element={<Login />} />
          <Route path="/Register"     element={<Register />} />

          {/* Protected — require auth */}
          <Route path="/Dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/Workout"      element={<ProtectedRoute><Workout /></ProtectedRoute>} />
          <Route path="/WorkoutPlan"  element={<ProtectedRoute><WorkoutPlan /></ProtectedRoute>} />
          <Route path="/Profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*"             element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
    </ErrorBoundary>
  );
}

export default App;
