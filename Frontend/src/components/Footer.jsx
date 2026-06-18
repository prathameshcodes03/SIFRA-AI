import React from "react";

const Footer = () => {
  return (
    <footer className="relative w-full bg-[#05050A] border-t border-violet-500/10 overflow-hidden">

      {/* Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20">

        {/* Logo Section */}
                    <div className="text-center flex flex-col items-center">
                <h1 className="text-5xl font-black bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent">
                    Sifra.AI
                </h1>

                <p className="mt-5 text-lg font-medium bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 bg-clip-text text-transparent">
                    Train Smarter. Move Better. Achieve More.
                </p>
                </div>

        {/* Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16 text-center">

          <div>
            <h3 className="text-white font-semibold mb-4">
              Product
            </h3>

            <ul className="space-y-3 text-zinc-400">
              <li className="hover:text-violet-400 cursor-pointer transition">
                Features
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                AI Trainer
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                Analytics
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">
              Company
            </h3>

            <ul className="space-y-3 text-zinc-400">
              <li className="hover:text-violet-400 cursor-pointer transition">
                About
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                Contact
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                Careers
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">
              Socials
            </h3>

            <ul className="space-y-3 text-zinc-400">
              <li className="hover:text-violet-400 cursor-pointer transition">
                GitHub
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                LinkedIn
              </li>

              <li className="hover:text-violet-400 cursor-pointer transition">
                Instagram
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between">

          <p className="text-zinc-500 text-sm">
            © 2026 Sifra AI. All rights reserved.
          </p>

          <div className="flex gap-4 mt-4 md:mt-0">

            <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
              AI Powered
            </span>

            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              Fitness First
            </span>

          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;