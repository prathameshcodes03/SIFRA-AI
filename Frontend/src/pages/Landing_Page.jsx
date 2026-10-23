import { useState, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Camera,
  Dumbbell,
  Target,
  Zap,
  Cpu,
  Layers,
  Eye,
  Volume2,
  Play,
  Sparkles,
  Quote,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FitnessModelScene from "../components/Landing/FitnessModelScene";
import { useAuth } from "../Context/AuthContext";

import StudioFitnessPose from "../assets/models/studio_fitness_pose.glb";
import Pushups from "../assets/Videos/Pushups.mp4";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Choose an exercise",
    desc: "Select from supported exercises — squats, push-ups, or planks — and configure your sets and reps.",
  },
  {
    step: "02",
    title: "Start a camera-based workout",
    desc: "Your webcam captures your movement. MediaPipe detects your pose in real time, right in the browser.",
  },
  {
    step: "03",
    title: "Review feedback and results",
    desc: "Receive instant form feedback and voice coaching during the session. Review accuracy and streaks after.",
  },
];

const MARQUEE_ITEMS = [
  "AI FITNESS COACHING",
  "REAL-TIME POSE DETECTION",
  "SMART REP COUNTING",
  "FORM FEEDBACK",
  "VOICE COACHING",
  "WORKOUT TRACKING",
];

/* ─────────────────────────────────────────────────────────────
   VERIFIED QUOTES
   Sources verified via brainyquote.com, goodreads.com, and
   published interviews.
───────────────────────────────────────────────────────────── */
const QUOTES = [
  {
    text: "Strength does not come from winning. Your struggles develop your strengths.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    text: "The pain of discipline is far less than the pain of regret.",
    author: "Jim Rohn",
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Motivation gets you going, but discipline keeps you growing.",
    author: "John C. Maxwell",
  },
  {
    text: "It is not the mountain we conquer, but ourselves.",
    author: "Sir Edmund Hillary",
  },
  {
    text: "Confidence comes from discipline and training.",
    author: "Robert Kiyosaki",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant",
  },
];

export default function Landing_Page() {
  const { user } = useAuth();
  const modelRef = useRef(null);
  const heroRef = useRef(null);
  const modelContainerRef = useRef(null);
  const floatingPanelsRef = useRef([]);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Refs for "How It Works" section animation
  const howItWorksRef = useRef(null);
  const howItWorksHeadingRef = useRef(null);
  const howItWorksLineRef = useRef(null);
  const howItWorksMarkersRef = useRef([]);
  const howItWorksTextsRef = useRef([]);

  // Refs for Capabilities showcase animation
  const showcaseCardRef = useRef(null);
  const tabContentRef = useRef(null);

  // Refs for "Detect → Analyze → Coach" flow animation
  const processFlowRef = useRef(null);
  const processHeadingRef = useRef(null);
  const processLineRef = useRef(null);
  const processStagesRef = useRef([]);
  const processIconsRef = useRef([]);
  const [activeTab, setActiveTab] = useState("pose");
  const [repCount, setRepCount] = useState(0);

  // Manual rotation state
  const manualRotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartRotationRef = useRef(0);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animate rep counter when reps tab is active
  useLayoutEffect(() => {
    if (activeTab !== "reps" || reducedMotion) {
      setRepCount(0);
      return;
    }
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setRepCount(count);
      if (count >= 12) {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [activeTab, reducedMotion]);

  // Scroll-linked model rotation + floating panel parallax
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const hero = heroRef.current;
    if (!hero) return;

    // Scroll-linked model rotation (combines scroll + manual offset)
    const modelTrigger = ScrollTrigger.create({
      id: "hero-scroll",
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: 0.8,
      onUpdate: (self) => {
        const progress = self.progress;
        const scrollRotation = progress * Math.PI * 2.5;
        const totalRotation = scrollRotation + manualRotationRef.current;
        modelRef.current?.setTransform(0, totalRotation, 0, 0);
      },
    });

    // Floating panel parallax + opacity transitions
    floatingPanelsRef.current.forEach((panel, i) => {
      if (!panel) return;
      const speed = 0.2 + i * 0.1;
      gsap.to(panel, {
        y: () => -ScrollTrigger.maxScroll(window) * speed * 0.03,
        opacity: (i < 2) ? 1 : () => gsap.utils.interpolate(1, 0.4, ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        }).progress),
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    // Section fade-in reveals
    const sections = gsap.utils.toArray(".reveal-section");
    sections.forEach((section) => {
      gsap.fromTo(
        section,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => {
      modelTrigger.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [reducedMotion]);

  // Manual drag rotation (desktop only)
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const container = modelContainerRef.current;
    if (!container) return;

    const handlePointerDown = (e) => {
      if (e.target.closest("button, a, input")) return;
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartRotationRef.current = manualRotationRef.current;
      container.style.cursor = "grabbing";
    };

    const handlePointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - dragStartXRef.current;
      const rotationDelta = deltaX * 0.005;
      manualRotationRef.current = dragStartRotationRef.current + rotationDelta;

      const hero = heroRef.current;
      if (hero) {
        const scrollTrigger = ScrollTrigger.getById("hero-scroll");
        const scrollProgress = scrollTrigger ? scrollTrigger.progress : 0;
        const scrollRotation = scrollProgress * Math.PI * 2.5;
        modelRef.current?.setTransform(0, scrollRotation + manualRotationRef.current, 0, 0);
      }
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        container.style.cursor = "grab";
      }
    };

    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (!isDesktop) return;

    container.style.cursor = "grab";
    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [reducedMotion]);

  // ── Section animations: How It Works + Detect/Analyze/Coach + Showcase ──
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // ── A. "Three steps to better training" ──
      const hiw = howItWorksRef.current;
      if (hiw) {
        const heading = howItWorksHeadingRef.current;
        const line = howItWorksLineRef.current;
        const markers = howItWorksMarkersRef.current.filter(Boolean);
        const texts = howItWorksTextsRef.current.filter(Boolean);

        if (heading) {
          gsap.fromTo(
            heading,
            { opacity: 0, y: 22 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: hiw,
                start: "top 78%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (line) {
          gsap.fromTo(
            line,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 1.0,
              ease: "power2.inOut",
              transformOrigin: "left center",
              scrollTrigger: {
                trigger: hiw,
                start: "top 72%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        markers.forEach((marker, i) => {
          gsap.fromTo(
            marker,
            { opacity: 0, scale: 0.85 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.5,
              delay: 0.15 + i * 0.12,
              ease: "power2.out",
              scrollTrigger: {
                trigger: hiw,
                start: "top 72%",
                toggleActions: "play none none none",
              },
              onStart: () => {
                gsap.to(marker, {
                  boxShadow: "0 0 0 4px rgba(99,102,241,0.15)",
                  duration: 0.3,
                  yoyo: true,
                  repeat: 1,
                });
              },
            }
          );
        });

        texts.forEach((text, i) => {
          gsap.fromTo(
            text,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              delay: 0.2 + i * 0.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: hiw,
                start: "top 72%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }

      // ── B. Capabilities showcase card entrance ──
      const showcase = showcaseCardRef.current;
      if (showcase) {
        gsap.fromTo(
          showcase,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: showcase,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
      }

      // Visual panel glow shift removed (no target element assigned)

      // ── C. "Detect → Analyze → Coach" flow ──
      const flow = processFlowRef.current;
      if (flow) {
        const pHeading = processHeadingRef.current;
        const pLine = processLineRef.current;
        const pStages = processStagesRef.current.filter(Boolean);
        const pIcons = processIconsRef.current.filter(Boolean);

        if (pHeading) {
          gsap.fromTo(
            pHeading,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: flow,
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (pLine) {
          gsap.fromTo(
            pLine,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.9,
              ease: "power2.inOut",
              transformOrigin: "left center",
              scrollTrigger: {
                trigger: flow,
                start: "top 75%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        pStages.forEach((stage, i) => {
          gsap.fromTo(
            stage,
            { opacity: 0, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              delay: 0.15 + i * 0.15,
              ease: "power2.out",
              scrollTrigger: {
                trigger: flow,
                start: "top 75%",
                toggleActions: "play none none none",
              },
            }
          );
        });

        pIcons.forEach((icon, i) => {
          gsap.fromTo(
            icon,
            { opacity: 0.6, scale: 0.96 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.4,
              delay: 0.2 + i * 0.15,
              ease: "power2.out",
              scrollTrigger: {
                trigger: flow,
                start: "top 75%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }
    });

    return () => ctx.revert();
  }, [reducedMotion]);

  // ── Tab transition animation ──
  useLayoutEffect(() => {
    if (reducedMotion || !tabContentRef.current) return;
    const panels = tabContentRef.current.querySelectorAll("[role='tabpanel']");
    panels.forEach((panel) => {
      if (!panel.hidden) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
        );
      }
    });
  }, [activeTab, reducedMotion]);

  const handleModelLoaded = () => {
    setModelLoaded(true);
  };

  const addPanelRef = (el, index) => {
    floatingPanelsRef.current[index] = el;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-[#FAFAFF] text-slate-900 selection:bg-indigo-500/30 selection:text-indigo-900">
      <Navbar />

      <main id="main" className="relative">
        {/* ═════════════════════════════════════════════════════
            STAGE A: HERO
        ══════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative min-h-screen overflow-hidden px-6 pt-28 pb-16 sm:px-10 lg:px-16"
        >
          {/* Atmospheric background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-indigo-400/15 blur-[140px]" />
            <div className="absolute top-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-400/10 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-400/8 blur-[100px]" />
          </div>

          {/* Subtle grid overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] [background-size:64px_64px]" />

          <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
            {/* Hero Copy */}
            <div className="relative z-10 text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>AI-Powered Fitness Coaching</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
                Your personal
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  AI fitness coach.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
                Train smarter. Track every rep. Improve your form with AI-powered
                workout guidance.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to={user ? "/WorkoutPlan" : "/Register"}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-[0.98] sm:w-auto"
                >
                  <span>Start Training</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("product-showcase")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 py-3 text-sm font-semibold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:border-indigo-300 hover:bg-white active:scale-[0.98] sm:w-auto"
                >
                  <span>Explore SIFRA</span>
                </button>
              </div>

              <p className="mt-6 text-xs text-slate-500">
                No equipment required. Works in your browser.
              </p>
            </div>

            {/* 3D Model + Floating Panels */}
            <div
              ref={modelContainerRef}
              className="relative mx-auto h-[420px] w-full max-w-md sm:h-[520px] lg:h-[640px] lg:max-w-none"
            >
              {/* Loading spinner */}
              {!modelLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                </div>
              )}

              {/* 3D Model */}
              <div className="absolute inset-0">
                <FitnessModelScene
                  ref={modelRef}
                  modelUrl={StudioFitnessPose}
                  variant="hero"
                  onModelLoaded={handleModelLoaded}
                />
              </div>

              {/* Floating UI Panels */}
              <div
                ref={(el) => addPanelRef(el, 0)}
                className="absolute top-8 left-4 z-20 hidden sm:block"
              >
                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md shadow-lg shadow-slate-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      AI Pose Detection
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-800">33 landmarks tracked</p>
                </div>
              </div>

              <div
                ref={(el) => addPanelRef(el, 1)}
                className="absolute top-16 right-4 z-20 hidden sm:block"
              >
                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md shadow-lg shadow-slate-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Rep Count
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900">12</p>
                </div>
              </div>

              <div
                ref={(el) => addPanelRef(el, 2)}
                className="absolute bottom-24 left-6 z-20 hidden md:block"
              >
                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md shadow-lg shadow-slate-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Form Feedback
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-28 rounded-full bg-slate-200">
                    <div className="h-1.5 w-4/5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                  </div>
                </div>
              </div>

              <div
                ref={(el) => addPanelRef(el, 3)}
                className="absolute bottom-16 right-6 z-20 hidden md:block"
              >
                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md shadow-lg shadow-slate-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      AI Coach
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-800">Voice cue active</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            2. MARQUEE (Feature strip)
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-y border-slate-200 bg-white py-5">
          <style>{`
            @keyframes marqueeScroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              display: flex;
              width: max-content;
              animation: marqueeScroll 24s linear infinite;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
            @media (prefers-reduced-motion: reduce) {
              .marquee-track {
                animation: none;
              }
            }
          `}</style>
          <div className="marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="mx-8 flex items-center gap-3 whitespace-nowrap text-sm font-semibold tracking-[0.12em] text-slate-400"
              >
                <span className="text-indigo-500">✳</span>
                <span>{item}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            3. PRODUCT SHOWCASE
        ══════════════════════════════════════════════════════ */}
        <section
          id="product-showcase"
          className="reveal-section relative px-6 py-24 sm:px-10 lg:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-2xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Product
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Train with real-time AI guidance
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                SIFRA uses your webcam to detect your pose, count repetitions,
                assess your form, and provide voice coaching — all without
                leaving your browser.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="ml-2 text-xs text-slate-400">SIFRA AI — Workout Session</span>
              </div>

              {/* Video */}
              <div className="relative">
                <video
                  className="w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src={Pushups} type="video/mp4" />
                </video>

                {/* Overlay labels */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm shadow-sm">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Pose Detection Active
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm shadow-sm">
                    Rep Count: 12
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm shadow-sm">
                    Form: Good
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            4. CAPABILITIES — Alternating Layout
        ══════════════════════════════════════════════════════ */}
        <section
          id="capabilities"
          className="reveal-section relative bg-[#F5F3FF] px-6 py-24 sm:px-10 lg:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-2xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Capabilities
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything you need to train smarter
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Built on computer vision and machine learning, running entirely
                in your browser.
              </p>
            </div>

            {/* ── Interactive Feature Showcase ── */}
            <div ref={showcaseCardRef} className="mb-16">
              <div className="mb-8 text-center sm:text-left">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Your workout. Understood.
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  See how SIFRA transforms movement into actionable workout feedback.
                </p>
              </div>

              {/* Tab controls */}
              <div
                role="tablist"
                aria-label="Feature showcase"
                className="mb-6 flex flex-wrap gap-2"
              >
                {[
                  { id: "pose", label: "Pose Intelligence" },
                  { id: "reps", label: "Smart Repetitions" },
                  { id: "form", label: "Form Feedback" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              <div ref={tabContentRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Pose Intelligence */}
                <div
                  role="tabpanel"
                  id="panel-pose"
                  aria-labelledby="tab-pose"
                  hidden={activeTab !== "pose"}
                  className="p-6 sm:p-8"
                >
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">
                        Pose Intelligence
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        SIFRA uses MediaPipe to detect 33 body landmarks in real
                        time, directly in your browser. No wearables, no extra
                        hardware — just your webcam and AI.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>33-point skeletal landmark tracking</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Runs entirely client-side via WebGL</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Sub-second pose estimation latency</span>
                        </li>
                      </ul>
                    </div>
                    {/* Illustration: clean landmark dots (no skeleton lines) */}
                    <div className="flex items-center justify-center">
                      <div className="relative h-48 w-32 rounded-2xl bg-gradient-to-b from-indigo-50 to-violet-50 border border-indigo-100 p-4">
                        {[
                          { x: 50, y: 8 }, { x: 50, y: 16 }, { x: 40, y: 22 },
                          { x: 60, y: 22 }, { x: 35, y: 34 }, { x: 65, y: 34 },
                          { x: 50, y: 36 }, { x: 42, y: 48 }, { x: 58, y: 48 },
                          { x: 40, y: 62 }, { x: 60, y: 62 }, { x: 38, y: 78 },
                          { x: 62, y: 78 },
                        ].map((pt, i) => (
                          <div
                            key={i}
                            className="absolute h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]"
                            style={{
                              left: `${pt.x}%`,
                              top: `${pt.y}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        ))}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-medium text-indigo-400">
                          Preview
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Repetitions */}
                <div
                  role="tabpanel"
                  id="panel-reps"
                  aria-labelledby="tab-reps"
                  hidden={activeTab !== "reps"}
                  className="p-6 sm:p-8"
                >
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">
                        Smart Repetitions
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Reps and sets are counted automatically using phase
                        detection. The tracker identifies concentric and eccentric
                        movements to count only complete repetitions.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Phase-based rep counting (up/down)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Set tracking with configurable targets</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Supports squats, push-ups, and planks</span>
                        </li>
                      </ul>
                    </div>
                    {/* Animated rep counter preview */}
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col items-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-violet-50 px-8 py-6">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                          Preview
                        </p>
                        <p className="mt-2 text-5xl font-bold text-indigo-600 tabular-nums">
                          {repCount}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Reps Completed
                        </p>
                        <div className="mt-4 h-2 w-32 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                            style={{ width: `${(repCount / 12) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Feedback */}
                <div
                  role="tabpanel"
                  id="panel-form"
                  aria-labelledby="tab-form"
                  hidden={activeTab !== "form"}
                  className="p-6 sm:p-8"
                >
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">
                        Form Feedback
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Each completed repetition is evaluated using rule-based
                        form assessment and, where available, machine learning
                        classification. Feedback is delivered as instant coaching
                        cues via voice.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Per-repetition form scoring</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Rule-based + ML assessment</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                          <span>Voice coaching cues in real time</span>
                        </li>
                      </ul>
                    </div>
                    {/* Feedback preview */}
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Preview
                        </p>
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700">
                            Good form — keep it up!
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            Go deeper on next rep
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">
                          Feedback updates per completed repetition.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Three-Step Intelligence Flow ── */}
            <div ref={processFlowRef} className="mt-16">
              <div ref={processHeadingRef} className="mb-8">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  How SIFRA processes your movement
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  A three-stage pipeline from camera input to coaching output.
                </p>
              </div>

              <div className="relative">
                {/* Connecting line (desktop) */}
                <div
                  ref={processLineRef}
                  className="absolute top-10 left-0 hidden h-px w-full origin-left bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200 md:block"
                  style={{ transform: "scaleX(0)" }}
                />

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
                  {[
                    {
                      step: "01",
                      title: "DETECT",
                      desc: "MediaPipe identifies 33 body landmarks from your webcam feed in real time. No wearables required.",
                      icon: Eye,
                    },
                    {
                      step: "02",
                      title: "ANALYZE",
                      desc: "Exercise-specific logic evaluates movement phases, joint angles, and repetition completion. Rule-based and ML assessment where available.",
                      icon: Zap,
                    },
                    {
                      step: "03",
                      title: "COACH",
                      desc: "Instant coaching cues are delivered via voice and on-screen feedback. Form scores are tracked per repetition.",
                      icon: Volume2,
                    },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.step}
                        ref={(el) => { processStagesRef.current[index] = el; }}
                        className="relative"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            ref={(el) => { processIconsRef.current[index] = el; }}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50"
                          >
                            <Icon className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="text-xs font-bold tracking-wider text-indigo-400">
                            {item.step}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">
                          {item.title}
                        </h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                          {item.desc}
                        </p>
                        {index < 2 && (
                          <div className="mt-4 h-px w-full bg-indigo-200 md:hidden" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            5. HOW IT WORKS
        ══════════════════════════════════════════════════════ */}
        <section
          ref={howItWorksRef}
          id="how-it-works"
          className="reveal-section relative bg-white px-6 py-24 sm:px-10 lg:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div ref={howItWorksHeadingRef} className="mb-16 max-w-2xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
                How It Works
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Three steps to better training
              </h2>
            </div>

            {/* Connected step sequence */}
            <div className="relative">
              {/* Connecting line (desktop) */}
              <div
                ref={howItWorksLineRef}
                className="absolute top-8 left-0 hidden h-px w-full origin-left bg-gradient-to-r from-transparent via-indigo-300 to-transparent md:block"
                style={{ transform: "scaleX(0)" }}
              />

              <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
                {HOW_IT_WORKS.map((item, index) => (
                  <div
                    key={item.step}
                    ref={(el) => { howItWorksTextsRef.current[index] = el; }}
                    className="relative"
                  >
                    {/* Step number circle */}
                    <div className="mb-6 flex items-center gap-4 md:flex-col md:items-start md:gap-0">
                      <div
                        ref={(el) => { howItWorksMarkersRef.current[index] = el; }}
                        className="flex h-16 w-16 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-2xl font-bold text-indigo-600"
                      >
                        {item.step}
                      </div>
                      {index < HOW_IT_WORKS.length - 1 && (
                        <div className="h-px w-full bg-indigo-200 md:hidden" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            6. QUOTE MARQUEE (replaces Technology section)
        ══════════════════════════════════════════════════════ */}
        <section id="quote-marquee" className="reveal-section relative overflow-hidden bg-gradient-to-b from-[#F5F3FF] to-white px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Mindset Matters
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Stronger habits. Stronger you.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Every rep is a step toward becoming stronger.
              </p>
            </div>
          </div>

          {/* Quote marquee row 1 */}
          <div className="relative mb-6">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#F5F3FF] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent" />

            <style>{`
              @keyframes quoteScroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              @keyframes quoteScrollReverse {
                0% { transform: translateX(-50%); }
                100% { transform: translateX(0); }
              }
              .quote-track {
                display: flex;
                width: max-content;
                animation: quoteScroll 40s linear infinite;
              }
              .quote-track-reverse {
                display: flex;
                width: max-content;
                animation: quoteScrollReverse 45s linear infinite;
              }
              .quote-track:hover,
              .quote-track-reverse:hover {
                animation-play-state: paused;
              }
              @media (prefers-reduced-motion: reduce) {
                .quote-track,
                .quote-track-reverse {
                  animation: none;
                }
              }
            `}</style>

            <div className="quote-track">
              {[...QUOTES, ...QUOTES].map((q, i) => (
                <div
                  key={i}
                  className="mx-4 flex w-[340px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:w-[400px]"
                >
                  <Quote className="mb-3 h-5 w-5 text-indigo-300" />
                  <p className="flex-1 text-sm font-medium leading-relaxed text-slate-700">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <p className="mt-4 text-xs font-semibold text-indigo-600">
                    — {q.author}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quote marquee row 2 (reverse) */}
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#F5F3FF] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent" />

            <div className="quote-track-reverse">
              {[...QUOTES.slice().reverse(), ...QUOTES.slice().reverse()].map((q, i) => (
                <div
                  key={i}
                  className="mx-4 flex w-[340px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:w-[400px]"
                >
                  <Quote className="mb-3 h-5 w-5 text-violet-300" />
                  <p className="flex-1 text-sm font-medium leading-relaxed text-slate-700">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <p className="mt-4 text-xs font-semibold text-violet-600">
                    — {q.author}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            7. FINAL CTA
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden px-6 py-24 sm:px-10 lg:px-16">
          {/* Gradient background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 via-[#FAFAFF] to-violet-100/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Ready to train smarter?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Start your first AI-guided workout session in seconds. No
              equipment, no downloads.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={user ? "/WorkoutPlan" : "/Register"}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-[0.98] sm:w-auto"
              >
                <span>Start Training</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to={user ? "/Dashboard" : "/Login"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
              >
                <span>{user ? "Go to Dashboard" : "Sign In"}</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}