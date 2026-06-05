import { Link, useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, CalendarCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BG =
  "https://images.unsplash.com/photo-1463134836706-8bcc60f7d78b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920";

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
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function Success() {
  const { state } = useLocation();
  const appt = state?.appointment;
  if (!appt) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative" data-testid="success-page">
      <img src={BG} alt="calm" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-[#F9F8F6]/80" />
      <div className="relative min-h-screen flex items-center justify-center px-6">
        <div className="bg-white border border-stone-200 rounded-3xl shadow-sm max-w-xl w-full p-10">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">Confirmed</p>
          <h1 className="font-heading text-3xl sm:text-4xl tracking-tight mt-2" data-testid="success-title">
            Your appointment is booked.
          </h1>
          <p className="text-stone-500 mt-3">
            Hi {appt.first_name}, we're looking forward to seeing you. A summary of your booking is below.
          </p>

          <div className="mt-8 border border-stone-200 rounded-2xl p-6 bg-stone-50/50">
            <div className="flex items-start gap-3">
              <CalendarCheck className="w-5 h-5 text-indigo-700 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">When</p>
                <p className="font-heading text-xl text-stone-900" data-testid="success-datetime">
                  {fmtTime12(appt.slot)} · {fmtFullDate(appt.date)}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-500">Name</p>
                <p className="text-stone-900">{appt.first_name} {appt.last_name}</p>
              </div>
              <div>
                <p className="text-stone-500">Email</p>
                <p className="text-stone-900 break-all">{appt.email}</p>
              </div>
              <div>
                <p className="text-stone-500">Company</p>
                <p className="text-stone-900">{appt.company}</p>
              </div>
              <div>
                <p className="text-stone-500">Booking ID</p>
                <p className="text-stone-900 font-mono text-xs">{appt.id.slice(0, 8)}</p>
              </div>
            </div>
          </div>

          <Link to="/">
            <Button
              variant="outline"
              data-testid="back-home-btn"
              className="mt-8 rounded-full border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
