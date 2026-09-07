import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-violet-400/15 bg-[#131323]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <h1 className="shrink-0 text-2xl font-black inline-block bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent sm:text-3xl tracking-tight">
          Sifra.AI
        </h1>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-xl border border-white/10 text-white sm:hidden"
        >
          <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"}`} />
        </button>
        <div
          className={`${open ? "flex" : "hidden"} absolute left-0 top-full w-full flex-col gap-1 border-b border-violet-400/15 bg-[#131323] p-4 shadow-2xl sm:static sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
        >
          {[
            ["Home", "home"],
            ["Features", "features"],
            ["Trainer", "trainer"],
          ].map(([label, id]) => (
            <Link
              key={id}
              to="/Landing_Page"
              onClick={() => {
                setOpen(false);
                document
                  .getElementById(id)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-lg px-3 py-3 text-zinc-300 transition hover:bg-violet-500/10 hover:text-white sm:p-0 text-sm font-medium"
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => navigate("/Login")}
            className="min-h-10 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition hover:brightness-110 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-[0.98]"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
