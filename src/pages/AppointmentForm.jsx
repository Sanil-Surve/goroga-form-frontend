import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Sparkles, Leaf, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DateTimePicker from "@/components/DateTimePicker";
import { api, formatApiErrorDetail } from "@/lib/api";

const CONCERNS = [
  { id: "stress", label: "Stress" },
  { id: "poor_sleep", label: "Poor Sleep" },
  { id: "anxiety", label: "Anxiety" },
  { id: "mental_fatigue", label: "Mental Fatigue" },
  { id: "lack_of_focus", label: "Lack of Focus" },
  { id: "screen_fatigue", label: "Screen Fatigue" },
  { id: "other", label: "Other" },
];

const HERO_IMG = "/splash.png";

export default function AppointmentForm() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [picked, setPicked] = useState({ date: null, slot: null });
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const toggleConcern = (id) => {
    setConcerns((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const onSubmit = async (form) => {
    if (concerns.length === 0) {
      toast.error("Please select at least one area of concern");
      return;
    }
    if (!picked.date || !picked.slot) {
      toast.error("Please select an appointment date and time");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        designation: form.designation,
        concerns,
        other_concern: concerns.includes("other") ? form.other_concern || "" : null,
        date: picked.date,
        slot: picked.slot,
      };
      const { data } = await api.post("/appointments", payload);
      toast.success("Appointment booked!");
      navigate("/success", { state: { appointment: data } });
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Booking failed");
    } finally {
      setSubmitting(false);
    }
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
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-violet-950/50 pointer-events-none" />

      {/* Floating glass logo */}
      <div className="relative z-10 flex justify-between items-center px-6 lg:px-12 pt-6">
        <img src="/gorogaicon.png" alt="Goroga" className="h-10 w-auto drop-shadow-lg" />
        <Link
          to="/admin/login"
          className="text-xs text-white/60 hover:text-white transition-colors backdrop-blur-sm bg-white/10 border border-white/20 px-3 py-1.5 rounded-full"
          data-testid="admin-login-link"
        >
          Admin →
        </Link>
      </div>

      {/* Centered glass card */}
      <div className="relative z-10 flex items-start justify-center px-4 py-10 min-h-[calc(100vh-80px)]">
        <div className="glass-card rounded-3xl w-full max-w-2xl p-8 lg:p-12">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">Goroga · Book a Session</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Book Your Appointment
            </h2>
            <p className="glass-muted mt-2 text-sm">A few details and you're set.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  data-testid="input-first-name"
                  className="mt-2 glass-input rounded-xl"
                  {...register("first_name", { required: "Required" })}
                />
                {errors.first_name && <p className="text-xs text-red-300 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="last_name" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  data-testid="input-last-name"
                  className="mt-2 glass-input rounded-xl"
                  {...register("last_name", { required: "Required" })}
                />
                {errors.last_name && <p className="text-xs text-red-300 mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  className="mt-2 glass-input rounded-xl"
                  {...register("email", { required: "Required" })}
                />
                {errors.email && <p className="text-xs text-red-300 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  data-testid="input-phone"
                  className="mt-2 glass-input rounded-xl"
                  {...register("phone", { required: "Required" })}
                />
                {errors.phone && <p className="text-xs text-red-300 mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Company + Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  Company
                </Label>
                <Input
                  id="company"
                  data-testid="input-company"
                  className="mt-2 glass-input rounded-xl"
                  {...register("company", { required: "Required" })}
                />
                {errors.company && <p className="text-xs text-red-300 mt-1">{errors.company.message}</p>}
              </div>
              <div>
                <Label htmlFor="designation" className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                  Designation
                </Label>
                <Input
                  id="designation"
                  data-testid="input-designation"
                  className="mt-2 glass-input rounded-xl"
                  {...register("designation", { required: "Required" })}
                />
                {errors.designation && (
                  <p className="text-xs text-red-300 mt-1">{errors.designation.message}</p>
                )}
              </div>
            </div>

            {/* Concerns */}
            <div>
              <Label className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                Areas of Concern
              </Label>
              <p className="text-sm glass-muted mt-1 mb-3">Select all that apply.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="concerns-grid">
                {CONCERNS.map((c) => {
                  const active = concerns.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleConcern(c.id)}
                      data-testid={`concern-${c.id}`}
                      className={[
                        "h-11 rounded-full text-sm font-medium transition-all duration-200",
                        active ? "glass-pill-active" : "glass-pill",
                      ].join(" ")}
                    >
                      {c.label}
                    </button>
                  );
                })}
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

            {/* Date/Time */}
            <div>
              <Label className="text-xs tracking-[0.2em] uppercase font-semibold glass-label">
                Appointment Date &amp; Time
              </Label>
              <div className="mt-3">
                <DateTimePicker value={picked} onChange={setPicked} />
              </div>
            </div>

            {/* Submit */}
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
