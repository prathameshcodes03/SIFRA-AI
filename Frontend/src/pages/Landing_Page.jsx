import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import Speaking from "../assets/Audio/Speaking.mp3";

import StudioFitnessPose from "../assets/models/studio_fitness_pose.glb";
import AvaSteele from "../assets/models/ava_steele_athletic_female_weightlifter.glb";

import FitnessModelScene from "../components/Landing/FitnessModelScene";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Landing_Page = () => {
  const pinRef = useRef(null);

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

        // Slide 0 (Hero) is visible at start
        gsap.set(slides[0], {
          opacity: 1,
          y: 0,
          scale: 1,
        });

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

        // Step 1: Hero (Model Left, Text Right) -> Slide 1 (Model Right, Text Left)
        tl.to(slides[0], {
          opacity: 0,
          y: -40,
          scale: 0.96,
          duration: 1,
          ease: "power2.inOut",
        })
          .to(
            slides[1],
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1,
              ease: "power2.inOut",
            },
            "<0.2"
          )
          // Step 2: Slide 1 -> Slide 2 (Model Left, Text Right)
          .to(
            slides[1],
            {
              opacity: 0,
              y: -40,
              scale: 0.96,
              duration: 1,
              ease: "power2.inOut",
            },
            "+=0.25"
          )
          .to(
            slides[2],
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1,
              ease: "power2.inOut",
            },
            "<0.2"
          )
          // Step 3: Slide 2 -> Slide 3 (Model Right, Text Left)
          .to(
            slides[2],
            {
              opacity: 0,
              y: -40,
              scale: 0.96,
              duration: 1,
              ease: "power2.inOut",
            },
            "+=0.25"
          )
          .to(
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#05050A]">
      <Navbar />

      <main id="main">
        {/* UNIFIED HERO + FEATURES PINNED EXPERIENCE (Single Continuous 3D Model across Home & Features) */}
        <section
          id="home-features-pin"
          ref={pinRef}
          className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[#05050A] md:h-screen"
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none absolute inset-0 md:sticky md:top-0 md:h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.16),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.12),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />
          </div>

          {/* Single Persistent 3D Model Canvas that starts in Hero, glides -X to +X, and rotates 360 */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
            <FitnessModelScene
              modelUrl={StudioFitnessPose}
              variant="unified-journey"
              scrollTriggerElement={pinRef.current}
            />
          </div>

          {/* Timeline Slides */}
          <div className="relative z-20 space-y-16 py-10 md:absolute md:inset-0 md:space-y-0 md:py-0">
            {/* Slide 0: Hero Section (Model on Left, Text on Right) */}
            <div
              id="home"
              className="timeline-slide relative flex min-h-[85svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                {/* Mobile model container (hidden on desktop where unified canvas renders) */}
                <div className="order-2 h-[380px] w-full block sm:h-[460px] md:hidden">
                  <FitnessModelScene
                    modelUrl={StudioFitnessPose}
                    variant="hero"
                  />
                </div>
                <div className="hidden md:block" />

                <div className="order-1 text-center md:text-left">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                    Next-Gen Fitness Intelligence
                  </div>

                  <h1 className="inline-block max-w-3xl bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-[clamp(2.2rem,6.5vw,4.8rem)] font-bold leading-tight text-transparent">
                    Your AI Coach
                    <br className="hidden sm:block" />
                    Every Rep Perfected.
                  </h1>

                  <p className="mt-5 inline-block max-w-2xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.1rem,3.2vw,1.75rem)] font-semibold leading-snug text-transparent sm:mt-8">
                    Real time pose correction, rep counting and personalised
                    feedback.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 1: Form Accuracy (Model glides to Right +X, Text on Left) */}
            <div
              id="features"
              className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0"
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  <span className="mb-3 inline-block rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-pink-400">
                    FEATURE 01
                  </span>
                  <h1 className="mb-4 bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight text-transparent sm:mb-6">
                    98% Form Accuracy
                  </h1>
                  <p className="bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.05rem,2.8vw,1.6rem)] font-medium leading-relaxed text-transparent">
                    Real-time AI posture analysis powered by MediaPipe computer vision.
                  </p>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>

            {/* Slide 2: Smart Rep Counting (Model glides to Left -X, Text on Right) */}
            <div className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="hidden md:block" />
                <div className="text-center md:text-left">
                  <span className="mb-3 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-cyan-400">
                    FEATURE 02
                  </span>
                  <h1 className="mb-4 bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight text-transparent sm:mb-6">
                    Smart Rep Counting
                  </h1>
                  <p className="bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.05rem,2.8vw,1.6rem)] font-medium leading-relaxed text-transparent">
                    Automatically tracks every pushup and workout session with velocity analysis.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 3: Voice Coaching (Model glides to Right +X, Text on Left) */}
            <div className="timeline-slide relative flex min-h-[60svh] items-center px-5 sm:px-8 md:absolute md:inset-0 md:min-h-0">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
                <div className="text-center md:text-left">
                  <span className="mb-3 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-amber-400">
                    FEATURE 03
                  </span>
                  <h1 className="mb-4 bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ef4444] bg-clip-text text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight text-transparent sm:mb-6">
                    Voice Coaching
                  </h1>
                  <p className="bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.05rem,2.8vw,1.6rem)] font-medium leading-relaxed text-transparent">
                    Get instant motivational feedback and cues just like having a real personal trainer beside you.
                  </p>
                </div>
                <div className="hidden md:block" />
              </div>
            </div>
          </div>
        </section>

        {/* PAGE 3: TRAINER SECTION (Ava Steele Appears on Scroll from Left at 3/4 Athletic Angle) */}
        <section
          id="trainer"
          data-model-section
          className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 text-white sm:px-8 lg:grid-cols-2 lg:px-10"
        >
          <div className="text-center lg:text-left">
            <h1 className="inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-[clamp(2.4rem,8vw,5rem)] font-bold leading-tight text-transparent">
              Meet Your AI
              <br className="hidden sm:block" />
              Coach
            </h1>

            <p className="mt-6 inline-block max-w-2xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] bg-clip-text text-[clamp(1.2rem,4vw,2rem)] font-semibold leading-snug text-transparent sm:mt-8">
              Your Personal AI Trainer is here 24/7 to guide, support and
              push you to be your best.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <button
                onClick={() => {
                  const audio = new Audio(Speaking);
                  audio.play();
                }}
                className="w-full max-w-xs cursor-pointer rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-6 py-3 font-semibold text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105 sm:w-auto"
              >
                Listen to Sifra
              </button>
            </div>
          </div>

          <div className="h-[480px] w-full lg:h-[620px]">
            <FitnessModelScene
              modelUrl={AvaSteele}
              variant="workout"
            />
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
};

export default Landing_Page;