import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import WorkourBanner from "../components/Dashboard/WorkourBanner";
import AccuracyCard from "../components/Dashboard/AccuracyCard";
import WorkoutStreak from "../components/Dashboard/WorkoutStreak";

const Dashboard = () => <AppShell footer={<Footer />}><div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,.8fr)]"><WorkourBanner /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1"><AccuracyCard /><WorkoutStreak /></div></div></AppShell>;
export default Dashboard;
