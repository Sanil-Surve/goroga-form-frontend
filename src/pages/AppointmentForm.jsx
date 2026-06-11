import { useCallback, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DateTimePicker from "@/components/DateTimePicker";
import {
  toggleConcern,
  setPicked,
  submitAppointment,
  resetForm,
  selectConcerns,
  selectPicked,
  selectSubmitStatus,
  selectSubmitError,
  selectSubmittedAppointment,
} from "@/store/slices/appointmentSlice";

// ── Static data hoisted to module level (server-hoist-static-io) ─────────────
const CONCERNS = [
  { id: "stress",         label: "Stress" },
  { id: "poor_sleep",     label: "Poor Sleep" },
  { id: "anxiety",        label: "Anxiety" },
  { id: "mental_fatigue", label: "Mental Fatigue" },
  { id: "lack_of_focus",  label: "Lack of Focus" },
  { id: "screen_fatigue", label: "Screen Fatigue" },
  { id: "other",          label: "Other" },
];

const HERO_IMG = "/splash.png";

// ── Extracted stable component (rerender-no-inline-components) ────────────────
function ConcernPill({ concern, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(concern.id)}
      data-testid={`concern-${concern.id}`}
      className={[
        "h-11 rounded-full text-sm font-medium transition-all duration-200",
        active ? "glass-pill-active" : "glass-pill",
      ].join(" ")}
    >
      {concern.label}
    </button>
  );
}

// ── Stable field row for label + input pair ───────────────────────────────────
function GlassField({ id, label, error, children }) {
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] tracking-[0.18em] uppercase font-semibold glass-label">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {error && <p className="text-xs text-red-300 mt-1.5">{error}</p>}
    </div>
  );
}

export default function AppointmentForm() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();

  // ── Redux state ──────────────────────────────────────────────────────────────
  const concerns            = useSelector(selectConcerns);
  const picked              = useSelector(selectPicked);
  const submitStatus        = useSelector(selectSubmitStatus);
  const submitError         = useSelector(selectSubmitError);
  const submittedAppointment = useSelector(selectSubmittedAppointment);

  const submitting = submitStatus === "loading";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // ── Navigate on success ──────────────────────────────────────────────────────
  useEffect(() => {
    if (submitStatus === "succeeded" && submittedAppointment) {
      navigate("/success", { state: { appointment: submittedAppointment } });
      // Reset after navigation so the store is clean for next visit
      dispatch(resetForm());
    }
  }, [submitStatus, submittedAppointment, navigate, dispatch]);

  // ── Show toast on error — use a ref so the toast fires exactly once per
  //    distinct error, not on every re-render while status stays "failed" ────────
  const lastToastedError = useRef(null);
  useEffect(() => {
    if (submitStatus === "failed" && submitError && submitError !== lastToastedError.current) {
      lastToastedError.current = submitError;
      toast.error(submitError);
    }
    // Clear the sentinel when status leaves "failed" so next error can show again
    if (submitStatus !== "failed") {
      lastToastedError.current = null;
    }
  }, [submitStatus, submitError]);

  // ── Stable callbacks ─────────────────────────────────────────────────────────
  const handleToggleConcern = useCallback(
    (id) => dispatch(toggleConcern(id)),
    [dispatch]
  );

  const handlePickedChange = useCallback(
    (value) => dispatch(setPicked(value)),
    [dispatch]
  );

  const onSubmit = async (form) => {
    if (concerns.length === 0) {
      toast.error("Please select at least one area of concern");
      return;
    }
    if (!picked.date || !picked.slot) {
      toast.error("Please select an appointment date and time");
      return;
    }

    const payload = {
      first_name:    form.first_name,
      last_name:     form.last_name,
      email:         form.email,
      phone:         form.phone,
      company:       form.company,
      designation:   form.designation,
      concerns,
      other_concern: concerns.includes("other") ? form.other_concern || "" : null,
      date:          picked.date,
      slot:          picked.slot,
    };

    dispatch(submitAppointment(payload));
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      data-testid="appointment-form-page"
      style={{
        backgroundImage: `url(${HERO_IMG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/45 to-violet-950/55 pointer-events-none" />

      {/* Topbar */}
      <div className="relative z-10 flex justify-between items-center px-6 lg:px-12 pt-6">
        <img src="/gorogaicon.png" alt="Goroga" className="h-10 w-auto drop-shadow-lg" />
        <Link
          to="/admin/login"
          className="text-xs text-white/55 hover:text-white/90 transition-colors backdrop-blur-sm bg-white/10 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/15"
          data-testid="admin-login-link"
        >
          Admin →
        </Link>
      </div>

      {/* Main card */}
      <div className="relative z-10 flex items-start justify-center px-4 py-10 min-h-[calc(100vh-80px)]">
        <div className="glass-card rounded-3xl w-full max-w-2xl p-8 lg:p-12 animate-fade-up">

          {/* Header */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase font-semibold px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/15 mb-3">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#24B1B1" }} />
              Goroga · Book a Session
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
              Book Your Appointment
            </h2>
            <p className="glass-muted mt-2 text-sm">A few details and you're set.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Name ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassField id="first_name" label="First Name" error={errors.first_name?.message}>
                <Input
                  id="first_name"
                  data-testid="input-first-name"
                  className="glass-input rounded-xl"
                  {...register("first_name", { required: "Required" })}
                />
              </GlassField>
              <GlassField id="last_name" label="Last Name" error={errors.last_name?.message}>
                <Input
                  id="last_name"
                  data-testid="input-last-name"
                  className="glass-input rounded-xl"
                  {...register("last_name", { required: "Required" })}
                />
              </GlassField>
            </div>

            <div className="glass-section-divider" />

            {/* ── Contact ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassField id="email" label="Email" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  className="glass-input rounded-xl"
                  {...register("email", { required: "Required" })}
                />
              </GlassField>
              <GlassField id="phone" label="Phone Number" error={errors.phone?.message}>
                <Input
                  id="phone"
                  type="tel"
                  data-testid="input-phone"
                  className="glass-input rounded-xl"
                  {...register("phone", { required: "Required" })}
                />
              </GlassField>
            </div>

            <div className="glass-section-divider" />

            {/* ── Company ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassField id="company" label="Company" error={errors.company?.message}>
                <Input
                  id="company"
                  data-testid="input-company"
                  className="glass-input rounded-xl"
                  {...register("company", { required: "Required" })}
                />
              </GlassField>
              <GlassField id="designation" label="Designation" error={errors.designation?.message}>
                <Input
                  id="designation"
                  data-testid="input-designation"
                  className="glass-input rounded-xl"
                  {...register("designation", { required: "Required" })}
                />
              </GlassField>
            </div>

            <div className="glass-section-divider" />

            {/* ── Areas of Concern ── */}
            <div>
              <Label className="text-[11px] tracking-[0.18em] uppercase font-semibold glass-label">
                Areas of Concern
              </Label>
              <p className="text-xs glass-muted mt-1 mb-3">Select all that apply.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-testid="concerns-grid">
                {CONCERNS.map((c) => (
                  <ConcernPill
                    key={c.id}
                    concern={c}
                    active={concerns.includes(c.id)}
                    onToggle={handleToggleConcern}
                  />
                ))}
              </div>
              {concerns.includes("other") && (
                <Textarea
                  placeholder="Tell us more (optional)"
                  rows={3}
                  data-testid="input-other-concern"
                  className="mt-4 glass-textarea rounded-xl resize-none"
                  {...register("other_concern")}
                />
              )}
            </div>

            <div className="glass-section-divider" />

            {/* ── Date & Time ── */}
            <div>
              <Label className="text-[11px] tracking-[0.18em] uppercase font-semibold glass-label">
                Appointment Date &amp; Time
              </Label>
              <div className="mt-3">
                <DateTimePicker value={picked} onChange={handlePickedChange} />
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                data-testid="submit-booking-btn"
                className="w-full h-12 text-white text-base font-semibold rounded-full glass-btn-primary border-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…
                  </>
                ) : (
                  <>
                    Confirm Appointment <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs glass-muted mt-3 text-center">
                By confirming, you agree to our wellness session terms.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
