import { useState, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Star,
  Camera,
  Dumbbell,
  Target,
  Zap,
  Cpu,
  Layers,
  Eye,
  Volume2,
  Sparkles,
  Quote,
  Flame,
  TrendingUp,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MacBookScene from "../components/Landing/MacBookScene";
import DumbbellScene from "../components/Landing/DumbbellScene";
import { useAuth } from "../Context/AuthContext";
import macbookModel from "../assets/models/macbook.glb";
import dumbbellModel from "../assets/models/dumbell.glb";
import macbookVideo from "../assets/Videos/MAcbookVideo.mp4";

gsap.registerPlugin(ScrollTrigger);

const LAPTOP_FEATURES = [
  {
    step: "01",
    tag: "Pose Intelligence",
    title: "Real-Time 33-Keypoint Vision",
    desc: "MediaPipe pose detection tracks 33 body landmarks from your webcam directly in the browser. No sensors or wearables required.",
    icon: Eye,
  },
  {
    step: "02",
    tag: "Smart Repetitions",
    title: "Concentric & Eccentric Cadence",
    desc: "Autonomous phase analysis validates full range of motion and registers completed reps only at proper biomechanical depth.",
    icon: Dumbbell,
  },
  {
    step: "03",
    tag: "Form Feedback",
    title: "Live Joint Angle Assessment",
    desc: "Continuous angular evaluation verifies knee flexion, hip alignment, and spine linearity per repetition.",
    icon: Target,
  },
  {
    step: "04",
    tag: "Voice Coach",
    title: "Instant Audio Feedback",
    desc: "Optional voice cues surface form feedback while you train, alongside on-screen coaching.",
    icon: Volume2,
  },
  {
    step: "05",
    tag: "Workout Tracking",
    title: "Progress, Volume & Streaks",
    desc: "Completed sessions store exercise targets, judged form accuracy, and workout streak progress.",
    icon: TrendingUp,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    label: "Step 1",
    title: "Start Your Workout",
    desc: "Choose an exercise and begin your workout with SIFRA AI. Configure sets, targets, and voice preferences.",
    icon: Sparkles,
  },
  {
    step: "02",
    label: "Step 2",
    title: "AI Tracks Your Movement",
    desc: "Camera-based pose estimation helps SIFRA analyze your body movement during exercise with 33 anatomical keypoints.",
    icon: Camera,
  },
  {
    step: "03",
    label: "Step 3",
    title: "Count Repetitions",
    desc: "SIFRA tracks exercise movements to help count completed repetitions using phase-based motion inflections.",
    icon: Dumbbell,
  },
  {
    step: "04",
    label: "Step 4",
    title: "Evaluate Your Form",
    desc: "Receive exercise feedback based on the movement metrics and biomechanical angles implemented in the application.",
    icon: Target,
  },
  {
    step: "05",
    label: "Step 5",
    title: "Track Your Progress",
    desc: "Review workout results and monitor your progress over time with accuracy percentages, volume, and workout streaks.",
    icon: Flame,
  },
];

const TECH_STACK_ITEMS = [
  "React",
  "JavaScript",
  "Tailwind CSS",
  "Three.js",
  "GSAP",
  "MediaPipe",
  "WebGL",
  "Node.js",
  "Express",
  "PostgreSQL",
];

const PRODUCT_EXPERIENCE = [
  {
    eyebrow: "Live workout",
    title: "See the signal, not the noise.",
    description:
      "A focused camera view keeps the active set, repetition progress, pose status, and coaching easy to scan while you move.",
    icon: Activity,
    accent: "indigo",
    detail: "Pose tracking • Set progress • Form cues",
  },
  {
    eyebrow: "Session results",
    title: "Keep progress connected to the workout.",
    description:
      "SIFRA saves completed sessions and aggregates judged form accuracy with your workout history and streaks.",
    icon: Layers,
    accent: "violet",
    detail: "History • Accuracy • Streaks",
  },
];

const CAPABILITY_CARDS = [
  {
    number: "01",
    title: "Pose intelligence",
    description:
      "33 landmarks provide the geometry used for supported exercise tracking.",
    icon: Eye,
  },
  {
    number: "02",
    title: "Reliable rep tracking",
    description:
      "Phase-aware motion checks help count full squats and push-ups, while planks are timed holds.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Actionable feedback",
    description:
      "Movement assessment and model-backed labels guide form coaching when the pose is observable.",
    icon: Zap,
  },
  {
    number: "04",
    title: "Respectful by design",
    description:
      "The workout uses your camera for the active session and gives clear tracking feedback when the pose is unavailable.",
    icon: ShieldCheck,
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

// ── Shared design tokens ──
const EYEBROW =
  "inline-block text-xs font-semibold uppercase tracking-[0.18em] text-violet-700";

const H2 =
  "text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-[#19152b] sm:text-4xl lg:text-5xl";

const LEAD =
  "text-base leading-relaxed text-stone-600 sm:text-lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98]";

const BTN_PRIMARY = `${BTN_BASE} bg-violet-700 text-white shadow-lg shadow-violet-700/20 hover:-translate-y-0.5 hover:bg-violet-800`;

const BTN_SECONDARY = `${BTN_BASE} border border-violet-200 bg-white/70 text-violet-900 hover:border-violet-400 hover:bg-white`;

export default function Landing_Page() {
  const { user } = useAuth();

  // 3D Scene Refs
  const macbookRef = useRef(null);
  const dumbbellRef = useRef(null);

  // Section Refs
  const pageRef = useRef(null);
  const heroSectionRef = useRef(null);
  const heroCopyRef = useRef(null);
  const capSectionRef = useRef(null);
  const howSectionRef = useRef(null);
  const marqueeRef = useRef(null);
  const footerRef = useRef(null);

  // State for interactive How SIFRA Works workflow stage
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ═════════════════════════════════════════════════════════════
  // PREMIUM CARD STYLES
  // Scoped to the two updated sections.
  // ═════════════════════════════════════════════════════════════
  const cardStyles = `
    .sifra-project-card {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      border: 1px solid rgba(139, 92, 246, 0.13);
      background: linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.98),
        rgba(250, 248, 255, 0.94)
      );
      box-shadow:
        0 2px 5px rgba(40, 20, 90, 0.015),
        0 12px 30px rgba(40, 20, 90, 0.025);
      transition:
        border-color 350ms ease,
        box-shadow 350ms ease,
        background 350ms ease;
    }

    .sifra-project-card::before {
      content: "";
      position: absolute;
      z-index: -1;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(
        90deg,
        #7c3aed,
        #a78bfa,
        #c4b5fd,
        transparent
      );
      opacity: 0.55;
      transform: scaleX(0.28);
      transform-origin: left;
      transition:
        transform 450ms ease,
        opacity 350ms ease;
    }

    .sifra-project-card::after {
      content: "";
      position: absolute;
      z-index: -1;
      width: 180px;
      height: 180px;
      top: -110px;
      right: -90px;
      border-radius: 9999px;
      background: rgba(167, 139, 250, 0.15);
      filter: blur(45px);
      opacity: 0;
      transition: opacity 400ms ease;
      pointer-events: none;
    }

    .sifra-project-card:hover {
      border-color: rgba(139, 92, 246, 0.4);
      background: linear-gradient(
        145deg,
        #ffffff,
        rgba(250, 248, 255, 0.98)
      );
      box-shadow:
        0 4px 10px rgba(40, 20, 90, 0.025),
        0 22px 50px rgba(91, 33, 182, 0.09);
    }

    .sifra-project-card:hover::before {
      transform: scaleX(1);
      opacity: 1;
    }

    .sifra-project-card:hover::after {
      opacity: 1;
    }

    .sifra-card-icon {
      transition:
        color 300ms ease,
        background-color 300ms ease,
        border-color 300ms ease,
        transform 350ms ease;
    }

    .sifra-project-card:hover .sifra-card-icon {
      transform: translateY(-2px) scale(1.04);
      border-color: rgba(124, 58, 237, 0.3);
      background-color: #7c3aed;
      color: white;
    }

    .sifra-capability-inner {
      transition: transform 350ms ease;
    }

    .sifra-project-card:hover .sifra-capability-inner {
      transform: translateY(-3px);
    }

    .sifra-how-card-shell {
      position: relative;
      border-radius: 1rem;
      transition:
        border-color 350ms ease,
        background-color 350ms ease,
        box-shadow 350ms ease,
        transform 350ms ease;
    }

    .sifra-how-card-shell:hover {
      transform: translateX(4px);
    }

    .sifra-how-card-shell.is-active {
      border-color: rgba(139, 92, 246, 0.55);
      background: linear-gradient(
        110deg,
        rgba(255, 255, 255, 0.99),
        rgba(245, 240, 255, 0.98)
      );
      box-shadow:
        0 8px 20px rgba(91, 33, 182, 0.055),
        0 18px 38px rgba(91, 33, 182, 0.055);
    }

    .sifra-how-card-shell.is-active::before {
      content: "";
      position: absolute;
      top: 16px;
      bottom: 16px;
      left: 0;
      width: 3px;
      border-radius: 9999px;
      background: linear-gradient(180deg, #7c3aed, #c4b5fd);
    }

    .sifra-how-card-shell .sifra-step-icon {
      transition:
        transform 350ms ease,
        background-color 350ms ease,
        color 350ms ease,
        border-color 350ms ease;
    }

    .sifra-how-card-shell.is-active .sifra-step-icon {
      transform: scale(1.04);
      border-color: rgba(124, 58, 237, 0.25);
      background: #7c3aed;
      color: #ffffff;
    }

    .sifra-how-card-shell .sifra-step-number {
      transition:
        background-color 350ms ease,
        color 350ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .sifra-project-card,
      .sifra-project-card::before,
      .sifra-project-card::after,
      .sifra-card-icon,
      .sifra-capability-inner,
      .sifra-how-card-shell,
      .sifra-how-card-shell .sifra-step-icon,
      .sifra-how-card-shell .sifra-step-number {
        transition: none !important;
        animation: none !important;
      }
    }
  `;

  // ═════════════════════════════════════════════════════════════
  // 1. MACBOOK HERO SCROLL ANIMATION
  // ═════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const heroSec = heroSectionRef.current;
      if (!heroSec) return;

      ScrollTrigger.create({
        trigger: heroSec,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self) => {
          const progress = self.progress;

          if (heroCopyRef.current) {
            const textOpacity = gsap.utils.clamp(
              0,
              1,
              1 - progress / 0.16
            );

            const textY = progress * -50;

            gsap.set(heroCopyRef.current, {
              opacity: textOpacity,
              y: textY,
              pointerEvents: textOpacity < 0.1 ? "none" : "auto",
            });
          }

          const openProgress = gsap.utils.clamp(
            0,
            1,
            progress / 0.26
          );

          let rotYProgress = 0;

          if (progress >= 0.65 && progress <= 0.88) {
            rotYProgress = (progress - 0.65) / 0.23;
          } else if (progress > 0.88) {
            rotYProgress = 1;
          }

          const exitProgress =
            progress >= 0.88 ? (progress - 0.88) / 0.12 : 0;

          macbookRef.current?.updateScroll(
            openProgress,
            rotYProgress,
            0,
            exitProgress
          );
        },
      });
    }, heroSectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);




  // ═════════════════════════════════════════════════════════════
  // 2b. DUMBBELL MARQUEE-TO-FOOTER JOURNEY
  //
  // Strict Requirements:
  // - Completely absent (opacity: 0, hidden) from Hero, MacBook,
  //   Capabilities, and How SIFRA Works sections.
  // - Begins movement ONLY when the technology marquee section enters view.
  // - Follows a smooth, intentional diagonal path (right-to-left,
  //   then left-to-right) through Testimonials and Quotes.
  // - Reaches final resting position in the Footer.
  // - 100% reversible with zero erratic spinning or random jumps.
  // ═════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const marquee = marqueeRef.current;
    const footer = footerRef.current;
    if (!marquee || !footer) return;

    const ctx = gsap.context(() => {
      // Force initial zero-visibility before marquee is reached
      dumbbellRef.current?.setPose({ o: 0 });

      ScrollTrigger.create({
        trigger: marquee,
        start: "top 85%",
        endTrigger: footer,
        end: "bottom bottom",
        scrub: 0.8,
        onLeaveBack: () => {
          dumbbellRef.current?.setPose({ o: 0 });
        },
        onRefresh: (self) => {
          if (self.progress <= 0 || !self.isActive) {
            dumbbellRef.current?.setPose({ o: 0 });
          }
        },
        onUpdate: (self) => {
          const p = self.progress;

          // Strictly hidden above the marquee
          if (p <= 0 || !self.isActive) {
            dumbbellRef.current?.setPose({ o: 0 });
            return;
          }

          const isMobile = window.innerWidth < 768;
          const vw = window.innerWidth;
          const modelSize = isMobile
            ? Math.min(80, Math.max(56, vw * 0.16))
            : Math.min(115, Math.max(76, vw * 0.075));

          // Fade in smoothly at marquee entry over first 6%
          let o = gsap.utils.clamp(0, 1, p / 0.06);
          let x, y, rx, ry, rz, s;

          if (p <= 0.22) {
            // Stage 1: Technology Marquee — floats in right gutter
            const t = p / 0.22;
            x = gsap.utils.interpolate(isMobile ? 0.78 : 0.88, isMobile ? 0.68 : 0.76, t);
            y = gsap.utils.interpolate(0.65, 0.52, t);
            rx = 0.28;
            ry = 0.3 + t * 0.5;
            rz = -0.15;
            s = 1.0;
          } else if (p <= 0.50) {
            // Stage 2: Testimonials — controlled diagonal glide from right to left gutter
            const t = (p - 0.22) / 0.28;
            x = gsap.utils.interpolate(isMobile ? 0.68 : 0.76, isMobile ? 0.22 : 0.14, t);
            y = gsap.utils.interpolate(0.52, 0.65, t);
            rx = gsap.utils.interpolate(0.28, 0.32, t);
            ry = 0.8 + t * 0.9;
            rz = gsap.utils.interpolate(-0.15, -0.10, t);
            s = 1.0;
          } else if (p <= 0.75) {
            // Stage 3: Mindset Quotes — controlled diagonal glide from left back to right gutter
            const t = (p - 0.50) / 0.25;
            x = gsap.utils.interpolate(isMobile ? 0.22 : 0.14, isMobile ? 0.74 : 0.86, t);
            y = gsap.utils.interpolate(0.65, 0.54, t);
            rx = gsap.utils.interpolate(0.32, 0.28, t);
            ry = 1.7 + t * 0.9;
            rz = gsap.utils.interpolate(-0.10, -0.16, t);
            s = 1.0;
          } else if (p <= 0.90) {
            // Stage 4: CTA Section — curves smoothly toward center
            const t = (p - 0.75) / 0.15;
            x = gsap.utils.interpolate(isMobile ? 0.74 : 0.86, 0.50, t);
            y = gsap.utils.interpolate(0.54, 0.70, t);
            rx = gsap.utils.interpolate(0.28, 0.30, t);
            ry = 2.6 + t * 0.5;
            rz = gsap.utils.interpolate(-0.16, -0.12, t);
            s = gsap.utils.interpolate(1.0, 0.95, t);
          } else {
            // Stage 5: Footer — settles into its final resting position
            const t = (p - 0.90) / 0.10;
            x = 0.50;
            y = gsap.utils.interpolate(0.70, 0.72, t);
            rx = 0.30;
            ry = 3.1 + t * 0.3;
            rz = -0.12;
            s = gsap.utils.interpolate(0.95, 0.88, t);
            o = gsap.utils.interpolate(1.0, 0.9, t);
          }

          dumbbellRef.current?.setPose({
            x,
            y,
            rx,
            ry,
            rz,
            s,
            o,
            size: modelSize,
          });
        },
      });
    }, pageRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  // ═════════════════════════════════════════════════════════════
  // 2c. HOW SIFRA WORKS — STEP PROGRESSION SCROLL TRIGGER
  // ═════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const howSec = howSectionRef.current;
    if (!howSec) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: howSec,
        start: "top 60%",
        end: "bottom 70%",
        onUpdate: (self) => {
          const step = Math.min(
            HOW_IT_WORKS_STEPS.length - 1,
            Math.max(0, Math.floor(self.progress * HOW_IT_WORKS_STEPS.length))
          );
          setActiveWorkflowStep(step);
        },
      });
    }, howSec);

    return () => ctx.revert();
  }, [reducedMotion]);

  // ═════════════════════════════════════════════════════════════
  // 3. GENERAL SCROLL REVEALS
  // ═════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const ease = "power3.out";
      const clear = "opacity,transform";

      gsap.from("[data-hero-item]", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease,
        stagger: 0.09,
        delay: 0.1,
        clearProps: clear,
      });

      gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
        const items = group.querySelectorAll("[data-reveal-item]");

        if (!items.length) return;

        gsap.from(items, {
          y: 28,
          opacity: 0,
          duration: 0.7,
          ease,
          stagger: 0.08,
          clearProps: clear,
          scrollTrigger: {
            trigger: group,
            start: "top 85%",
            once: true,
          },
        });
      });

      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.8,
          ease,
          delay: Number(el.dataset.revealDelay || 0),
          clearProps: clear,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, [reducedMotion]);





// ═════════════════════════════════════════════════════════════
// 4. CORE CAPABILITIES + HOW SIFRA WORKS
// One reveal per row. Earlier code animated scale, clip-path, rotation,
// parallax and nested copy independently, which caused transform conflicts.
// ═════════════════════════════════════════════════════════════


useLayoutEffect(() => {
  const page = pageRef.current;

  if (!page) return;

  // Reduced motion: make every element visible without animation.
  if (reducedMotion) {
    page
      .querySelectorAll(
        [
          ".capabilities-header",
          ".capability-copy > *",
          ".capability-media",
          ".workflow-header",
          ".workflow-copy > *",
          ".workflow-media",
          ".media-inner",
          ".ghost-index",
          ".title-mask",
        ].join(", ")
      )
      .forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
        element.style.clipPath = "none";
      });

    return;
  }

  const ctx = gsap.context(() => {
    const ease = "power3.out";

    // Core capabilities editorial reveal
    const sections = [
      {
        section: capSectionRef.current,
        header: ".capabilities-header",
        block: ".capability-block",
        copy: ".capability-copy",
        media: ".capability-media",
      },
    ];

    sections.forEach(
      ({ section, header, block, copy, media }) => {
        if (!section) return;

        // ----------------------------------------------
        // SECTION HEADING
        // ----------------------------------------------

        const heading = section.querySelector(header);

        if (heading) {
          gsap.fromTo(
            heading,
            {
              y: 50,
              opacity: 0,
            },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 55%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        // ----------------------------------------------
        // EACH EDITORIAL ROW
        // ----------------------------------------------

        gsap.utils.toArray(block, section).forEach(
          (row, index) => {
            const direction = index % 2 === 0 ? 1 : -1;

            // Text entrance.
            const copyElement = row.querySelector(copy);

            if (copyElement) {
              const copyItems = copyElement.querySelectorAll(
                ":scope > *:not(.title-mask)"
              );

              if (copyItems.length) {
                gsap.fromTo(
                  copyItems,
                  {
                    y: 40,
                    opacity: 0,
                  },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.08,
                    ease,
                    scrollTrigger: {
                      trigger: row,
                      start: "top 78%",
                      end: "top 48%",
                      toggleActions: "play none none reverse",
                    },
                  }
                );
              }
            }

            // Title mask reveal.
            const title = row.querySelector(".title-mask");

            if (title) {
              gsap.fromTo(
                title,
                {
                  yPercent: 110,
                },
                {
                  yPercent: 0,
                  duration: 1,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: row,
                    start: "top 80%",
                    end: "top 55%",
                    toggleActions: "play none none reverse",
                  },
                }
              );
            }

            // ------------------------------------------
            // MEDIA PANEL REVEAL
            // ------------------------------------------

            const mediaElement = row.querySelector(media);

            if (!mediaElement) return;

            gsap.fromTo(
              mediaElement,
              {
                clipPath:
                  "inset(18% 14% 18% 14% round 28px)",
                scale: 0.88,
                opacity: 0.25,
                rotate: direction * 1.5,
              },
              {
                clipPath:
                  "inset(0% 0% 0% 0% round 16px)",
                scale: 1,
                opacity: 1,
                rotate: 0,
                duration: 1.3,
                ease: "power4.out",
                scrollTrigger: {
                  trigger: row,
                  start: "top 88%",
                  end: "top 40%",
                  toggleActions: "play none none reverse",
                },
              }
            );

            // Scroll-linked depth inside the media panel.
            const inner = mediaElement.querySelector(
              ".media-inner"
            );

            if (inner) {
              gsap.fromTo(
                inner,
                {
                  scale: 1.14,
                  yPercent: 5,
                },
                {
                  scale: 1,
                  yPercent: -5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: row,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                }
              );
            }

            // Subtle scroll-linked media movement.
            gsap.fromTo(
              mediaElement,
              {
                rotate: direction * 0.6,
              },
              {
                rotate: direction * -0.6,
                ease: "none",
                scrollTrigger: {
                  trigger: row,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );

            // Ghost-number parallax.
            const ghost = mediaElement.querySelector(
              ".ghost-index"
            );

            if (ghost) {
              gsap.fromTo(
                ghost,
                {
                  yPercent: 12,
                },
                {
                  yPercent: -12,
                  ease: "none",
                  scrollTrigger: {
                    trigger: row,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                }
              );
            }
          }
        );
      }
    );
  }, page);

  return () => {
    ctx.revert();
  };
}, [reducedMotion]);


  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-x-clip bg-[#f7f5ff] text-[#19152b] antialiased selection:bg-violet-200 selection:text-violet-950"
    >
      <style>{cardStyles}</style>

      <Navbar />

      <main id="main" className="relative">
        {/* ═════════════════ HERO ═════════════════ */}
        <section ref={heroSectionRef} className="relative h-[360vh] w-full">
          <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute left-1/4 top-1/4 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-[140px]" />
              <div className="absolute bottom-0 right-1/6 h-[300px] w-[300px] rounded-full bg-fuchsia-100/60 blur-[120px]" />
              <div className="absolute inset-0 bg-[radial-gradient(#a78bfa_0.8px,transparent_0.8px)] opacity-20 [background-size:28px_28px]" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f5ff] to-transparent" />
            </div>

            <div className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col items-center pt-14 lg:flex-row lg:pt-0">
              {/* MacBook 3D scene — data-journey="laptop" anchors the dumbbell's start/crossing */}
              <div
                data-journey="laptop"
                className="relative h-[42%] w-full shrink-0 lg:h-full lg:w-[54%] lg:max-w-[760px]"
              >
                <div className="absolute inset-0">
                  <MacBookScene
                    ref={macbookRef}
                    modelUrl={macbookModel}
                    videoUrl={macbookVideo}
                  />
                </div>

              </div>

              {/* Hero copy */}
              <div
                ref={heroCopyRef}
                className="pointer-events-auto relative z-20 w-full px-6 pb-8 text-center lg:w-[46%] lg:px-12 lg:pb-0 lg:text-left"
              >
                <div
                  data-hero-item
                  className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                  <span>AI-Powered Fitness Coaching</span>
                </div>

                <h1
                  data-hero-item
                  className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#19152b] sm:text-5xl lg:mt-7 lg:text-6xl xl:text-7xl"
                >
                  Your personal
                  <br />
                  <span className="block bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text pb-2 text-transparent">
                    AI fitness coach.
                  </span>
                </h1>

                <p
                  data-hero-item
                  className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0 lg:mt-6"
                >
                  Intelligent workout tracking, real-time form feedback, and
                  personalized guidance — powered by computer vision in your
                  browser.
                </p>

                <div
                  data-hero-item
                  className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:mt-9 lg:justify-start"
                >
                  <Link
                    to={user ? "/WorkoutPlan" : "/Register"}
                    className={`group ${BTN_PRIMARY}`}
                  >
                    <span>Start Training</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById("how-it-works")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={BTN_SECONDARY}
                  >
                    <span>Explore SIFRA</span>
                  </button>
                </div>

                <div
                  data-hero-item
                  className="mt-8 hidden items-center justify-center gap-8 text-xs text-stone-500 sm:flex lg:justify-start"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>No equipment required</span>
                  </span>

                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />
                    <span>Runs client-side in browser</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 pb-5 text-center">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-500" />
                Scroll down to open laptop and explore features
              </span>
            </div>
          </div>
        </section>

        {/* ═════════════════ CORE CAPABILITIES — PREMIUM PROJECT CARDS ═════════════════ */}
        {/* CORE CAPABILITIES — editorial project layout, alternating left/right */}

{/* ================= CORE CAPABILITIES ================= */}

<section
  ref={capSectionRef}
  className="relative overflow-hidden bg-[#F5F3FF] py-20 md:py-28"
>
  <div className="relative z-40 mx-auto max-w-6xl px-5 md:px-8">
    {/* Section heading */}
    <div className="projects-header capabilities-header mb-14 flex items-end justify-between md:mb-20">
      <div>
        <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Built for Better Training
        </span>

        <h2 className="text-4xl font-black tracking-tight text-gray-900 md:text-6xl">
          Core Capabilities
          <span className="text-violet-600">.</span>
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 md:text-base">
          Intelligent workout guidance designed to make every repetition
          more accurate, consistent, and effective.
        </p>
      </div>

      <span className="hidden font-mono text-xs text-gray-400 md:block">
        (03)
      </span>
    </div>

    {/* Capability cards */}
    <div className="space-y-12 md:space-y-16">
      {[
        {
          number: "01",
          eyebrow: "REAL-TIME ANALYSIS",
          title: "Form Accuracy",
          description:
            "Get real-time feedback on your exercise posture and movement, helping you maintain better technique throughout every workout.",
          points: [
            "Live body-position tracking",
            "Posture and movement analysis",
            "Technique-focused feedback",
          ],
        },
        {
          number: "02",
          eyebrow: "INTELLIGENT TRACKING",
          title: "Smart Rep Counting",
          description:
            "Track completed repetitions through movement analysis instead of relying on manual counting or inconsistent estimates.",
          points: [
            "Movement-based rep detection",
            "Exercise-specific validation",
            "Consistent workout tracking",
          ],
        },
        {
          number: "03",
          eyebrow: "PERSONALIZED GUIDANCE",
          title: "Voice Coaching",
          description:
            "Stay focused on your workout with voice guidance, useful cues, and encouraging feedback throughout your session.",
          points: [
            "Hands-free workout guidance",
            "Clear exercise instructions",
            "Motivational feedback",
          ],
        },
      ].map((item, index) => (
        <article
          key={item.number}
          data-cap-item
          className={`project-block capability-block grid items-center gap-6 md:grid-cols-2 md:gap-10 ${
            index % 2 === 1 ? "md:[&>.capability-media]:order-2" : ""
          }`}
        >
          {/* Text-only visual panel */}
          <div className="project-media capability-media group relative">
            <div className="capability-visual relative aspect-[16/9] overflow-hidden rounded-2xl border border-violet-200/70 bg-white/80 shadow-sm">
              {/* Inner content receives the scroll-linked depth animation */}
              <div className="media-inner absolute inset-x-0 -top-[8%] -bottom-[8%] flex items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-100/80 via-white/70 to-violet-50/50" />

                <div className="relative z-10 px-6 text-center md:px-10">
                  <span className="font-mono text-xs tracking-[0.25em] text-violet-500">
                    SIFRA / {item.number}
                  </span>

                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                    {item.title}
                    <span className="text-violet-600">.</span>
                  </h3>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
                    {item.points[0]}
                  </p>

                  <div className="mx-auto mt-6 h-1 w-12 rounded-full bg-violet-500 transition-all duration-500 group-hover:w-20" />
                </div>
              </div>

              {/* Category badge */}
              <div className="absolute left-3 top-3 z-10 md:left-4 md:top-4">
                <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1.5 text-[9px] font-semibold tracking-wider text-violet-700 shadow-sm md:text-[10px]">
                  {item.eyebrow}
                </span>
              </div>

              {/* Ghost index — independently animated */}
              <div className="ghost-index pointer-events-none absolute bottom-2 right-5 z-10 select-none text-6xl font-black leading-none text-violet-900/[0.06] md:text-8xl">
                {item.number}
              </div>

              {/* Subtle cinematic hover sweep */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                <div className="absolute -top-1/2 left-0 h-[200%] w-1/3 -translate-x-full -rotate-12 bg-gradient-to-r from-transparent via-violet-200/40 to-transparent transition-transform duration-[1400ms] ease-out group-hover:translate-x-[400%]" />
              </div>
            </div>
          </div>

          {/* Capability copy */}
          <div className="project-copy capability-copy">
            <div className="mb-3 font-mono text-[10px] tracking-[0.18em] text-gray-400">
              CAPABILITY {item.number} / 03
            </div>

            <div className="title-mask mb-3 overflow-hidden">
              <h3 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
                {item.title}
                <span className="text-violet-600">.</span>
              </h3>
            </div>

            <p className="mb-5 max-w-lg text-sm leading-7 text-gray-600 md:text-base">
              {item.description}
            </p>

            <ul className="mb-6 space-y-2.5">
              {item.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-gray-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
              <span className="h-px w-7 bg-violet-500" />
              Intelligent training
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
</section>




        {/* HOW SIFRA WORKS — left step list + right 3D dumbbell, synchronized scroll */}

        {/* ═════════════════ HOW SIFRA WORKS — EDITORIAL WORKFLOW ═════════════════ */}
        <section
          ref={howSectionRef}
          id="how-it-works"
          className="relative w-full overflow-hidden border-t border-violet-100 bg-[#FAF9FF] py-20 text-[#19152B] md:py-28"
        >
          <div className="relative z-40 mx-auto max-w-6xl px-5 md:px-8">
            {/* Section Header */}
            <div className="mb-14 max-w-2xl md:mb-16">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                02 / THE WORKFLOW
              </span>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                A simple, five-step path to better training
                <span className="text-violet-600">.</span>
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                From camera setup to progress tracking, discover how SIFRA guides
                each repetition directly in your browser without wearables or extra sensors.
              </p>
            </div>

            {/* Editorial Workflow: Connected Steps + Focused Visual Demonstration */}
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
              {/* Left Column: 5 Connected Workflow Steps */}
              <div className="space-y-2 lg:col-span-6">
                {HOW_IT_WORKS_STEPS.map((step, index) => {
                  const isActive = activeWorkflowStep === index;

                  return (
                    <div
                      key={step.step}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveWorkflowStep(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveWorkflowStep(index);
                        }
                      }}
                      className={`group relative cursor-pointer rounded-xl border-l-2 p-4 transition-all duration-200 outline-none sm:p-5 ${
                        isActive
                          ? "border-violet-600 bg-white shadow-sm ring-1 ring-slate-200/60"
                          : "border-transparent bg-transparent hover:border-violet-300 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors ${
                            isActive
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-700"
                          }`}
                        >
                          {step.step}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-base font-bold transition-colors ${
                                isActive ? "text-slate-900" : "text-slate-700"
                              }`}
                            >
                              {step.title}
                            </h3>

                            {isActive && (
                              <span className="hidden font-mono text-[10px] font-semibold text-violet-600 sm:inline-block">
                                CURRENT STEP
                              </span>
                            )}
                          </div>

                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: One Focused Visual Demonstration */}
              <div className="lg:sticky lg:top-28 lg:col-span-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-200/40 sm:p-8">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Workflow In Action
                      </span>
                    </div>

                    <span className="font-mono text-xs font-semibold text-violet-700">
                      Step {activeWorkflowStep + 1} of 5
                    </span>
                  </div>

                  {/* Focused Demonstration Content */}
                  <div className="py-6 sm:py-8">
                    {/* Step 1: Start Your Workout */}
                    {activeWorkflowStep === 0 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Sparkles className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Start Your Workout
                            </h4>
                            <p className="text-xs text-slate-500">
                              Configure exercises and coaching preferences
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2.5 rounded-xl border border-slate-100 bg-[#FAF9FF] p-4 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                            <span className="text-slate-500">Selected Exercise</span>
                            <span className="font-semibold text-slate-900">Squats (Bodyweight)</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                            <span className="text-slate-500">Target Session</span>
                            <span className="font-semibold text-slate-900">3 sets × 12 reps</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                            <span className="text-slate-500">Audio Coaching</span>
                            <span className="font-semibold text-violet-700">Enabled</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-slate-500">Camera Source</span>
                            <span className="font-semibold text-emerald-700">Connected in Browser</span>
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-500">
                          SIFRA operates entirely inside your web browser. No apps, downloads, or external sensors are needed.
                        </p>
                      </div>
                    )}

                    {/* Step 2: AI Tracks Your Movement */}
                    {activeWorkflowStep === 1 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Camera className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              AI Tracks Your Movement
                            </h4>
                            <p className="text-xs text-slate-500">
                              33 anatomical landmarks tracked from your webcam
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-[#FAF9FF] p-6 text-center">
                          {/* Clean minimal body landmark wireframe representation */}
                          <div className="relative flex flex-col items-center gap-2 py-3">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-violet-600 bg-white" />
                            <div className="h-6 w-0.5 bg-violet-300" />
                            <div className="flex items-center gap-6">
                              <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                              <div className="h-1.5 w-12 rounded-full bg-violet-200" />
                              <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                            </div>
                            <div className="h-8 w-0.5 bg-violet-300" />
                            <div className="flex items-center gap-8">
                              <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                              <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="h-7 w-0.5 bg-violet-300" />
                              <div className="h-7 w-0.5 bg-violet-300" />
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            </div>
                          </div>

                          <span className="mt-3 inline-block rounded-full bg-violet-100/70 px-3 py-1 font-mono text-[11px] font-semibold text-violet-800">
                            33 Keypoints Locked & Tracked
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-500">
                          Computer vision maps your body joints and tracks full-body kinematics continuously during each repetition.
                        </p>
                      </div>
                    )}

                    {/* Step 3: Count Repetitions */}
                    {activeWorkflowStep === 2 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Dumbbell className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Count Repetitions
                            </h4>
                            <p className="text-xs text-slate-500">
                              Validated through full range of motion inflections
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-[#FAF9FF] p-6 text-center">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Repetition Counter
                          </span>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-5xl font-black text-slate-900">
                              08
                            </span>
                            <span className="text-base font-medium text-slate-400">
                              / 12 completed
                            </span>
                          </div>

                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Valid Rep — Depth Threshold Met</span>
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-500">
                          Completed repetitions register only after reaching valid depth and returning through the full range of motion.
                        </p>
                      </div>
                    )}

                    {/* Step 4: Evaluate Your Form */}
                    {activeWorkflowStep === 3 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Target className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Evaluate Your Form
                            </h4>
                            <p className="text-xs text-slate-500">
                              Instant angular evaluation and audio coaching
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-100 bg-[#FAF9FF] p-4 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Knee Flexion Angle</span>
                            <span className="font-semibold text-emerald-700">88° (Optimal Depth)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Hip Alignment</span>
                            <span className="font-semibold text-emerald-700">94° (Symmetric)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Torso Linearity</span>
                            <span className="font-semibold text-slate-900">Neutral Posture</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3.5 text-xs text-violet-950">
                          <Volume2 className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong className="font-semibold">Voice Cue:</strong> “Good depth on rep 8. Keep your chest up as you drive upward.”
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Track Your Progress */}
                    {activeWorkflowStep === 4 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-amber-500">
                            <Flame className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Track Your Progress
                            </h4>
                            <p className="text-xs text-slate-500">
                              Review accuracy, volume, and workout consistency
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="rounded-xl border border-slate-100 bg-[#FAF9FF] p-3">
                            <span className="block text-[10px] uppercase font-semibold text-slate-400">Accuracy</span>
                            <span className="mt-1 block text-lg font-bold text-violet-700">96%</span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#FAF9FF] p-3">
                            <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Reps</span>
                            <span className="mt-1 block text-lg font-bold text-slate-900">36</span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#FAF9FF] p-3">
                            <span className="block text-[10px] uppercase font-semibold text-slate-400">Streak</span>
                            <span className="mt-1 block text-lg font-bold text-amber-600">5 Days</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-[#FAF9FF] p-3 text-xs text-slate-600">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Session results automatically save to your workout profile.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step Selector Pills */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Select Step
                    </span>
                    <div className="flex items-center gap-1.5">
                      {HOW_IT_WORKS_STEPS.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveWorkflowStep(i)}
                          className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold transition-all ${
                            activeWorkflowStep === i
                              ? "bg-violet-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                          }`}
                          aria-label={`Jump to step ${i + 1}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════ TECH + CAPABILITY MARQUEE ═════════════════ */}
        <section
          ref={marqueeRef}
          data-journey="marquee"
          className="relative overflow-hidden border-y border-violet-100 bg-white py-14"
        >
          <style>{`
            @keyframes marqueeScroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }

            .tech-marquee-track {
              display: flex;
              width: max-content;
              animation: marqueeScroll 26s linear infinite;
            }

            .tech-marquee-track:hover {
              animation-play-state: paused;
            }

            @media (prefers-reduced-motion: reduce) {
              .tech-marquee-track {
                animation: none;
              }
            }
          `}</style>

          <div data-reveal>
            <div className="tech-marquee-track relative z-20 mb-4">
              {[...TECH_STACK_ITEMS, ...TECH_STACK_ITEMS].map((item, i) => (
                <span
                  key={i}
                  className="mx-2.5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#faf8ff] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span>{item}</span>
                </span>
              ))}
            </div>

            <div className="tech-marquee-track relative z-[35]">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span
                  key={i}
                  className="mx-8 flex items-center gap-3 whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-stone-400"
                >
                  <span className="text-violet-400">✳</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════ TESTIMONIALS ═════════════════ */}
        <section
          data-journey="testimonials"
          className="relative overflow-hidden bg-[#f7f5ff] py-24 lg:py-32"
        >
          <div className="mx-auto mb-14 max-w-3xl px-6 text-center sm:px-10">
            <span data-reveal className={EYEBROW}>
              Community & Coaches
            </span>

            <h2
              data-reveal
              data-reveal-delay="0.08"
              className={`mt-4 ${H2}`}
            >
              What Athletes & Coaches Say
            </h2>

            <p
              data-reveal
              data-reveal-delay="0.16"
              className={`mx-auto mt-4 max-w-lg ${LEAD}`}
            >
              Trusted by strength athletes, physical therapists, and performance
              coaches worldwide.
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

            @media (prefers-reduced-motion: reduce) {
              .testimonial-track {
                animation: none;
              }
            }
          `}</style>

          <div data-reveal>
            <div className="testimonial-track py-2">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, index) => (
                <div
                  key={index}
                  className="mx-3 flex w-[320px] shrink-0 flex-col rounded-xl border border-violet-100 bg-white p-6 transition-colors duration-300 hover:border-violet-300 sm:w-[380px] sm:p-7"
                >
                  <div className="mb-4 flex items-center gap-0.5 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400"
                      />
                    ))}
                  </div>

                  <p className="flex-1 text-[15px] leading-relaxed text-stone-700">
                    “{t.text}”
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-violet-50 pt-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[#19152b]">
                        {t.name}
                      </h4>
                      <p className="text-xs text-stone-500">{t.role}</p>
                    </div>

                    <Quote className="h-5 w-5 text-violet-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════ QUOTES ═════════════════ */}
        <section
          id="quote-marquee"
          className="relative overflow-hidden border-t border-violet-100 bg-white px-0 py-24 lg:py-28"
        >
          <div className="mx-auto mb-12 max-w-3xl px-6 text-center">
            <span data-reveal className={EYEBROW}>
              Mindset Matters
            </span>

            <h2
              data-reveal
              data-reveal-delay="0.08"
              className={`mt-4 ${H2}`}
            >
              Stronger habits. Stronger you.
            </h2>

            <p
              data-reveal
              data-reveal-delay="0.16"
              className="mt-3 text-sm text-stone-600 sm:text-base"
            >
              Every rep is a step toward becoming stronger.
            </p>
          </div>

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

          <div data-reveal>
            <div className="relative mb-4">
              <div className="quote-track">
                {[...QUOTES, ...QUOTES].map((q, i) => (
                  <div
                    key={i}
                    className="mx-2.5 flex w-[320px] shrink-0 flex-col rounded-xl border border-violet-100 bg-[#faf8ff] p-5 sm:w-[360px]"
                  >
                    <Quote className="mb-3 h-4 w-4 text-violet-300" />

                    <p className="flex-1 text-sm leading-relaxed text-stone-700">
                      “{q.text}”
                    </p>

                    <p className="mt-4 text-xs font-semibold text-violet-700">
                      — {q.author}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="quote-track-reverse">
                {[
                  ...QUOTES.slice().reverse(),
                  ...QUOTES.slice().reverse(),
                ].map((q, i) => (
                  <div
                    key={i}
                    className="mx-2.5 flex w-[320px] shrink-0 flex-col rounded-xl border border-violet-100 bg-[#faf8ff] p-5 sm:w-[360px]"
                  >
                    <Quote className="mb-3 h-4 w-4 text-violet-300" />

                    <p className="flex-1 text-sm leading-relaxed text-stone-700">
                      “{q.text}”
                    </p>

                    <p className="mt-4 text-xs font-semibold text-violet-700">
                      — {q.author}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════ FINAL CTA ═════════════════ */}
        <section
          data-journey="cta"
          className="relative overflow-hidden border-t border-violet-100 bg-[#f7f5ff] px-6 py-20 sm:px-10 lg:py-28"
        >
          <div
            data-reveal
            className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl bg-[#1b1240] px-6 py-16 text-center sm:px-12 sm:py-20"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-[110px]" />

              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_0.8px,transparent_0.8px)] opacity-30 [background-size:28px_28px]" />
            </div>

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                Ready to train smarter?
              </h2>

              <p className="mt-5 text-base leading-relaxed text-violet-200 sm:text-lg">
                Start your first AI-guided workout session in seconds. No
                equipment, no downloads.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={user ? "/WorkoutPlan" : "/Register"}
                  className={`group ${BTN_BASE} bg-white text-violet-900 shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:bg-violet-50`}
                >
                  <span>Start Training</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to={user ? "/Dashboard" : "/Login"}
                  className={`${BTN_BASE} border border-white/25 text-white hover:border-white/50 hover:bg-white/10`}
                >
                  <span>{user ? "Go to Dashboard" : "Sign In"}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer ref={footerRef} />

      {/*
        The one and only dumbbell canvas. It is a direct child of the page root
        (outside <main> and every overflow-hidden section), fixed to the viewport,
        z-30, pointer-events-none. Driven by the master timeline in effect 2b.
      */}
      {!reducedMotion && (
        <DumbbellScene ref={dumbbellRef} modelUrl={dumbbellModel} overlay />
      )}
    </div>
  );
}
