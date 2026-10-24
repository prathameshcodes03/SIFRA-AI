import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <Link to="/Landing_Page" className="inline-flex items-center gap-2.5">
            <Logo size="md" variant="primary" showWordmark={true} />
          </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              Browser-based AI fitness coaching. Pose detection, rep counting,
              form assessment, and voice feedback — all in your browser.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>
                <button
                  onClick={() => {
                    document.getElementById("product-showcase")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="cursor-pointer hover:text-slate-900 transition-colors"
                >
                  Product Showcase
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="cursor-pointer hover:text-slate-900 transition-colors"
                >
                  Capabilities
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="cursor-pointer hover:text-slate-900 transition-colors"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Inspirational */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inspiration
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>
                <button
                  onClick={() => {
                    document.getElementById("quote-marquee")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="cursor-pointer hover:text-slate-900 transition-colors"
                >
                  Mindset
                </button>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Account
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>
                <Link to="/Login" className="hover:text-slate-900 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/Register" className="hover:text-slate-900 transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} SIFRA AI. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Browser-based AI fitness coaching.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;