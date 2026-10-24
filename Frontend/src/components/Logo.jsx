import { useId } from "react";
import { Dumbbell } from "lucide-react";

const SIZE_MAP = {
  xs: 30,
  sm: 38,
  md: 45,
  lg: 54,
  xl: 62,
};

/**
 * SIFRA AI logo — orbit ring + dumbbell.
 *
 * Props:
 * size         Icon size in px or preset (default 56)
 * showWordmark Show "Sifra.AI" text      (default true)
 * animated     Orbit / rock / pulse      (default true)
 * direction    "row" | "col"             (default "row")
 * variant      "primary" | "dark"        (default "primary")
 * className    Extra wrapper classes
 */
export default function Logo({
  size = 56,
  showWordmark = true,
  animated = true,
  direction = "row",
  variant = "primary",
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `sifra-grad-${uid}`;

  const numSize = typeof size === "number" ? size : (SIZE_MAP[size] || 56);
  const isDark = variant === "dark" || variant === "white";

  return (
    <div
      className={`inline-flex items-center gap-3 ${
        direction === "col" ? "flex-col" : "flex-row"
      } ${className}`}
    >
      {/* ICON */}
      <div
        className="relative shrink-0"
        style={{ width: numSize, height: numSize }}
      >
        <svg
          viewBox="0 0 100 100"
          width={numSize}
          height={numSize}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0" stopColor={isDark ? "#6366F1" : "#4F46E5"} />
              <stop offset="0.55" stopColor={isDark ? "#8B5CF6" : "#6366F1"} />
              <stop offset="1" stopColor={isDark ? "#EEF2FF" : "#8B5CF6"} />
            </linearGradient>
          </defs>

          {/* Outer pulse ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={isDark ? "#8B5CF6" : "#6366F1"}
            strokeOpacity={isDark ? "0.3" : "0.25"}
            strokeWidth="1"
            className={
              animated
                ? "animate-[sifra-pulse_3s_ease-in-out_infinite] [transform-origin:50px_50px] [transform-box:view-box] motion-reduce:animate-none"
                : ""
            }
          />

          {/* Main gradient ring */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill={isDark ? "#EEF2FF" : "#4F46E5"}
            fillOpacity={isDark ? "0.12" : "0.08"}
            stroke={`url(#${gradId})`}
            strokeWidth="3"
          />

          {/* Orbiting dot */}
          <g
            className={
              animated
                ? "animate-[sifra-orbit_6s_linear_infinite] [transform-origin:50px_50px] [transform-box:view-box] motion-reduce:animate-none"
                : ""
            }
          >
            <circle
              cx="50"
              cy="10"
              r="4.5"
              fill={isDark ? "#EEF2FF" : "#6366F1"}
            />
          </g>
        </svg>

        {/* Centered dumbbell icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex ${
              animated
                ? "animate-[sifra-rock_3s_ease-in-out_infinite] motion-reduce:animate-none"
                : ""
            }`}
          >
            <Dumbbell
              size={numSize * 0.42}
              color={isDark ? "#EEF2FF" : "#4F46E5"}
              strokeWidth={2}
            />
          </div>
        </div>
      </div>

      {/* WORDMARK */}
      {showWordmark && (
        <span
          className={`font-['Space_Grotesk',system-ui,sans-serif] font-bold tracking-[-0.03em] leading-none ${
            isDark ? "text-white" : "text-[#111827]"
          }`}
          style={{
            fontSize: numSize * 0.44,
          }}
        >
          Sifra
          <span
            className={`inline-block bg-clip-text text-transparent ${
              isDark
                ? "bg-gradient-to-br from-[#8B5CF6] via-[#6366F1] to-[#EEF2FF]"
                : "bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#8B5CF6]"
            }`}
          >
            .AI
          </span>
        </span>
      )}
    </div>
  );
}
