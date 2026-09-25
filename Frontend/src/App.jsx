import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Landing_Page  from "./pages/Landing_Page";
import NotFound      from "./pages/NotFound";
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import Dashboard     from "./pages/Dashboard";
import Profile       from "./pages/Profile";
import Workout       from "./pages/Workout";
import WorkoutPlan   from "./pages/WorkoutPlan";
import PageTransition  from "./components/PageTransition";
import ProtectedRoute  from "./components/ProtectedRoute";

function App() {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
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
    </PageTransition>
  );
}

export default App;
