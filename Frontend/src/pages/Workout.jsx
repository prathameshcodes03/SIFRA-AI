import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Camerafeed from "../components/Workout/Camerafeed";
import VoiceFeedback from "../components/Workout/VoiceFeedback";

const Workout = () => (
  <AppShell footer={<Footer />}>
    <div className="space-y-4">
      <Camerafeed />
      <VoiceFeedback />
    </div>
  </AppShell>
);
export default Workout;
