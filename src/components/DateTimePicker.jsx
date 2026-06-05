import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Loader2, Clock } from "lucide-react";
import { api } from "@/lib/api";

function fmtDateISO(d) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime12(slot) {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtFullDate(d) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const ALLOWED_DATES = [
  "2026-06-10",
  "2026-06-11",
];

export default function DateTimePicker({ value, onChange }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [date, setDate] = useState(value?.date ? new Date(value.date) : null);
  const [slot, setSlot] = useState(value?.slot || null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);

  const dateISO = date ? fmtDateISO(date) : null;

  useEffect(() => {
    if (!dateISO) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get("/availability", { params: { date: dateISO } })
      .then(({ data }) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateISO]);

  useEffect(() => {
    onChange?.({ date: dateISO, slot });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO, slot]);

  const handleDateSelect = (d) => {
    setDate(d || null);
    setSlot(null);
  };

  return (
    <div
      className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
      data-testid="datetime-picker"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Calendar Side */}
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-indigo-700" />
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">
              Select date
            </p>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(d) => !ALLOWED_DATES.includes(fmtDateISO(d))}
            initialFocus
            data-testid="calendar"
          />
          <p className="text-xs text-stone-500 mt-3">Available: Jun 10 &amp; Jun 11, 2026 only</p>
        </div>

        {/* Time Slots Side */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-700" />
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">
                Select time
              </p>
            </div>
            {date && (
              <p className="text-sm text-stone-700 font-medium" data-testid="picker-date-label">
                {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </p>
            )}
          </div>

          {!date && (
            <div className="h-72 flex items-center justify-center text-stone-400 text-sm">
              Pick a date to see available time slots
            </div>
          )}

          {date && loading && (
            <div className="h-72 flex items-center justify-center text-stone-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading slots…
            </div>
          )}

          {date && !loading && availability && availability.closed && (
            <div className="h-72 flex items-center justify-center text-stone-500 text-sm">
              {availability.reason || "Closed"}
            </div>
          )}

          {date && !loading && availability && !availability.closed && (
            <div className="slot-scroll grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {availability.slots.map((s) => {
                const disabled = !s.available;
                const isSelected = slot === s.slot;
                return (
                  <button
                    type="button"
                    key={s.slot}
                    disabled={disabled}
                    onClick={() => setSlot(s.slot)}
                    data-testid={`time-slot-${s.slot}`}
                    className={[
                      "h-11 rounded-full border text-sm font-medium transition-all duration-200",
                      disabled
                        ? "border-stone-100 text-stone-300 bg-stone-50 cursor-not-allowed"
                        : isSelected
                        ? "bg-indigo-700 text-white border-indigo-700 shadow-sm hover:-translate-y-[1px]"
                        : "border-stone-200 text-stone-700 hover:border-indigo-600 hover:text-indigo-700 hover:-translate-y-[1px]",
                    ].join(" ")}
                  >
                    {fmtTime12(s.slot)}
                    {!disabled && s.booked > 0 && (
                      <span className={"ml-1 text-[10px] " + (isSelected ? "text-indigo-100" : "text-stone-400")}>
                        ({s.capacity - s.booked} left)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Bar */}
      {date && slot && (
        <div
          className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between"
          data-testid="selected-time-bar"
        >
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Selected time</p>
              <p className="text-base font-medium">
                {fmtTime12(slot)} · {fmtFullDate(date)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="bg-white text-indigo-700 hover:bg-stone-100"
            onClick={() => setSlot(null)}
            data-testid="cancel-selection-btn"
          >
            Cancel Selection
          </Button>
        </div>
      )}
    </div>
  );
}
