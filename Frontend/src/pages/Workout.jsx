import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Camerafeed from "../components/Workout/Camerafeed";
import VoiceFeedback from "../components/Workout/VoiceFeedback";

const Workout = () => (
  <AppShell footer={<Footer />}>
    <div className="mx-auto w-full max-w-4xl space-y-3 sm:space-y-4">
      <Camerafeed />
      <VoiceFeedback />
    </div>
  </AppShell>
);
export default Workout;
