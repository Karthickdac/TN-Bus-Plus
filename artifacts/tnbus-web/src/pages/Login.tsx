import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await signup(form.name, form.email, form.phone, form.password);
      }
      setLocation("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      {/* Left — Hero panel */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(135deg, #3730a3 0%, #6d28d9 45%, #0891b2 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl">TN Bus<span className="text-orange-300">+</span></span>
        </div>

        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Travel smarter<br />across <span className="text-orange-300">Tamil Nadu</span>
          </h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-sm">
            Book AC buses, track live location, check PNR status, and manage all your journeys in one place.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "1M+", label: "Tickets booked" },
              { value: "87%", label: "On-time rate" },
              { value: "6+", label: "Bus types" },
              { value: "24/7", label: "Live support" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-2xl font-extrabold text-orange-300">{s.value}</p>
                <p className="text-indigo-200 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-sm">© 2026 Tamil Nadu State Transport Corporation</p>
      </div>

      {/* Right — Form panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f4f6fb] px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Logo (mobile only) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-orange-500 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">TN</span>
            </div>
            <span className="font-extrabold text-lg text-slate-800">TN Bus<span className="text-indigo-600">+</span></span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-100">
              {(["login", "signup"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-4 text-sm font-bold transition-colors ${
                    mode === m
                      ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 16 : -16 }}
                  transition={{ duration: 0.22 }}
                >
                  <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
                    {mode === "login" ? "Welcome back!" : "Join TN Bus+"}
                  </h1>
                  <p className="text-slate-500 text-sm mb-6">
                    {mode === "login"
                      ? "Sign in to access your bookings and wallet."
                      : "Create your free account and start booking today."}
                  </p>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                      <>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Full name"
                            className="pl-10 h-12 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500"
                            value={form.name}
                            onChange={set("name")}
                            required
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Phone number"
                            type="tel"
                            className="pl-10 h-12 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500"
                            value={form.phone}
                            onChange={set("phone")}
                            required
                          />
                        </div>
                      </>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Email address"
                        type="email"
                        className="pl-10 h-12 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500"
                        value={form.email}
                        onChange={set("email")}
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Password"
                        type={showPass ? "text" : "password"}
                        className="pl-10 pr-10 h-12 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500"
                        value={form.password}
                        onChange={set("password")}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 text-sm"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {mode === "login" ? "Signing in…" : "Creating account…"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {mode === "login" ? "Sign In" : "Create Account"}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-xs text-slate-400 mt-5">
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <button
                      onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      {mode === "login" ? "Sign up free" : "Sign in"}
                    </button>
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            By continuing you agree to TNSTC's Terms of Service & Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
