import { useRef, useState, useLayoutEffect } from "react";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Speaking from "../assets/Audio/Speaking.mp3";
import StudioFitnessPose from "../assets/models/studio_fitness_pose.glb";
import AvaSteele from "../assets/models/ava_steele_athletic_female_weightlifter.glb";
import FitnessModelScene from "../components/Landing/FitnessModelScene";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, CheckCircle2, AlertCircle } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const telemetryData = {
  squat: {
    name: "Squat",
    joint: "Knee Angle",
    defaultAngle: 90,
  },
  pushup: {
    name: "Push-up",
    joint: "Elbow Angle",
    defaultAngle: 90,
  },
  plank: {
    name: "Plank",
    joint: "Body Angle",
    defaultAngle: 165,
  },
};

const Landing_Page = () => {
  const pinRef = useRef(null);
  const modelRef = useRef(null);

  const [simExercise, setSimExercise] = useState("squat");
  const [simAngle, setSimAngle] = useState(telemetryData.squat.defaultAngle);

  // Dynamic telemetry metrics computed using simAngle
  const exerciseConfigs = {
    squat: {
      name: "Barbell Back Squat",
      joint: "Knee Flexion",
      angle: simAngle,
      status: simAngle <= 90 ? "Optimal Depth" : "Go Deeper",
      cue: simAngle <= 90 ? "Excellent depth! Drive through mid-foot." : "Lower hips 8° more to hit parallel.",
      score: simAngle <= 90 ? "98%" : "84%",
      color: simAngle <= 90 ? "emerald" : "amber",
    },
    pushup: {
      name: "Standard Push-Up",
      joint: "Elbow Angle",
      angle: simAngle,
      status: simAngle <= 85 ? "Full Range" : "Descend Lower",
      cue: simAngle <= 85 ? "Chest touches ground plane. Lock core." : "Break parallel with elbows tucked at 45°.",
      score: simAngle <= 85 ? "99%" : "81%",
      color: simAngle <= 85 ? "emerald" : "amber",
    },
    plank: {
      name: "Isometric Plank",
      joint: "Spine Linearity",
      angle: simAngle,
      status: simAngle >= 170 ? "Neutral Alignment" : "Sagging Hip",
      cue: simAngle >= 170 ? "Hold stable! Glutes & abs contracted." : "Elevate pelvis slightly to prevent lumbar load.",
      score: simAngle >= 170 ? "96%" : "78%",
      color: simAngle >= 170 ? "emerald" : "rose",
    },
  };

  const activeConfig = exerciseConfigs[simExercise];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray(".timeline-slide");
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        gsap.set(slides, {
          opacity: 0,
          y: 50,
          scale: 0.96,
        });

        gsap.set(slides[0], {
          opacity: 1,
          y: 0,
          scale: 1,
        });

        const modelMotion = {
          x: -1.85,
          rotY: 0,
        };

        const syncModel = () => {
          modelRef.current?.setTransform(
            modelMotion.x,
            modelMotion.rotY,
            0
          );
        };

        const moveModel = (x, fullRotation, position = "<") => {
          tl.to(
            modelMotion,
            {
              x,
              rotY: fullRotation,
              duration: 1,
              ease: "power2.inOut",
              onUpdate: syncModel,
            },
            position
          );
        };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top top",
            end: "+=360%",
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        syncModel();

        // Hero -> Feature 01
        tl.to(slides[0], {
          opacity: 0,
          y: -40,
          scale: 0.96,
          duration: 1,
          ease: "power2.inOut",
        }).to(
          slides[1],
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power2.inOut",
          },
          "<0.2"
        );

        moveModel(1.85, Math.PI * 2, "<");

        // Feature 01 -> Feature 02
        tl.to(
          slides[1],
          {
            opacity: 0,
            y: -40,
            scale: 0.96,
            duration: 1,
            ease: "power2.inOut",
          },
          "+=0.25"
        ).to(
          slides[2],
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power2.inOut",
          },
          "<0.2"
        );

        moveModel(-1.85, Math.PI * 4, "<");

        // Feature 02 -> Feature 03
        tl.to(
          slides[2],
          {
            opacity: 0,
            y: -40,
            scale: 0.96,
            duration: 1,
            ease: "power2.inOut",
          },
          "+=0.25"
        ).to(
          slides[3],
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power2.inOut",
          },
          "<0.2"
        );

        moveModel(1.85, Math.PI * 6, "<");
      });

      mm.add("(max-width: 767px)", () => {
        gsap.set(slides, {
          clearProps: "all",
        });
      });

      return () => mm.revert();
    }, pinRef);

    return () => ctx.revert();
  }, []);

  const handleExerciseChange = (exercise) => {
    setSimExercise(exercise);
    setSimAngle(telemetryData[exercise].defaultAngle);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FAFAFC] font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main id="main">
        {/* UNIFIED HERO + FEATURES PINNED EXPERIENCE */}
        <section
          id="home-features-pin"
          ref={pinRef}
          className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[#FAFAFC] md:h-screen"
        >
          {/* Ambient background */}
          <div className="pointer-events-none absolute inset-0 md:sticky md:top-0 md:h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.06),transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
          </div>

          {/* Persistent 3D model */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
            <FitnessModelScene
              ref={modelRef}
              modelUrl={StudioFitnessPose}
              variant="unified-journey"
              scrollTriggerElement={pinRef.current}
            />
          </div>

          {/* Timeline slides */}
          <div className="relative z-20 space-y-16 py-10 md:absolute md:inset-0 md:space-y-0 md:py-0">
            {/* Slide 0: Hero */}
            <div
              id="home"
              className="timeline-slide relative flex min-h-[85svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="order-2 block h-[380px] w-full sm:h-[460px] md:hidden">
                  <FitnessModelScene modelUrl={StudioFitnessPose} variant="hero" />
                </div>

                <div className="hidden md:block" />

                <div className="order-1 pt-12 text-center md:pt-0 md:text-left">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm backdrop-blur-md">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
                    Next-Gen Fitness Intelligence
                  </div>

                  <h1 className="inline-block max-w-3xl text-[clamp(2.3rem,6.5vw,4.8rem)] font-extrabold leading-[1.08] tracking-tight text-slate-900">
                    <span>Your AI Coach.</span>{" "}
                    <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
                      Every Rep Perfected.
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-[clamp(1.05rem,2.5vw,1.3rem)] font-normal leading-relaxed text-slate-600 sm:mt-7">
                    Real-time computer vision pose correction, automatic rep counting, and personalized biometric coaching.
                  </p>

                  <div className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row md:justify-start">
                    <Link
                      to="/Workout"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98] sm:w-auto"
                    >
                      <span>Start Workout Station</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      to="/WorkoutPlan"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white active:scale-[0.98] sm:w-auto"
                    >
                      <span>Build Custom Plan</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 1: Feature 01 */}
            <div
              id="features"
              className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  {/* Particular Feature Div with Glassmorphism + Blur Effect */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
                    {/* Glow behind the feature content */}
                    <div className="pointer-events-none absolute -left-10 -top-10 -z-10 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />
                    
                    <span className="mb-4 inline-block rounded-full border border-violet-200 bg-violet-50/80 px-3.5 py-1 text-xs font-semibold tracking-wider text-violet-700 backdrop-blur-md">
                      FEATURE 01
                    </span>
                    <h2 className="mb-4 text-[clamp(2.1rem,6vw,4.5rem)] font-extrabold leading-tight tracking-tight text-slate-900 sm:mb-6">
                      98% Form Accuracy
                    </h2>
                    <p className="max-w-xl text-[clamp(1.05rem,2.5vw,1.3rem)] font-normal leading-relaxed text-slate-600">
                      Real-time AI posture analysis powered by high-frequency computer vision for injury prevention and flawless execution.
                    </p>
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>

            {/* Slide 2: Feature 02 */}
            <div className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="hidden md:block" />
                <div className="text-center md:text-left">
                  {/* Particular Feature Div with Glassmorphism + Blur Effect */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
                    {/* Glow behind the feature content */}
                    <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />

                    <span className="mb-4 inline-block rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1 text-xs font-semibold tracking-wider text-sky-700 backdrop-blur-md">
                      FEATURE 02
                    </span>
                    <h2 className="mb-4 text-[clamp(2.1rem,6vw,4.5rem)] font-extrabold leading-tight tracking-tight text-slate-900 sm:mb-6">
                      Smart Rep Counting
                    </h2>
                    <p className="max-w-xl text-[clamp(1.05rem,2.5vw,1.3rem)] font-normal leading-relaxed text-slate-600">
                      Automatically tracks cadence, concentric/eccentric speed, and full range-of-motion without manual inputs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 3: Feature 03 */}
            <div className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  {/* Particular Feature Div with Glassmorphism + Blur Effect */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
                    {/* Glow behind the feature content */}
                    <div className="pointer-events-none absolute -left-10 -bottom-10 -z-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

                    <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold tracking-wider text-emerald-700 backdrop-blur-md">
                      FEATURE 03
                    </span>
                    <h2 className="mb-4 text-[clamp(2.1rem,6vw,4.5rem)] font-extrabold leading-tight tracking-tight text-slate-900 sm:mb-6">
                      Voice Coaching
                    </h2>
                    <p className="max-w-xl text-[clamp(1.05rem,2.5vw,1.3rem)] font-normal leading-relaxed text-slate-600">
                      Receive instant audio coaching cues and tactical encouragement just like having an elite trainer beside you.
                    </p>
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>
          </div>
        </section>

        {/* Live Telemetry Section */}
        <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
          <div className="mb-8 max-w-2xl">
            <span className="mb-3 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Live Analytics
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Live Telemetry
            </h2>
            <p className="mt-3 text-slate-600">
              Explore how SIFRA presents exercise-specific joint telemetry and biomechanical feedback in real time.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {Object.keys(telemetryData).map((exercise) => (
              <button
                key={exercise}
                type="button"
                onClick={() => handleExerciseChange(exercise)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition-all ${
                  simExercise === exercise
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {exercise === "pushup" ? "Push-up" : exercise}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Control Panel */}
            <div className="rounded-2xl border border-white/80 bg-white/40 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-2xl">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Joint Telemetry
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                  <Activity className="h-3.5 w-3.5 animate-pulse" /> Live
                </span>
              </div>
              <div className="mb-4 text-2xl font-bold text-slate-900">
                {activeConfig.name}
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex justify-between font-mono text-xs text-slate-600">
                    <span>{activeConfig.joint}</span>
                    <span className="font-bold text-indigo-600">{simAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={simExercise === "plank" ? 140 : 45}
                    max={simExercise === "plank" ? 180 : 140}
                    value={simAngle}
                    onChange={(e) => setSimAngle(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs">
                  <span className="text-slate-500">Biomechanical Score</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {activeConfig.score}
                  </span>
                </div>
              </div>
            </div>

            {/* Pose Evaluation Box */}
            <div className="rounded-2xl border border-white/80 bg-white/40 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pose Evaluation
                </span>
                <div className="text-lg font-bold text-slate-900">Form Status</div>
              </div>

              <div className="my-4">
                <div
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    activeConfig.color === "emerald"
                      ? "bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 backdrop-blur-md"
                      : activeConfig.color === "amber"
                      ? "bg-amber-50/80 text-amber-700 border border-amber-200/80 backdrop-blur-md"
                      : "bg-rose-50/80 text-rose-700 border border-rose-200/80 backdrop-blur-md"
                  }`}
                >
                  {activeConfig.color === "emerald" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{activeConfig.status}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-3 text-xs text-slate-500 flex justify-between">
                <span>Joint Target:</span>
                <span className="font-semibold text-slate-700">{activeConfig.joint}</span>
              </div>
            </div>

            {/* Tactical Feedback Box */}
            <div className="rounded-2xl border border-white/80 bg-white/40 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Tactical Feedback
                </span>
                <div className="text-lg font-bold text-slate-900">Coaching Cue</div>
              </div>

              <p className="my-4 text-sm font-medium leading-relaxed text-slate-700 italic border-l-2 border-indigo-500 pl-3">
                "{activeConfig.cue}"
              </p>

              <div className="border-t border-slate-200/60 pt-3 text-xs text-slate-500 flex justify-between">
                <span>Audio Synthesis:</span>
                <span className="font-semibold text-indigo-600">Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* PAGE 2: TRAINER SECTION */}
        <section
          id="trainer"
          data-model-section
          className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 text-slate-900 sm:px-8 lg:grid-cols-2 lg:px-10"
        >
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
              Next-Gen AI Trainer
            </div>

            <h2 className="text-[clamp(2.4rem,7vw,4.8rem)] font-extrabold leading-[1.1] tracking-tight text-slate-900">
              <span>Meet Your AI</span>
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
                Personal Coach
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-[clamp(1.05rem,2.5vw,1.35rem)] font-normal leading-relaxed text-slate-600 sm:mt-8">
              Available 24/7 with real-time biometric feedback, adaptive training programs, and interactive 3D motion analytics.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <button
                onClick={() => {
                  const audio = new Audio(Speaking);
                  audio.play();
                }}
                className="w-full max-w-xs cursor-pointer rounded-2xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 sm:w-auto"
              >
                Listen to Sifra
              </button>
            </div>
          </div>

          <div className="group relative h-[480px] w-full rounded-3xl border border-white/80 bg-white/30 p-2 shadow-2xl shadow-slate-300/30 backdrop-blur-3xl backdrop-saturate-200 transition-all duration-500 hover:border-indigo-300 lg:h-[620px]">
            <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
              <span>Interactive 3D • Move cursor or drag</span>
            </div>

            <FitnessModelScene modelUrl={AvaSteele} variant="workout" />
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
};

export default Landing_Page;