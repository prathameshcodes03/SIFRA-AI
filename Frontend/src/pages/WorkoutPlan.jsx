import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Exercises from "../components/Workout/Exercises";
import TodayWorkout from "../components/Workout/TodayWorkout";

const WorkoutPlan = () => (
  <AppShell footer={<Footer />}>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Exercises />
      <TodayWorkout />
    </div>
  </AppShell>
);
export default WorkoutPlan;
