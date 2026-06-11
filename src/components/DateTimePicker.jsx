import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Loader2, Clock, CheckCircle2 } from "lucide-react";
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

// Hoist static data to module level (server-hoist-static-io)
const ALLOWED_DATES = ["2026-06-11"];

// Stable set for O(1) lookup (js-set-map-lookups)
const ALLOWED_SET = new Set(ALLOWED_DATES);

// Static JSX hoisted outside component (rendering-hoist-jsx)
const EmptyDateState = (
  <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-sm gap-2">
    <Clock className="w-8 h-8 opacity-30" />
    <p>Pick a date to see time slots</p>
  </div>
);

export default function DateTimePicker({ value, onChange }) {
  const [date, setDate] = useState(value?.date ? new Date(value.date) : null);
  const [slot, setSlot] = useState(value?.slot || null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);

  const dateISO = useMemo(() => (date ? fmtDateISO(date) : null), [date]);

  useEffect(() => {
    if (!dateISO) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get("/availability", { params: { date: dateISO } })
      .then(({ data }) => { if (!cancelled) setAvailability(data); })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateISO]);

  // Use primitive dependency (rerender-dependencies)
  useEffect(() => {
    onChange?.({ date: dateISO, slot });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO, slot]);

  // Stable callback (rerender-functional-setstate)
  const handleDateSelect = useCallback((d) => {
    setDate(d || null);
    setSlot(null);
  }, []);

  const handleSlotSelect = useCallback((s) => {
    setSlot(s);
  }, []);

  const handleCancelSlot = useCallback(() => setSlot(null), []);

  return (
    <div className="glass-picker" data-testid="datetime-picker">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ── Calendar Side ── */}
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-stone-200/70">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="w-4 h-4" style={{ color: "#24B1B1" }} />
            <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-stone-500">
              Select date
            </p>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(d) => !ALLOWED_SET.has(fmtDateISO(d))}
            initialFocus
            data-testid="calendar"
            className="rounded-xl"
          />
          <p className="text-[11px] text-stone-400 mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#24B1B1" }} />
            Available: Jun 11, 2026 only
          </p>
        </div>

        {/* ── Time Slots Side ── */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#24B1B1" }} />
              <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-stone-500">
                Select time
              </p>
            </div>
            {date && (
              <p className="text-xs text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-full" data-testid="picker-date-label">
                {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </p>
            )}
          </div>

          {!date && EmptyDateState}

          {date && loading && (
            <div className="h-64 flex items-center justify-center text-stone-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading slots…</span>
            </div>
          )}

          {date && !loading && availability && availability.closed && (
            <div className="h-64 flex items-center justify-center text-stone-500 text-sm">
              {availability.reason || "Closed"}
            </div>
          )}

          {date && !loading && availability && !availability.closed && (
            <div className="slot-scroll grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {availability.slots.map((s) => {
                const isDisabled = !s.available;
                const isSelected = slot === s.slot;
                return (
                  <button
                    type="button"
                    key={s.slot}
                    disabled={isDisabled}
                    onClick={() => handleSlotSelect(s.slot)}
                    data-testid={`time-slot-${s.slot}`}
                    className={[
                      "glass-slot-btn h-10 flex flex-col items-center justify-center",
                      isSelected ? "selected" : "",
                    ].join(" ")}
                  >
                    <span className="text-[12px] font-semibold leading-none">{fmtTime12(s.slot)}</span>
                    {!isDisabled && s.booked > 0 && (
                      <span className={`text-[9px] mt-0.5 leading-none ${isSelected ? "text-teal-100" : "text-stone-400"}`}>
                        {s.capacity - s.booked} left
                      </span>
                    )}
                    {isDisabled && (
                      <span className="text-[9px] mt-0.5 leading-none text-stone-300">Full</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Bar ── */}
      {date && slot && (
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #007979 0%, #24B1B1 100%)",
          }}
          data-testid="selected-time-bar"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "rgba(36,177,177,0.7)" }}>Selected</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {fmtTime12(slot)} · {fmtFullDate(date)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm text-xs font-medium rounded-full px-3"
            onClick={handleCancelSlot}
            data-testid="cancel-selection-btn"
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
