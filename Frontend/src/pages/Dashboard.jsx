import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import WorkourBanner from "../components/Dashboard/WorkourBanner";
import AccuracyCard from "../components/Dashboard/AccuracyCard";
import WorkoutStreak from "../components/Dashboard/WorkoutStreak";
import { useWorkout } from "../Context/WorkoutContext";

const Dashboard = () => {
  const { stats } = useWorkout();

  return (
    <AppShell footer={<Footer />}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,.8fr)]">
        <WorkourBanner />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <AccuracyCard
            accuracy={stats.accuracy}
            hasAccuracyData={stats.hasAccuracyData}
            totalPredictions={stats.totalPredictions}
          />
          <WorkoutStreak
            currentStreak={stats.currentStreak}
            bestStreak={stats.bestStreak}
            completedDays={stats.completedDays}
            weeklyGoal={stats.weeklyGoal}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;

