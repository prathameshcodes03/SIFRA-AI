import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "./Logo";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setOpen(false);
    if (location.pathname !== "/Landing_Page" && location.pathname !== "/") {
      navigate(`/Landing_Page#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { label: "Product", id: "product-showcase" },
    { label: "Capabilities", id: "capabilities" },
    { label: "How It Works", id: "how-it-works" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          to="/Landing_Page"
          className="group flex items-center gap-2.5 focus:outline-none"
        >
          <Logo size={42} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <button
              onClick={() => navigate("/Dashboard")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
            >
              <span>Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/Login")}
                className="cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate("/Register")}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
              >
                <span>Start Training</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {open && (
        <div className="border-b border-slate-200 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col space-y-1">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-slate-100">
            {user ? (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/Dashboard");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/Login");
                  }}
                  className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/Register");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white"
                >
                  <span>Start Training</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;