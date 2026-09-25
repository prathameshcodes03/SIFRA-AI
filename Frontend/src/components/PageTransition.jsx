import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";

/**
 * Ultra-smooth SaaS route transition inspired by Linear, Stripe, and Vercel.
 * Uses GSAP for high frame-rate easing with subtle scale, translate, blur, and opacity.
 */
export default function PageTransition({ children }) {
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const el = containerRef.current;
    const bar = progressBarRef.current;
    if (!el) return;

    // Scroll to top cleanly on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Subtle route progress bar animation (Linear / Vercel style)
    if (bar) {
      gsap.fromTo(
        bar,
        { scaleX: 0, autoAlpha: 1 },
        {
          scaleX: 1,
          duration: 0.45,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(bar, { autoAlpha: 0, duration: 0.25 });
          },
        }
      );
    }

    // GSAP cinematic page entrance: slide up slightly + fade + slight scale + de-blur
    gsap.fromTo(
      el,
      {
        autoAlpha: 0,
        y: 18,
        scale: 0.995,
        filter: "blur(5px)",
      },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.45,
        ease: "power3.out",
        clearProps: "filter,transform",
      }
    );
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full will-change-[transform,opacity,filter]"
    >
      {/* Top route progress bar */}
      <div
        ref={progressBarRef}
        className="pointer-events-none fixed top-0 left-0 right-0 z-[9999] h-[2px] origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 shadow-sm shadow-indigo-500/50"
        style={{ transform: "scaleX(0)" }}
      />
      {children}
    </div>
  );
}
