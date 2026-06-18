import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  const coordRef = useRef(null);

  /* animated corner coord tick */
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      if (coordRef.current) {
        coordRef.current.innerHTML =
          `SYS: ONLINE<br/>AI: ACTIVE`;
      }
    }, 80);
    return () => clearInterval(id);
  }, []);

  /* magnetic button */
  useEffect(() => {
    const btn = document.getElementById("backBtn");
    if (!btn) return;
    const onMove = (e) => {
      const r  = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left  - r.width  / 2) * 0.18;
      const dy = (e.clientY - r.top   - r.height / 2) * 0.18;
      btn.style.transform = `translate(${dx}px,${dy}px) scale(1.03)`;
    };
    const onLeave = () => { btn.style.transform = ""; };
    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      {/* ── Google Font (add to index.html if not already present) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── RESET ── */
        .nf-root *, .nf-root *::before, .nf-root *::after {
          margin: 0; padding: 0; box-sizing: border-box;
        }

        /* ── PAGE ── */
        .nf-root {
          --violet:  #6366f1;
          --violet2: #818cf8;
          --green:   #34d399;
          --white:   #f2f2f7;
          --muted:   rgba(242,242,247,.5);
          --dim:     rgba(242,242,247,.18);
          --border:  rgba(242,242,247,.08);
          --ff:      'Space Grotesk', system-ui, sans-serif;
          --ffm:     'JetBrains Mono', monospace;

          font-family: var(--ff);
          background: #07070a;
          color: var(--white);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        /* ── GLOWS ── */
        .nf-glow-top {
          position: absolute; border-radius: 50%; pointer-events: none;
          width: 600px; height: 600px;
          top: -180px; left: 50%; transform: translateX(-50%);
          background: radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 68%);
        }
        .nf-glow-bot {
          position: absolute; border-radius: 50%; pointer-events: none;
          width: 340px; height: 340px;
          bottom: -100px; left: 50%; transform: translateX(-50%);
          background: radial-gradient(circle, rgba(52,211,153,.07) 0%, transparent 70%);
        }

        /* ── GRID ── */
        .nf-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(99,102,241,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.03) 1px, transparent 1px);
          background-size: 56px 56px;
        }

        /* ── SCAN LINE ── */
        .nf-scan {
          position: absolute; left: 0; right: 0; height: 1px;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,.42), transparent);
          animation: nfScan 5s ease-in-out infinite;
        }
        @keyframes nfScan {
          0%,100% { top: 0; opacity: 0; }
          8%       { opacity: .62; }
          92%      { opacity: .2; }
          99%      { top: 98%; opacity: 0; }
        }

        /* ── NAVBAR ── */
        .nf-nav {
          position: absolute; top: 0; left: 0; right: 0;
          height: 52px; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2rem;
          background: rgba(7,7,10,.75);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--border);
        }
        .nf-logo {
          font-size: 1.15rem; font-weight: 700;
          letter-spacing: -.03em; color: var(--white);
        }
        .nf-logo span {
          background: linear-gradient(135deg, var(--violet), var(--violet2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nf-nav-hint {
          font-family: var(--ffm); font-size: .625rem;
          letter-spacing: .12em; color: var(--dim);
        }

        /* ── CORNER HUD ── */
        .nf-corner {
          position: absolute; font-family: var(--ffm);
          font-size: .5625rem; letter-spacing: .1em;
          color: rgba(242,242,247,.16); z-index: 1;
        }
        .nf-tr { top: 62px; right: 1.25rem; text-align: right; }
        .nf-bl { bottom: 1rem; left: 1.25rem; }
        .nf-br { bottom: 1rem; right: 1.25rem; text-align: right; }

        /* ── CONTENT ── */
        .nf-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 2rem; margin-top: 1rem;
        }

        /* ── 404 ROW ── */
        .nf-four-wrap {
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.75rem;
          animation: nfFloat 4s ease-in-out infinite;
        }
        @keyframes nfFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }

        /* digits — white */
        .nf-digit {
          font-family: var(--ff);
          font-size: clamp(5rem, 14vw, 8.5rem);
          font-weight: 700; letter-spacing: -.04em; line-height: 1;
          color: rgba(242,242,247,.92);
          -webkit-text-stroke: 1px rgba(99,102,241,.3);
        }

        /* zero container */
        .nf-zero-wrap {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .nf-zero-char {
          font-family: var(--ff);
          font-size: clamp(5rem, 14vw, 8.5rem);
          font-weight: 700; letter-spacing: -.04em; line-height: 1;
          color: rgba(242,242,247,.92);
          -webkit-text-stroke: 1px rgba(99,102,241,.3);
        }

        /* dumbbell inside zero */
        .nf-db {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: nfRock 3s ease-in-out infinite;
          z-index: 3;
        }
        @keyframes nfRock {
          0%,100% { transform: translate(-50%,-50%) rotate(-14deg); }
          50%      { transform: translate(-50%,-50%) rotate(14deg); }
        }

        /* pulse rings */
        .nf-zring {
          position: absolute; top: 50%; left: 50%;
          border-radius: 50%; border: 1px solid; pointer-events: none;
        }
        .nf-zr1 {
          width: 80%; height: 80%;
          transform: translate(-50%,-50%);
          border-color: rgba(99,102,241,.35);
          animation: nfZring 3s ease-in-out 0s infinite;
        }
        .nf-zr2 {
          width: 108%; height: 108%;
          transform: translate(-50%,-50%);
          border-color: rgba(99,102,241,.13);
          animation: nfZring 3s ease-in-out .8s infinite;
        }
        @keyframes nfZring {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .7; }
          50%      { transform: translate(-50%,-50%) scale(1.06); opacity: .3; }
        }

        /* ── BADGE ── */
        .nf-badge {
          font-family: var(--ffm); font-size: .6875rem; font-weight: 500;
          letter-spacing: .16em; text-transform: uppercase; color: var(--violet);
          border: 1px solid rgba(99,102,241,.3); padding: .3rem 1rem;
          border-radius: 20px; margin-bottom: 1.25rem;
          display: inline-flex; align-items: center; gap: .5rem;
          background: rgba(99,102,241,.07);
        }
        .nf-bdot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--violet); flex-shrink: 0;
          animation: nfBdot 2s ease-in-out infinite;
        }
        @keyframes nfBdot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .2; transform: scale(.65); }
        }

        /* ── TITLE ── */
        .nf-title {
          font-size: clamp(1.6rem, 4vw, 2.25rem);
          font-weight: 700; letter-spacing: -.03em;
          color: var(--white); line-height: 1.1; margin-bottom: .75rem;
        }
        .nf-title span {
          background: linear-gradient(135deg, var(--violet), var(--violet2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── SUBTITLE ── */
        .nf-sub {
          font-size: .9375rem; color: var(--muted);
          line-height: 1.75; max-width: 360px;
          font-weight: 400; margin-bottom: 2.25rem;
        }

        /* ── BUTTON ── */
        .nf-btn {
          background: transparent; color: var(--white);
          border: 1px solid rgba(242,242,247,.22);
          padding: .7rem 2rem; border-radius: 22px;
          font-size: .9375rem; font-weight: 500; cursor: pointer;
          font-family: var(--ff);
          transition: border-color .2s, background .2s;
          display: inline-flex; align-items: center; gap: .5rem;
          margin-bottom: 2.5rem;
        }
        .nf-btn:hover {
          border-color: rgba(242,242,247,.5);
          background: rgba(242,242,247,.05);
        }

        /* ── HUD ROW ── */
        .nf-hud {
          display: flex; gap: 1.75rem; flex-wrap: wrap; justify-content: center;
          border-top: 1px solid var(--border); padding-top: 1.25rem;
        }
        .nf-hi {
          font-family: var(--ffm); font-size: .6875rem;
          color: rgba(242,242,247,.22); letter-spacing: .08em;
          display: flex; align-items: center; gap: .4rem;
        }
        .nf-hv { color: var(--green); }
      `}</style>

      <div className="nf-root">
        {/* glows */}
        <div className="nf-glow-top" />
        <div className="nf-glow-bot" />
        <div className="nf-grid" />
        <div className="nf-scan" />

        {/* corner HUD — no X/Y */}
        <div className="nf-corner nf-tr" ref={coordRef}>
          SYS: ONLINE<br />AI: ACTIVE
        </div>
        <div className="nf-corner nf-bl">SIFRA v2.0.4</div>
        <div className="nf-corner nf-br">ERR: 0x404</div>

        {/* navbar */}
        <nav className="nf-nav">
          <div className="nf-logo">
            Sifra<span>.</span>AI
          </div>
          <div className="nf-nav-hint">PAGE NOT FOUND</div>
        </nav>

        {/* content */}
        <div className="nf-content">

          {/* 4 · 0(dumbbell) · 4 */}
          <div className="nf-four-wrap">
            <div className="nf-digit">4</div>

            <div className="nf-zero-wrap">
              <div className="nf-zring nf-zr1" />
              <div className="nf-zring nf-zr2" />
              <div className="nf-zero-char">0</div>
              <div className="nf-db">
                <svg width="46" height="46" viewBox="0 0 72 72" fill="none">
                  <rect x="2"  y="20" width="12" height="32" rx="5"
                    fill="rgba(99,102,241,.25)" stroke="rgba(99,102,241,.85)" strokeWidth="1.4"/>
                  <rect x="6"  y="25" width="5"  height="22" rx="2.5"
                    fill="rgba(99,102,241,.45)" stroke="rgba(99,102,241,.6)"  strokeWidth="1"/>
                  <rect x="14" y="33" width="44" height="6"  rx="3"
                    fill="rgba(99,102,241,.2)"  stroke="rgba(99,102,241,.7)"  strokeWidth="1"/>
                  <rect x="61" y="25" width="5"  height="22" rx="2.5"
                    fill="rgba(99,102,241,.45)" stroke="rgba(99,102,241,.6)"  strokeWidth="1"/>
                  <rect x="58" y="20" width="12" height="32" rx="5"
                    fill="rgba(99,102,241,.25)" stroke="rgba(99,102,241,.85)" strokeWidth="1.4"/>
                  <rect x="18" y="34" width="20" height="2"  rx="1"
                    fill="rgba(255,255,255,.14)"/>
                  <circle cx="36" cy="36" r="4.5" fill="#34d399" opacity=".9"/>
                  <circle cx="36" cy="36" r="2"   fill="#07070a" opacity=".6"/>
                </svg>
              </div>
            </div>

            <div className="nf-digit">4</div>
          </div>

          {/* badge */}
          <div className="nf-badge">
            <div className="nf-bdot" />
            Page not found
          </div>

          {/* title — no "Dropped the page" */}
          <h1 className="nf-title">
            Looks like this <span>page</span> is lost.
          </h1>
          <p className="nf-sub">
            This page skipped leg day and went missing.
            Let Sifra guide you back to your training.
          </p>

          {/* single button */}
          <button
            id="backBtn"
            className="nf-btn"
            onClick={() => navigate(-1)}
          >
            ← Go back
          </button>

          {/* HUD */}
          <div className="nf-hud">
            <div className="nf-hi">STATUS <span className="nf-hv">404</span></div>
            <div className="nf-hi">PAGE   <span className="nf-hv">MISSING</span></div>
            <div className="nf-hi">ROUTE  <span className="nf-hv">NULL</span></div>
            <div className="nf-hi">AI     <span className="nf-hv">ONLINE</span></div>
          </div>

        </div>
      </div>
    </>
  );
}