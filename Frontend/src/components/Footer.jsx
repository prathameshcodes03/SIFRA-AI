import React from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, Cpu, Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <Link to="/Landing_Page" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                SIFRA AI
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
              Browser-native kinematic intelligence. Sub-30ms pose estimation, real-time audio corrections, and automated rep tracking.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-emerald-700 font-medium">
                Inference Engine: Operational (Sub-30ms)
              </span>
            </div>
          </div>

          {/* Core Technology */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Kinematics
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500">
              <li className="hover:text-slate-900 transition cursor-pointer">
                33-Point Pose Tracking
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                RandomForest ML Classifier
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Sub-Second Voice Coach
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Range-of-Motion Cadence
              </li>
            </ul>
          </div>

          {/* Supported Exercises */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Exercises
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500">
              <li className="hover:text-slate-900 transition cursor-pointer">
                Squat Depth & Biomechanics
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Push-Up Elbow Alignment
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Plank Pelvic Neutrality
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Custom Routine Builder
              </li>
            </ul>
          </div>

          {/* Privacy */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Security & Privacy
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Zero Video Storage</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                <span>Local Browser Inference</span>
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                Encrypted Auth Sessions
              </li>
              <li className="hover:text-slate-900 transition cursor-pointer">
                No Wearables Required
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SIFRA AI Systems Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700">
              v2.4.0
            </span>
            <span>WebGL + MediaPipe + ElevenLabs</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
