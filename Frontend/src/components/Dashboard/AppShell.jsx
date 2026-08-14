import { useState } from "react";
import DashNavbar from "./DashNavbar";
import DashSidebar from "./DashSidebar";

const AppShell = ({ children, footer }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <section className="min-h-screen overflow-x-hidden bg-[#05050A] text-white">
      <DashNavbar onMenuToggle={() => setMenuOpen((open) => !open)} />
      <DashSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="mx-auto w-full max-w-[90rem] px-4 pb-12 pt-5 sm:px-6 lg:ml-[15rem] lg:w-[calc(100%-15rem)] lg:px-8">
        {children}
      </main>
      {footer && <div className="lg:ml-[15rem]">{footer}</div>}
    </section>
  );
};

export default AppShell;
