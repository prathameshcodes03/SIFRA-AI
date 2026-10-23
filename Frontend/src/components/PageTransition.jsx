import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";

/**
 * Premium page transition: subtle scale + fade + vertical settle.
 * Feels like the destination page opens naturally into view.
 */
export default function PageTransition({ children }) {
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    if (reducedMotion) {
      gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 6, scale: 0.99 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: "power3.out",
        clearProps: "transform",
      }
    );
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full">
      {children}
    </div>
  );
}