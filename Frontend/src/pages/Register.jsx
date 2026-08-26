import { useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

const fields = [
  ["fullName", "Full name", "text"],
  ["email", "Email address", "email"],
  ["password", "Password", "password"],
  ["age", "Age", "number"],
  ["weight", "Weight (kg)", "number"],
];
const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    weight: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await api.post("/api/auth/register", formData);
      if (response.data.token)
        localStorage.setItem("token", response.data.token);
      setMessage(response.data.message);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        age: "",
        gender: "",
        weight: "",
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <section
      className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-cover bg-center px-4 py-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.3), transparent 34%), radial-gradient(circle at 80% 75%, rgba(6, 182, 212, 0.18), transparent 30%)",
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <form
        onSubmit={handleRegister}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-black/30 p-6 shadow-[0_0_50px_rgba(139,92,246,.25)] backdrop-blur-xl sm:p-8"
      >
        <h1 className="bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-center text-[clamp(2.25rem,10vw,3rem)] font-extrabold text-transparent">
          Sifra.AI
        </h1>
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Create account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Start your smarter fitness journey
          </p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <label
              key={name}
              className={
                name === "fullName" || name === "email" || name === "password"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <span className="sr-only">{label}</span>
              <input
                required
                type={type}
                placeholder={label}
                name={name}
                value={formData[name]}
                onChange={(e) =>
                  setFormData({ ...formData, [name]: e.target.value })
                }
                className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-white placeholder-gray-400 transition focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,.35)]"
              />
            </label>
          ))}
          <label>
            <span className="sr-only">Gender</span>
            <select
              required
              name="gender"
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="min-h-12 w-full rounded-xl border border-white/20 bg-[#181020] px-4 text-white transition focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,.35)]"
            >
              <option value="" disabled>
                Gender
              </option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>
        {message && (
          <p role="status" className="mt-4 text-center text-sm text-white/80">
            {message}
          </p>
        )}
        <button
          disabled={loading}
          className="mt-7 min-h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 font-semibold text-white transition hover:shadow-[0_0_30px_rgba(168,85,247,.6)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            to="/Login"
            className="font-medium text-violet-300 hover:text-violet-200"
          >
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
};
export default Register;
