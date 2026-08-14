import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-violet-400/15 bg-[#131323]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <h1 className="shrink-0 text-2xl font-extrabold inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent sm:text-3xl">
          Sifra.Ai
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
              className="rounded-lg px-3 py-3 text-[#c084fc] transition hover:bg-violet-500/10 hover:text-white sm:p-0"
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => navigate("/Login")}
            className="min-h-11 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] px-5 font-semibold text-white transition hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(168,85,247,.45)]"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
