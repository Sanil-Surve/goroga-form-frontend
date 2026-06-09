import { Link, useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, CalendarCheck, ArrowLeft, Clock, Building2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Pure helpers ──────────────────────────────────────────────────────────────
function fmtTime12(slot) {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtFullDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Static decorative elements (rendering-hoist-jsx) ─────────────────────────
const BgOrbs = (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl"
      style={{ background: "rgba(36,177,177,0.15)" }}
    />
    <div
      className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full blur-3xl"
      style={{ background: "rgba(0,121,121,0.18)" }}
    />
    <div
      className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full blur-2xl"
      style={{ background: "rgba(36,177,177,0.08)" }}
    />
  </div>
);

export default function Success() {
  const { state } = useLocation();
  const appt = state?.appointment;
  if (!appt) return <Navigate to="/" replace />;

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 py-12"
      data-testid="success-page"
      style={{
        background: "linear-gradient(135deg, #003f3f 0%, #007979 50%, #005555 100%)",
      }}
    >
      {BgOrbs}

      {/* Local background texture using splash image */}
      <img
        src="/splash.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity"
      />

      <div className="relative z-10 w-full max-w-lg animate-fade-up">
        {/* ── Success Card ── */}
        <div
          className="rounded-3xl p-8 sm:p-10"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          {/* ── Animated check icon ── */}
          <div className="flex justify-center mb-7">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
              style={{ background: "linear-gradient(135deg, #007979, #24B1B1)" }}
            >
              <CheckCircle2 className="w-10 h-10 text-white animate-check-pop" />
            </div>
          </div>

          {/* ── Heading ── */}
          <div className="text-center mb-8">
            <span
              className="text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: "rgba(36,177,177,0.75)" }}
            >
              Confirmed
            </span>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2 leading-tight"
              data-testid="success-title"
            >
              You're all set!
            </h1>
            <p className="text-white/50 mt-2.5 text-sm leading-relaxed">
              Hi <span className="text-white/80 font-medium">{appt.first_name}</span>, your appointment
              is confirmed. A summary is below.
            </p>
          </div>

          {/* ── Booking Details Card ── */}
          <div
            className="rounded-2xl p-5 mb-7 space-y-4"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Date/time row */}
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(36,177,177,0.2)" }}
              >
                <CalendarCheck className="w-4 h-4" style={{ color: "#24B1B1" }} />
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-[0.15em] font-semibold">When</p>
                <p
                  className="text-white font-semibold text-base mt-0.5"
                  data-testid="success-datetime"
                >
                  {fmtTime12(appt.slot)} · {fmtFullDate(appt.date)}
                </p>
              </div>
            </div>

            <div className="h-px bg-white/8" />

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-white/50" />
                </div>
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-[0.12em] font-semibold">Name</p>
                  <p className="text-white/80 text-sm font-medium mt-0.5">{appt.first_name} {appt.last_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-3 h-3 text-white/50" />
                </div>
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-[0.12em] font-semibold">Company</p>
                  <p className="text-white/80 text-sm font-medium mt-0.5">{appt.company}</p>
                </div>
              </div>
              <div className="col-span-2 flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Hash className="w-3 h-3 text-white/50" />
                </div>
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-[0.12em] font-semibold">Booking ID</p>
                  <p className="text-white/50 text-xs font-mono mt-0.5">{appt.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Email notice ── */}
          <p className="text-center text-xs text-white/35 mb-6">
            A confirmation has been sent to <span className="text-white/55">{appt.email}</span>
          </p>

          {/* ── Back button ── */}
          <Link to="/">
            <Button
              variant="outline"
              data-testid="back-home-btn"
              className="w-full rounded-full border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Book another session
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
