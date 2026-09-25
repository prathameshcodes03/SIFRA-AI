import { useRef, useState, useLayoutEffect } from "react";
import gsap from "gsap";
import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Star,
  Quote,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FitnessModelScene from "../components/Landing/FitnessModelScene";

import Speaking from "../assets/Audio/Speaking.mp3";
import StudioFitnessPose from "../assets/models/studio_fitness_pose.glb";
import AvaSteele from "../assets/models/ava_steele_athletic_female_weightlifter.glb";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   TELEMETRY DATA (Interactive Biomechanical Simulation)
───────────────────────────────────────────────────────────── */
const EXERCISES = {
  squat: { label: "Squat", joint: "Knee Flexion", defaultAngle: 90, min: 45, max: 140 },
  pushup: { label: "Push-up", joint: "Elbow Angle", defaultAngle: 90, min: 45, max: 140 },
  plank: { label: "Plank", joint: "Spine Linearity", defaultAngle: 165, min: 140, max: 180 },
};

const getTelemetry = (ex, angle) => ({
  squat: {
    name: "Barbell Back Squat",
    score: angle <= 90 ? "98%" : "84%",
    status: angle <= 90 ? "Optimal Depth" : "Go Deeper",
    cue: angle <= 90 ? "Excellent depth! Drive through mid-foot." : "Lower hips 8° more to hit parallel.",
    ok: angle <= 90,
  },
  pushup: {
    name: "Standard Push-Up",
    score: angle <= 85 ? "99%" : "81%",
    status: angle <= 85 ? "Full Range" : "Descend Lower",
    cue: angle <= 85 ? "Chest touches ground plane. Lock core." : "Break parallel with elbows tucked at 45°.",
    ok: angle <= 85,
  },
  plank: {
    name: "Isometric Plank",
    score: angle >= 170 ? "96%" : "78%",
    status: angle >= 170 ? "Neutral Alignment" : "Sagging Hip",
    cue: angle >= 170 ? "Hold stable! Glutes & abs contracted." : "Elevate pelvis slightly to prevent lumbar load.",
    ok: angle >= 170,
  },
}[ex]);

/* ─────────────────────────────────────────────────────────────
   TESTIMONIALS / WHAT PEOPLE SAY (For bottom marquee)
───────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Dr. Marcus Vance",
    role: "Sports Biomechanics Researcher",
    text: "SIFRA's real-time 33-point kinematic tracking matches laboratory motion-capture fidelity at 30+ FPS.",
    rating: 5,
  },
  {
    name: "Elena Rostova",
    role: "Olympic Lifting Coach",
    text: "The audio cues fire in under 600ms. My lifters immediately correct bar path deviations on heavy sets.",
    rating: 5,
  },
  {
    name: "Karan Mehta",
    role: "CrossFit Athlete",
    text: "The automatic rep-cadence and depth detection completely eliminated subjective no-reps in my gym.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    role: "Physical Therapist & DPT",
    text: "Visualizing joint angles live on camera gives patients instant biofeedback for ACL rehab squats.",
    rating: 5,
  },
  {
    name: "David Lindqvist",
    role: "Strength & Conditioning Specialist",
    text: "Best form verification software built for web. Clean, responsive, and insanely precise.",
    rating: 5,
  },
];

/* ─────────────────────────────────────────────────────────────
   TECH MARQUEE ITEMS
───────────────────────────────────────────────────────────── */
const TECH_PILLS = [
  "MediaPipe 33-Keypoint Extraction",
  "Sub-30ms Pose Latency",
  "Zero Hardware Sensors Required",
  "Real-Time Rep Cadence Detection",
  "Voice Coaching Synthesis",
  "Biomechanical Angle Analysis",
  "Kinematic ML v2.4 Engine",
  "Adaptive Training Calibration",
];

export default function Landing_Page() {
  const pinRef = useRef(null);
  const modelRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const currentMotionRef = useRef({ x: -1.85, rotY: 0 });

  const [simExercise, setSimExercise] = useState("squat");
  const [simAngle, setSimAngle] = useState(90);
  const sim = getTelemetry(simExercise, simAngle);

  const [featuresComplete, setFeaturesComplete] = useState(false);
  const featuresCompleteRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    slideRef.current = currentSlide;
  }, [currentSlide]);

  useEffect(() => {
    featuresCompleteRef.current = featuresComplete;
  }, [featuresComplete]);

  /* ───────────────────────────────────────────────────────────
     STRICT SCROLL LOCK UNTIL ALL FEATURES COMPLETE:
     The document is 100% prevented from scrolling until Feature 03
     is fully reached and completed.
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!featuresComplete) {
      document.body.style.overflowY = "hidden";
      document.documentElement.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    }

    return () => {
      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    };
  }, [featuresComplete]);

  const goToSlide = (nextIndex) => {
    if (nextIndex < 0 || nextIndex > 3) return;

    const slides = gsap.utils.toArray(".timeline-slide");
    const getXOffset = () => {
      const w = window.innerWidth;
      if (w < 1024) return 1.35;
      if (w < 1280) return 1.6;
      return 1.85;
    };
    const targetX = getXOffset();

    // Slide 0: Model LEFT (-targetX), rot 0
    // Slide 1: Model RIGHT (+targetX), rot 2pi (360°)
    // Slide 2: Model LEFT (-targetX), rot 4pi (720°)
    // Slide 3: Model RIGHT (+targetX), rot 6pi (1080°)
    const configs = [
      { x: -targetX, rotY: 0 },
      { x: targetX, rotY: Math.PI * 2 },
      { x: -targetX, rotY: Math.PI * 4 },
      { x: targetX, rotY: Math.PI * 6 },
    ];

    const targetCfg = configs[nextIndex];

    // Smoothly crossfade slides
    slides.forEach((slide, i) => {
      if (i === nextIndex) {
        gsap.to(slide, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
        });
      } else {
        gsap.to(slide, {
          autoAlpha: 0,
          y: i < nextIndex ? -20 : 20,
          scale: 0.98,
          duration: 0.45,
          ease: "power2.inOut",
        });
      }
    });

    // Smoothly animate model position and roll
    gsap.to(currentMotionRef.current, {
      x: targetCfg.x,
      rotY: targetCfg.rotY,
      duration: 0.85,
      ease: "power2.inOut",
      onUpdate: () => {
        modelRef.current?.setTransform(
          currentMotionRef.current.x,
          currentMotionRef.current.rotY,
          0,
          0
        );
      },
    });

    setCurrentSlide(nextIndex);

    // Only allow page to scroll once user reaches Feature 03 (Slide 3)
    if (nextIndex === 3) {
      setTimeout(() => {
        featuresCompleteRef.current = true;
        setFeaturesComplete(true);
      }, 700);
    } else {
      featuresCompleteRef.current = false;
      setFeaturesComplete(false);
    }
  };

  // Wheel, touch, and keyboard gesture listeners
  useEffect(() => {
    let touchStartY = 0;

    const handleWheel = (e) => {
      // If user has already scrolled down into lower sections of page
      if (window.scrollY > 30) return;

      // While features are NOT complete: lock page and only cycle slides
      if (!featuresCompleteRef.current) {
        e.preventDefault();

        // Scrolling DOWN
        if (e.deltaY > 15) {
          if (isAnimatingRef.current) return;
          if (slideRef.current < 3) {
            isAnimatingRef.current = true;
            goToSlide(slideRef.current + 1);
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 600);
          }
        }
        // Scrolling UP
        else if (e.deltaY < -15) {
          if (isAnimatingRef.current) return;
          if (slideRef.current > 0) {
            isAnimatingRef.current = true;
            goToSlide(slideRef.current - 1);
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 600);
          }
        }
      } else {
        // Features are complete (Slide 3)
        // If scrolling UP at the top of the page, cycle backward into features
        if (window.scrollY <= 10 && e.deltaY < -20) {
          e.preventDefault();
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;
          goToSlide(2);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, 600);
        }
        // If scrolling DOWN, page scrolls naturally into lower sections
      }
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (window.scrollY > 30) return;
      const touchY = e.touches[0].clientY;
      const diff = touchStartY - touchY;

      if (!featuresCompleteRef.current) {
        if (e.cancelable) e.preventDefault();
        if (diff > 35) {
          if (isAnimatingRef.current) return;
          if (slideRef.current < 3) {
            isAnimatingRef.current = true;
            goToSlide(slideRef.current + 1);
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 600);
          }
        } else if (diff < -35) {
          if (isAnimatingRef.current) return;
          if (slideRef.current > 0) {
            isAnimatingRef.current = true;
            goToSlide(slideRef.current - 1);
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 600);
          }
        }
      } else {
        if (window.scrollY <= 10 && diff < -40) {
          if (e.cancelable) e.preventDefault();
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;
          goToSlide(2);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, 600);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (window.scrollY > 30) return;

      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        if (!featuresCompleteRef.current && slideRef.current < 3) {
          e.preventDefault();
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;
          goToSlide(slideRef.current + 1);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, 600);
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (window.scrollY <= 10 && slideRef.current > 0) {
          e.preventDefault();
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;
          goToSlide(slideRef.current - 1);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, 600);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Initial setup for slides
  useLayoutEffect(() => {
    const slides = gsap.utils.toArray(".timeline-slide");
    gsap.set(slides, { autoAlpha: 0, y: 25, scale: 0.98 });
    gsap.set(slides[0], { autoAlpha: 1, y: 0, scale: 1 });
  }, []);

  const changeExercise = (ex) => {
    setSimExercise(ex);
    setSimAngle(EXERCISES[ex].defaultAngle);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* ── Layered Atmospheric Glass Glow Spheres (Continuous Across Entire Page) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/4 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-indigo-300/35 via-violet-300/25 to-transparent blur-[160px]" />
        <div className="absolute top-1/4 -right-28 h-[650px] w-[650px] rounded-full bg-gradient-to-bl from-violet-300/30 via-pink-300/20 to-transparent blur-[150px]" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-indigo-200/25 blur-[140px]" />
        <div className="absolute top-2/3 -left-28 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-sky-300/35 via-cyan-200/25 to-transparent blur-[150px]" />
        <div className="absolute bottom-10 right-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tl from-indigo-200/35 via-violet-200/20 to-transparent blur-[140px]" />
      </div>

      <Navbar />

      <main id="main" className="relative z-10">

        {/* ═════════════════════════════════════════════════════
            1. HERO + FEATURES PINNED EXPERIENCE (Sticky 3D)
        ══════════════════════════════════════════════════════ */}
        <section
          id="home-features-pin"
          ref={pinRef}
          className="relative h-screen w-full overflow-hidden"
        >
          {/* Subtle Ambient Grid & Frosted Overlay */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-50" />
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
          </div>

          {/* ── Fixed Desktop 3D Canvas (Pinned In Viewport) ── */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
            <div className="h-full w-full">
              <FitnessModelScene
                ref={modelRef}
                modelUrl={StudioFitnessPose}
                variant="unified-journey"
                scrollTriggerElement={pinRef.current}
                onModelLoaded={() => ScrollTrigger.refresh()}
              />
            </div>
          </div>

          {/* ── Timeline Slides Container (Stacked on Top of Model) ── */}
          <div className="relative z-20 h-full w-full md:absolute md:inset-0 pointer-events-none">

            {/* SLIDE 0 — HERO */}
            <div
              id="home"
              className="timeline-slide relative md:absolute md:inset-0 flex h-full w-full items-center px-6 sm:px-10 lg:px-16 pointer-events-auto"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2">
                {/* Mobile model */}
                <div className="order-2 block h-[380px] w-full sm:h-[450px] md:hidden">
                  <FitnessModelScene modelUrl={StudioFitnessPose} variant="hero" />
                </div>

                {/* Desktop placeholder for 3D model on the LEFT */}
                <div className="hidden md:block" />

                {/* Hero Copy (RIGHT side) */}
                <div className="order-1 pt-6 text-center md:pt-0 md:text-left">
                  {/* Frosted Eyebrow Badge */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-white/80">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    <span>Real-Time Biomechanical AI</span>
                  </div>

                  {/* Main Title */}
                  <h1 className="max-w-xl text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                    Your AI Coach. <span className="text-indigo-600">Every Rep Perfected.</span>
                  </h1>

                  {/* Description */}
                  <p className="mt-4 max-w-lg text-sm sm:text-base font-normal leading-relaxed text-slate-600">
                    Instant computer vision pose correction, automatic rep counting, and voice feedback coaching — directly in your browser.
                  </p>

                  {/* Glass Action Buttons */}
                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
                    <Link
                      to="/Workout"
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-600/35 active:scale-[0.98] sm:w-auto"
                    >
                      <span>Start Workout Station</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/WorkoutPlan"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-2xl ring-1 ring-white/60 transition-all duration-200 hover:border-slate-300 hover:bg-white active:scale-[0.98] sm:w-auto"
                    >
                      <span>Build Custom Plan</span>
                    </Link>
                  </div>

                  {/* Mini feature status indicator */}
                  <div className="mt-6 flex items-center justify-center md:justify-start gap-4 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Zero Sensors Required</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-indigo-600" />
                      <span>Sub-30ms Latency</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 1 — FEATURE 01: FORM ACCURACY (Text on LEFT, Model on RIGHT) */}
            <div
              id="features"
              className="timeline-slide relative md:absolute md:inset-0 flex h-full w-full items-center px-6 sm:px-10 lg:px-16 pointer-events-auto"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  {/* Heavy Frosted Glass Feature Card */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/90 bg-white/65 p-7 sm:p-9 shadow-xl shadow-slate-200/40 backdrop-blur-3xl ring-1 ring-white/70">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />

                    <span className="mb-3 inline-block rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 backdrop-blur-md">
                      Feature 01
                    </span>

                    <h2 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      98% Form Accuracy
                    </h2>

                    <p className="max-w-md text-sm sm:text-base leading-relaxed text-slate-600">
                      Real-time AI posture analysis powered by high-frequency computer vision. Detects deviations in knee travel, spine linearity, and hip depth to keep your joints protected.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-2">
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        33 Joint Landmarks
                      </span>
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        Sub-Degree Precision
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>

            {/* SLIDE 2 — FEATURE 02: SMART REP COUNTING (Text on RIGHT, Model on LEFT) */}
            <div className="timeline-slide relative md:absolute md:inset-0 flex h-full w-full items-center px-6 sm:px-10 lg:px-16 pointer-events-auto">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="hidden md:block" />

                <div className="text-center md:text-left">
                  {/* Heavy Frosted Glass Feature Card */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/90 bg-white/65 p-7 sm:p-9 shadow-xl shadow-slate-200/40 backdrop-blur-3xl ring-1 ring-white/70">
                    <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

                    <span className="mb-3 inline-block rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 backdrop-blur-md">
                      Feature 02
                    </span>

                    <h2 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      Smart Rep Counting
                    </h2>

                    <p className="max-w-md text-sm sm:text-base leading-relaxed text-slate-600">
                      Automatically tracks cadence, concentric and eccentric tempos, and enforces true full range-of-motion. Zero manual keyboard or screen taps required during sets.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-2">
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        Automated Ingestion
                      </span>
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        Cadence Velocity
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 3 — FEATURE 03: VOICE COACHING (Text on LEFT, Model on RIGHT) */}
            <div className="timeline-slide relative md:absolute md:inset-0 flex h-full w-full items-center px-6 sm:px-10 lg:px-16 pointer-events-auto">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  {/* Heavy Frosted Glass Feature Card */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/90 bg-white/65 p-7 sm:p-9 shadow-xl shadow-slate-200/40 backdrop-blur-3xl ring-1 ring-white/70">
                    <div className="pointer-events-none absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />

                    <span className="mb-3 inline-block rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 backdrop-blur-md">
                      Feature 03
                    </span>

                    <h2 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      Real-Time Voice Coaching
                    </h2>

                    <p className="max-w-md text-sm sm:text-base leading-relaxed text-slate-600">
                      Receive instant audio coaching cues tuned to your exact technique flaws — just like having an elite personal trainer right in your corner.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-2">
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        Sub-Second Audio Cue
                      </span>
                      <span className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl">
                        Adaptive Motivation
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>

          </div>

          {/* Interactive Slide Pills Indicator */}
          <div className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full border border-white/90 bg-white/75 p-1.5 shadow-sm backdrop-blur-2xl ring-1 ring-white/70">
            {[
              { id: 0, label: "Overview" },
              { id: 1, label: "01 Form" },
              { id: 2, label: "02 Reps" },
              { id: 3, label: "03 Voice" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSlide(item.id)}
                className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  currentSlide === item.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                {item.label}
              </button>
            ))}

            {featuresComplete && (
              <button
                type="button"
                onClick={() => {
                  document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="cursor-pointer ml-1 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800 active:scale-95 animate-in fade-in duration-300"
              >
                <span>Explore ↓</span>
              </button>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            2. FAST TECH SPEC MARQUEE STRIP
        ══════════════════════════════════════════════════════ */}
        <div className="relative z-20 overflow-hidden border-y border-white/80 bg-white/60 py-3.5 backdrop-blur-2xl">
          <style>{`
            @keyframes marqueeLoop {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .tech-marquee-track {
              display: flex;
              width: max-content;
              animation: marqueeLoop 30s linear infinite;
            }
            .tech-marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="tech-marquee-track">
            {[...TECH_PILLS, ...TECH_PILLS].map((item, i) => (
              <span
                key={i}
                className="mx-6 flex items-center gap-3 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════
            3. LIVE TELEMETRY SIMULATOR SECTION
        ══════════════════════════════════════════════════════ */}
        <section id="simulator" className="relative px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-10 max-w-xl">
              <span className="mb-3 inline-block rounded-full border border-white/80 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm backdrop-blur-xl">
                Live Simulator
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Target Joint Telemetry
              </h2>
              <p className="mt-3 text-slate-600">
                Adjust the telemetry angle slider below to experience how SIFRA live evaluates joint kinematics in real time.
              </p>
            </div>

            {/* Exercise Selector Buttons */}
            <div className="mb-7 flex flex-wrap gap-2.5">
              {Object.entries(EXERCISES).map(([key, ex]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeExercise(key)}
                  className={`cursor-pointer rounded-2xl border px-5 py-2.5 text-sm font-semibold transition-all ${
                    simExercise === key
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-600/25"
                      : "border-white/90 bg-white/70 text-slate-700 backdrop-blur-2xl hover:border-indigo-300 hover:bg-white"
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* 3 Telemetry Data Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Telemetry Meter Slider */}
              <div className="rounded-3xl border border-white/90 bg-white/60 p-7 shadow-2xl shadow-slate-200/50 backdrop-blur-3xl ring-1 ring-white/60">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Joint Telemetry
                </span>
                <div className="mb-4 text-2xl font-bold text-slate-900">
                  {sim.name}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between font-mono text-xs text-slate-600">
                      <span>{EXERCISES[simExercise].joint}</span>
                      <span className="font-bold text-indigo-600">{simAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={EXERCISES[simExercise].min}
                      max={EXERCISES[simExercise].max}
                      value={simAngle}
                      onChange={(e) => setSimAngle(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/80 pt-2 text-xs">
                    <span className="text-slate-500">Biomechanical Score</span>
                    <span className="font-mono text-sm font-bold text-emerald-600">
                      {sim.score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Status Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/60 p-7 shadow-2xl shadow-slate-200/50 backdrop-blur-3xl ring-1 ring-white/60">
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kinematic Classification
                  </span>
                  <div className="text-xl font-bold text-slate-900">Form Status</div>
                </div>

                <div className="my-5">
                  <div
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${
                      sim.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {sim.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span>{sim.status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100/80 pt-2 text-xs">
                  <span className="text-slate-500">Active Joint Target:</span>
                  <span className="font-semibold text-slate-700">
                    {EXERCISES[simExercise].joint}
                  </span>
                </div>
              </div>

              {/* Real-Time Tactical Feedback */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/60 p-7 shadow-2xl shadow-slate-200/50 backdrop-blur-3xl ring-1 ring-white/60">
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    AI Tactical Feedback
                  </span>
                  <div className="text-xl font-bold text-slate-900">Coaching Cue</div>
                </div>

                <p className="my-5 border-l-2 border-indigo-500 pl-3.5 text-sm font-medium italic leading-relaxed text-slate-700">
                  &ldquo;{sim.cue}&rdquo;
                </p>

                <div className="flex items-center justify-between border-t border-slate-100/80 pt-2 text-xs">
                  <span className="text-slate-500">Audio Synthesis Engine:</span>
                  <span className="font-semibold text-indigo-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            4. PAGE 2: INTERACTIVE AI TRAINER (Ava Steele)
        ══════════════════════════════════════════════════════ */}
        <section
          id="trainer"
          data-model-section
          className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:px-16"
        >
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              <span>Next-Gen AI Trainer</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Meet Your AI <span className="text-indigo-600">Personal Coach</span>
            </h2>

            <p className="mt-4 max-w-xl text-sm sm:text-base font-normal leading-relaxed text-slate-600">
              Available 24/7 with real-time biometric feedback, adaptive training programs, and interactive 3D motion analytics.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <button
                type="button"
                onClick={() => {
                  const audio = new Audio(Speaking);
                  audio.play();
                }}
                className="cursor-pointer rounded-2xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 active:scale-[0.98]"
              >
                Listen to Sifra
              </button>
            </div>
          </div>

          {/* Interactive 3D Model Card */}
          <div className="group relative h-[480px] w-full rounded-3xl border border-white/90 bg-white/60 p-2 shadow-2xl shadow-indigo-500/10 backdrop-blur-3xl ring-1 ring-white/60 transition-all duration-500 hover:border-indigo-300 lg:h-[620px]">
            <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/90 bg-white/85 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-2xl">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
              <span>Interactive 3D • Move cursor or drag</span>
            </div>

            <FitnessModelScene modelUrl={AvaSteele} variant="workout" />
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            5. TESTIMONIALS MARQUEE: "WHAT PEOPLE SAY"
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-t border-white/80 bg-white/40 py-20 backdrop-blur-3xl">
          <div className="mx-auto mb-12 max-w-7xl px-6 text-center sm:px-10">
            <span className="mb-3 inline-block rounded-full border border-white/80 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm backdrop-blur-xl">
              Community & Coaches
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              What Athletes & Coaches Say
            </h2>
            <p className="mt-3 text-slate-600">
              Trusted by strength athletes, physical therapists, and performance coaches worldwide.
            </p>
          </div>

          <style>{`
            @keyframes testimonialScroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .testimonial-track {
              display: flex;
              width: max-content;
              animation: testimonialScroll 36s linear infinite;
            }
            .testimonial-track:hover {
              animation-play-state: paused;
            }
          `}</style>

          <div className="testimonial-track py-2">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, index) => (
              <div
                key={index}
                className="mx-4 w-[360px] sm:w-[420px] rounded-3xl border border-white/90 bg-white/70 p-6 sm:p-7 shadow-xl shadow-slate-200/40 backdrop-blur-2xl ring-1 ring-white/60 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300"
              >
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm font-medium leading-relaxed text-slate-700">
                  &ldquo;{t.text}&rdquo;
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100/80 pt-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                  <Quote className="h-6 w-6 text-indigo-200" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}
