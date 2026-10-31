import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Exercises from "../components/Workout/Exercises";
import TodayWorkout from "../components/Workout/TodayWorkout";

const WorkoutPlan = () => (
  <AppShell footer={<Footer />}>
    <a href="#dashboard-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
      Skip to main content
    </a>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Exercises />
      <TodayWorkout />
    </div>
  </AppShell>
);
export default WorkoutPlan;
