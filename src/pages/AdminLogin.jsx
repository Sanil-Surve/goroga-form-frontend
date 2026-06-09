import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Static decorative orbs — hoisted (rendering-hoist-jsx)
const DecorativeDots = (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl"
      style={{ background: "rgba(36,177,177,0.08)" }}
    />
    <div
      className="absolute -bottom-24 right-0 w-[400px] h-[400px] rounded-full blur-3xl"
      style={{ background: "rgba(0,121,121,0.07)" }}
    />
  </div>
);

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (user) navigate("/admin/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) {
      toast.success("Welcome back");
      navigate("/admin/dashboard");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  return (
    <div
      className="min-h-screen flex bg-white relative"
      data-testid="admin-login-page"
    >
      {DecorativeDots}

      {/* ── Left Panel: Teal Branding ── */}
      <div
        className="hidden lg:flex flex-col items-start justify-center px-16 w-1/2 relative z-10"
        style={{
          background: "linear-gradient(160deg, #007979 0%, #24B1B1 100%)",
        }}
      >
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10">
          <img
            src="/gorogaicon.png"
            alt="Goroga"
            className="h-12 w-auto mb-10 drop-shadow-lg brightness-0 invert"
          />
          <span className="text-[11px] tracking-[0.22em] uppercase font-semibold text-white/60 mb-3 block">
            Admin Portal
          </span>
          <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-tight">
            Manage your
            <br />
            <span className="text-white/80">appointments</span>
          </h1>
          <p className="mt-4 text-white/55 text-base max-w-xs leading-relaxed">
            View, update, and track all wellness session bookings from one place.
          </p>

          {/* Feature chips */}
          <div className="mt-10 flex flex-col gap-3">
            {[
              "Appointment tracking",
              "Real-time availability",
              "Secure admin access",
            ].map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border w-fit"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs font-medium text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: White Login Card ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white relative z-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/gorogaicon.png" alt="Goroga" className="h-8 w-auto" />
          </div>

          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium transition-colors mb-8 gap-1.5 text-stone-400 hover:text-stone-700"
          >
            <ArrowLeft className="w-3 h-3" /> Back to booking
          </Link>

          {/* Card */}
          <div
            className="rounded-3xl p-8 border animate-fade-up"
            style={{
              borderColor: "#e5e7eb",
              boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 24px 48px rgba(0,121,121,0.07)",
            }}
          >
            {/* Teal accent strip */}
            <div
              className="w-10 h-1 rounded-full mb-6"
              style={{ background: "linear-gradient(90deg, #24B1B1, #007979)" }}
            />

            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#007979" }}>
              Sign in
            </p>
            <h2 className="text-2xl font-bold text-stone-900 mt-1 tracking-tight">Welcome back</h2>
            <p className="text-stone-400 mt-1.5 text-sm">Enter your credentials to continue.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
              {/* Email */}
              <div>
                <Label
                  htmlFor="email"
                  className="text-[11px] tracking-[0.18em] uppercase font-semibold text-stone-500"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="admin-login-email"
                  placeholder="admin@goroga.com"
                  className="mt-2 h-11 rounded-xl bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-300 focus-visible:ring-0 focus-visible:border-[#24B1B1] transition-colors"
                  {...register("email", { required: "Email required" })}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label
                  htmlFor="password"
                  className="text-[11px] tracking-[0.18em] uppercase font-semibold text-stone-500"
                >
                  Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    data-testid="admin-login-password"
                    placeholder="••••••••"
                    className="h-11 rounded-xl pr-11 bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-300 focus-visible:ring-0 focus-visible:border-[#24B1B1] transition-colors"
                    {...register("password", { required: "Password required" })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                data-testid="admin-login-submit"
                className="w-full h-11 rounded-full font-semibold text-sm border-0 mt-2 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 text-white"
                style={{
                  background: "linear-gradient(135deg, #24B1B1 0%, #007979 100%)",
                  boxShadow: "0 4px 20px rgba(36,177,177,0.35)",
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
