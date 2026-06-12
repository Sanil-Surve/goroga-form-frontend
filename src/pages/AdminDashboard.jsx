import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LogOut,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  BookCheck,
  Ban,
  Archive,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileDown,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

import {
  fetchAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  setStatusFilter,
  setDateFrom,
  setDateTo,
  setQ,
  setPage,
  setPageSize,
  toggleFiltersOpen,
  resetFilters,
  openDeleteConfirm,
  closeDeleteConfirm,
  selectItems,
  selectStats,
  selectTotal,
  selectAdminStatus,
  selectStatusFilter,
  selectDateFrom,
  selectDateTo,
  selectQ,
  selectFiltersOpen,
  selectConfirmDeleteId,
  selectPage,
  selectPageSize,
  selectTotalPages,
  selectHasFilters,
} from "@/store/slices/adminSlice";
import { useDebounce } from "@/hooks/useDebounce";

// ── Module-level constants (rendering-hoist-jsx) ──────────────────────────────
const CONCERN_LABELS = {
  stress:         "Stress",
  poor_sleep:     "Poor Sleep",
  anxiety:        "Anxiety",
  mental_fatigue: "Mental Fatigue",
  lack_of_focus:  "Lack of Focus",
  screen_fatigue: "Screen Fatigue",
  other:          "Other",
};

const CONCERN_DESCRIPTIONS = {
  stress:
    "A state of mental or emotional strain caused by demanding situations. It can affect mood, energy levels, and overall well-being.",
  poor_sleep:
    "Difficulty falling asleep, staying asleep, or getting restful sleep. Poor sleep can impact concentration, mood, and physical health.",
  anxiety:
    "A feeling of excessive worry, nervousness, or fear about everyday situations. It may cause restlessness, tension, and difficulty relaxing.",
  mental_fatigue:
    "A state of cognitive exhaustion caused by prolonged mental effort. It can reduce productivity, motivation, and decision-making ability.",
  lack_of_focus:
    "Difficulty concentrating on tasks or maintaining attention for extended periods. It can lead to reduced efficiency and increased mistakes.",
  screen_fatigue:
    "Eye strain and mental tiredness resulting from prolonged use of digital devices. Common symptoms include headaches, dry eyes, and reduced concentration.",
  other:
    "Any concern not listed above that the user wishes to discuss during the session.",
};

const STATUS_STYLES = {
  booked:    "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_DOT = {
  booked:    "bg-teal-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
};

const STAT_CONFIG = [
  { key: "total",     label: "Total",     icon: TrendingUp,   colorClass: "stat-card-total",     valueClass: "text-teal-700" },
  { key: "booked",    label: "Booked",    icon: BookCheck,    colorClass: "stat-card-booked",    valueClass: "text-cyan-700" },
  { key: "completed", label: "Completed", icon: CheckCircle2, colorClass: "stat-card-completed", valueClass: "text-emerald-700" },
  { key: "cancelled", label: "Cancelled", icon: Ban,          colorClass: "stat-card-cancelled", valueClass: "text-slate-400" },
];

// Decorative background orbs — hoisted (rendering-hoist-jsx)
const DecorativeOrbs = (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full blur-3xl"
      style={{ background: "rgba(36,177,177,0.07)" }}
    />
    <div
      className="absolute -bottom-16 right-0 w-[280px] h-[280px] rounded-full blur-3xl"
      style={{ background: "rgba(0,121,121,0.06)" }}
    />
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime12(slot) {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(s) {
  if (!s) return "";
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Action Buttons (shared) ───────────────────────────────────────────────────
function ActionButtons({ appt, onUpdateStatus, onDeleteRequest }) {
  return (
    <div className="action-group">
      {appt.status !== "completed" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
          onClick={() => onUpdateStatus(appt.id, "completed")}
          data-testid={`complete-btn-${appt.id}`}
          title="Mark complete"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </Button>
      )}
      {appt.status !== "cancelled" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
          onClick={() => onUpdateStatus(appt.id, "cancelled")}
          data-testid={`cancel-btn-${appt.id}`}
          title="Cancel"
        >
          <XCircle className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-full text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
        onClick={() => onDeleteRequest(appt.id)}
        data-testid={`delete-btn-${appt.id}`}
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────────────────────────

function MobileAppointmentCard({ appt, onUpdateStatus, onDeleteRequest }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-teal-100 p-4 shadow-sm transition-shadow hover:shadow-md"
      data-testid={`appt-row-${appt.id}`}
      style={{ boxShadow: "0 2px 12px rgba(0,121,121,0.07)" }}
    >
      {/* Top row: date + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-stone-900 text-sm">{fmtDate(appt.date)}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "#007979" }}>{fmtTime12(appt.slot)}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[appt.status]}`}
          data-testid={`appt-status-${appt.id}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[appt.status]}`} />
          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
        </span>
      </div>

      {/* Guest info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 text-sm truncate">
            {appt.first_name} {appt.last_name}
          </p>
          <p className="text-xs text-stone-500 truncate">{appt.designation} · {appt.company}</p>
          <p className="text-xs text-stone-400 truncate mt-0.5">{appt.email}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: expanded ? "rgba(36,177,177,0.12)" : "rgba(240,250,250,0.9)",
            border: "1px solid rgba(36,177,177,0.2)",
            color: "#007979",
          }}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-teal-50 space-y-2 animate-slide-down">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-stone-400 mb-1">Phone</p>
            <p className="text-sm text-stone-700">{appt.phone}</p>
          </div>
          {(appt.concerns || []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-stone-400 mb-1.5">Concerns</p>
              <div className="flex flex-wrap gap-1">
                {appt.concerns.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="text-[10px] font-medium"
                    style={{ borderColor: "rgba(36,177,177,0.3)", color: "#007979", background: "rgba(240,250,250,0.8)" }}
                  >
                    {CONCERN_LABELS[c] || c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end mt-3 pt-3 border-t border-teal-50">
        <ActionButtons appt={appt} onUpdateStatus={onUpdateStatus} onDeleteRequest={onDeleteRequest} />
      </div>
    </div>
  );
}

// ── Desktop Table Row ─────────────────────────────────────────────────────────
function AppointmentRow({ appt, onUpdateStatus, onDeleteRequest }) {
  return (
    <TableRow className="admin-table-row" data-testid={`appt-row-${appt.id}`}>
      <TableCell className="py-4">
        <p className="font-semibold text-stone-900 text-sm">{fmtDate(appt.date)}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "#007979" }}>{fmtTime12(appt.slot)}</p>
      </TableCell>
      <TableCell className="py-4">
        <p className="font-semibold text-stone-900 text-sm">{appt.first_name} {appt.last_name}</p>
        <p className="text-xs text-stone-500 mt-0.5">{appt.designation}</p>
      </TableCell>
      <TableCell className="py-4">
        <p className="text-sm text-stone-800 break-all">{appt.email}</p>
        <p className="text-xs text-stone-500 mt-0.5">{appt.phone}</p>
      </TableCell>
      <TableCell className="py-4">
        <p className="text-sm font-medium" style={{ color: "#007979" }}>{appt.company}</p>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(appt.concerns || []).map((c) => (
            <Badge
              key={c}
              variant="outline"
              className="text-[10px] font-medium"
              style={{ borderColor: "rgba(36,177,177,0.3)", color: "#007979", background: "rgba(240,250,250,0.8)" }}
            >
              {CONCERN_LABELS[c] || c}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[appt.status]}`}
          data-testid={`appt-status-${appt.id}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[appt.status]}`} />
          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
        </span>
      </TableCell>
      <TableCell className="py-4 text-right">
        <ActionButtons appt={appt} onUpdateStatus={onUpdateStatus} onDeleteRequest={onDeleteRequest} />
      </TableCell>
    </TableRow>
  );
}

// ── Static empty / loading states (rendering-hoist-jsx) ───────────────────────
const EmptyState = (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(240,250,250,0.9)", border: "1px solid rgba(36,177,177,0.15)" }}
        >
          <Archive className="w-7 h-7" style={{ color: "rgba(0,121,121,0.3)" }} />
        </div>
        <p className="text-stone-400 text-sm font-medium">No appointments match your filters</p>
        <p className="text-stone-300 text-xs">Try adjusting your search or date range</p>
      </div>
    </TableCell>
  </TableRow>
);

const LoadingState = (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-24">
      <Loader2 className="w-6 h-6 animate-spin inline" style={{ color: "#24B1B1" }} />
    </TableCell>
  </TableRow>
);

const MobileEmptyState = (
  <div className="flex flex-col items-center gap-3 py-20">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: "rgba(240,250,250,0.9)", border: "1px solid rgba(36,177,177,0.15)" }}
    >
      <Archive className="w-7 h-7" style={{ color: "rgba(0,121,121,0.3)" }} />
    </div>
    <p className="text-stone-400 text-sm font-medium">No appointments match your filters</p>
    <p className="text-stone-300 text-xs">Try adjusting your search or date range</p>
  </div>
);

const MobileLoadingState = (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#24B1B1" }} />
  </div>
);

// ── Pagination Button ─────────────────────────────────────────────────────────
function PaginationBtn({ onClick, disabled, active, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center min-w-[34px] h-[34px] px-2 rounded-xl text-xs font-semibold",
        "transition-all duration-150 border",
        active
          ? "text-white border-transparent"
          : "bg-white border-teal-100 text-stone-600 hover:border-teal-300 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-teal-100 disabled:hover:text-stone-600",
      ].join(" ")}
      style={active ? { background: "linear-gradient(135deg,#24B1B1 0%,#007979 100%)", boxShadow: "0 2px 8px rgba(36,177,177,0.35)" } : {}}
    >
      {children}
    </button>
  );
}

// ── Concerns Bar Chart ───────────────────────────────────────────────────────
function ConcernsBarChart({ items }) {
  const [hovered,  setHovered]  = useState(null);
  const [tooltip,  setTooltip]  = useState(null);
  const containerRef = useRef(null);
  // Detect mobile on each render (fine — no SSR here)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const data = useMemo(() => {
    const counts = {};
    Object.keys(CONCERN_LABELS).forEach((k) => { counts[k] = 0; });
    items.forEach((appt) => {
      (appt.concerns || []).forEach((c) => {
        if (counts[c] !== undefined) counts[c]++;
        else counts[c] = 1;
      });
    });
    return Object.entries(CONCERN_LABELS).map(([key, label]) => ({
      key,
      label,
      count: counts[key] || 0,
    }));
  }, [items]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // ── Responsive chart dimensions ─────────────────────────────────────────────
  const BAR_W      = isMobile ? 34  : 52;
  const PAD_L      = isMobile ? 26  : 40;
  const PAD_R      = 12;
  const PAD_T      = isMobile ? 18  : 20;
  const PAD_B      = isMobile ? 44  : 54;
  const HEIGHT     = isMobile ? 110 : 160;
  const N          = data.length;
  const MIN_SLOT_W = BAR_W + (isMobile ? 14 : 22);
  // Desktop: 900 logical units (SVG stretches to fill card width).
  // Mobile:  just enough room so every bar is readable; card scrolls horizontally.
  const TOTAL_VW   = isMobile
    ? Math.max(N * MIN_SLOT_W + PAD_L + PAD_R, 320)
    : 900;
  const SLOT_W     = (TOTAL_VW - PAD_L - PAD_R) / N;
  const chartH     = HEIGHT + PAD_T + PAD_B;
  const totalW     = TOTAL_VW;

  // Y-axis ticks (fewer on mobile)
  const tickCount = Math.min(maxCount, isMobile ? 3 : 5);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxCount / tickCount) * i)
  );

  const barColors = [
    "#24B1B1", "#20A3A3", "#1C9595", "#178787",
    "#137979", "#0F6B6B", "#0B5D5D",
  ];

  // ── Tooltip helpers ──────────────────────────────────────────────────────────
  const TIP_W = isMobile ? 200 : 260;

  const buildTooltip = useCallback((key, clientX, clientY) => {
    if (!containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const cW    = containerRef.current.offsetWidth;
    const x     = clientX - rect.left;
    const y     = clientY - rect.top;
    // Prefer right-of-cursor; clamp within card (8 px margin each side)
    const rawL  = x + 14;
    const useLeft = rawL + TIP_W < cW - 8;
    const clampedL = Math.max(8, Math.min(rawL, cW - TIP_W - 8));
    const rawR  = cW - x + 14;
    const clampedR = Math.max(8, Math.min(rawR, cW - TIP_W - 8));
    setTooltip({ key, x, y, useLeft, clampedL, clampedR });
  }, [TIP_W]);

  const handleMouseMove = useCallback((e) => {
    if (!hovered) return;
    buildTooltip(hovered, e.clientX, e.clientY);
  }, [hovered, buildTooltip]);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    setTooltip(null);
  }, []);

  // Touch: tap bar to show tooltip; tap background to dismiss
  const handleBarTouch = useCallback((key, e) => {
    const touch = e.touches[0] || e.changedTouches[0];
    setHovered(key);
    if (touch) buildTooltip(key, touch.clientX, touch.clientY);
  }, [buildTooltip]);

  const handleBgTouch = useCallback((e) => {
    const tag = e.target.tagName?.toLowerCase();
    if (tag !== "rect" && tag !== "text") { setHovered(null); setTooltip(null); }
  }, []);

  return (
    <div
      ref={containerRef}
      className="admin-card animate-fade-up"
      style={{ animationDelay: "60ms", marginBottom: "1.25rem", position: "relative" }}
      data-testid="concerns-bar-chart"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleBgTouch}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b" style={{ borderColor: "rgba(36,177,177,0.1)" }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(240,250,250,0.9)", border: "1px solid rgba(36,177,177,0.2)" }}
        >
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#24B1B1" }} />
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] uppercase font-semibold" style={{ color: "#007979" }}>
            Concerns Overview
          </p>
          <p className="text-[11px] text-stone-400 font-medium mt-0.5">
            Users reported per concern · current page
          </p>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && hovered && (() => {
        const d    = data.find((d) => d.key === tooltip.key);
        const desc = CONCERN_DESCRIPTIONS[tooltip.key];
        if (!d) return null;
        const { useLeft, clampedL, clampedR } = tooltip;
        return (
          <div
            style={{
              position:      "absolute",
              top:           tooltip.y - 12,
              ...(useLeft ? { left: clampedL } : { right: clampedR }),
              width:         TIP_W,
              zIndex:        50,
              pointerEvents: "none",
              transform:     "translateY(-100%)",
            }}
          >
            <div
              style={{
                background:   "rgba(255,255,255,0.98)",
                border:       "1px solid rgba(36,177,177,0.2)",
                borderRadius: 14,
                boxShadow:    "0 8px 32px rgba(0,121,121,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                padding:      isMobile ? "10px 12px" : "12px 14px",
                animation:    "tooltip-in 0.15s ease",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg,#24B1B1,#007979)", flexShrink: 0 }} />
                <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: "#007979" }}>
                  {d.label}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    background: "linear-gradient(135deg,#24B1B1,#007979)",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
                  }}
                >
                  {d.count} {d.count === 1 ? "user" : "users"}
                </span>
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: "rgba(36,177,177,0.1)", marginBottom: 8 }} />
              {/* Description */}
              {desc && (
                <p style={{ fontSize: isMobile ? 10 : 11, color: "#6b7280", lineHeight: 1.55, margin: 0 }}>
                  {desc}
                </p>
              )}
            </div>
            {/* Arrow */}
            <div
              style={{
                position: "absolute", bottom: -6,
                ...(useLeft ? { left: 18 } : { right: 18 }),
                width: 12, height: 12,
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(36,177,177,0.2)",
                borderTop: "none", borderLeft: "none",
                transform: "rotate(45deg)",
              }}
            />
          </div>
        );
      })()}

      {/* Chart — horizontal scroll on mobile; full-width stretch on desktop */}
      <div
        className="px-3 sm:px-4 pt-4 pb-2"
        style={{ overflowX: isMobile ? "auto" : "visible", overflowY: "visible", WebkitOverflowScrolling: "touch" }}
      >
        <svg
          viewBox={`0 0 ${TOTAL_VW} ${chartH}`}
          preserveAspectRatio={isMobile ? "xMinYMid meet" : "none"}
          width={isMobile ? TOTAL_VW : "100%"}
          height={chartH}
          aria-label="Concerns bar chart"
          style={{ display: "block", overflow: "visible", minWidth: isMobile ? TOTAL_VW : "100%" }}
        >
          {/* Y-axis grid lines + labels */}
          {ticks.map((tick) => {
            const y = PAD_T + HEIGHT - (tick / maxCount) * HEIGHT;
            return (
              <g key={tick}>
                <line
                  x1={PAD_L - 4} x2={totalW - PAD_R}
                  y1={y}         y2={y}
                  stroke={tick === 0 ? "rgba(36,177,177,0.25)" : "rgba(36,177,177,0.08)"}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                  strokeDasharray={tick === 0 ? "" : "4 5"}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD_L - 6} y={y + 4}
                  textAnchor="end"
                  fontSize={isMobile ? "9" : "10"}
                  fill="rgba(0,121,121,0.55)"
                  fontWeight="600"
                  style={{ fontFamily: "inherit" }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const slotX = PAD_L + i * SLOT_W;
            const barX  = slotX + (SLOT_W - BAR_W) / 2;
            const barH  = maxCount === 0 ? 2 : Math.max((d.count / maxCount) * HEIGHT, d.count > 0 ? 4 : 2);
            const y     = PAD_T + HEIGHT - barH;
            const isHov = hovered === d.key;
            const color = barColors[i % barColors.length];
            const cx    = slotX + SLOT_W / 2;

            return (
              <g
                key={d.key}
                onMouseEnter={() => setHovered(d.key)}
                onTouchStart={(e) => handleBarTouch(d.key, e)}
                style={{ cursor: "crosshair" }}
              >
                {/* Track */}
                <rect x={barX} y={PAD_T} width={BAR_W} height={HEIGHT} rx={isMobile ? 5 : 8} fill="rgba(240,250,250,0.7)" />
                {/* Fill */}
                <rect
                  x={barX} y={y} width={BAR_W} height={barH}
                  rx={isMobile ? 5 : 8}
                  fill={isHov ? "#007979" : color}
                  style={{ transition: "fill 0.18s" }}
                />
                {/* Count */}
                {d.count > 0 && (
                  <text
                    x={cx} y={y - 4}
                    textAnchor="middle"
                    fontSize={isMobile ? "9" : "11"}
                    fontWeight="700"
                    fill={isHov ? "#007979" : "#24B1B1"}
                    style={{ fontFamily: "inherit" }}
                  >
                    {d.count}
                  </text>
                )}
                {/* X label */}
                <foreignObject x={slotX} y={PAD_T + HEIGHT + 6} width={SLOT_W} height={isMobile ? 36 : 44}>
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      fontSize:   isMobile ? "9px" : "10px",
                      fontWeight: isHov ? "700" : "600",
                      color:      isHov ? "#007979" : "rgba(0,121,121,0.7)",
                      textAlign:  "center",
                      lineHeight: "1.3",
                      wordBreak:  "break-word",
                      transition: "color 0.18s",
                      padding:    "0 2px",
                    }}
                  >
                    {d.label}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { user, logout } = useAuth();

  // ── Redux state ──────────────────────────────────────────────────────────────
  const items           = useSelector(selectItems);
  const stats           = useSelector(selectStats);
  const total           = useSelector(selectTotal);
  const adminStatus     = useSelector(selectAdminStatus);
  const statusFilter    = useSelector(selectStatusFilter);
  const dateFrom        = useSelector(selectDateFrom);
  const dateTo          = useSelector(selectDateTo);
  const q               = useSelector(selectQ);          // committed (debounced) value
  const filtersOpen     = useSelector(selectFiltersOpen);
  const confirmDeleteId = useSelector(selectConfirmDeleteId);
  const hasFilters      = useSelector(selectHasFilters);
  const page            = useSelector(selectPage);
  const pageSize        = useSelector(selectPageSize);
  const totalPages      = useSelector(selectTotalPages);

  const loading = adminStatus === "loading";

  // ── Local input state for responsive typing + debounce ───────────────────────
  // `inputQ` updates immediately (fast UI), `debouncedQ` updates after 450 ms
  // silence, then commits to Redux which triggers the API call.
  const [inputQ, setInputQ] = useState(q);
  const debouncedQ = useDebounce(inputQ, 450);

  // Commit debounced value to Redux (fires API) only when it settles
  useEffect(() => {
    if (debouncedQ !== q) dispatch(setQ(debouncedQ));
  }, [debouncedQ]); // intentionally omit q/dispatch – we only want to react to the debounced value

  // Keep inputQ in sync when reset action clears q from outside (e.g. Reset filters)
  useEffect(() => {
    setInputQ(q);
  }, [q]);

  // ── Build query params (derived during render — rerender-derived-state) ──────
  const params = useMemo(() => {
    const p = { page, page_size: pageSize };
    if (statusFilter && statusFilter !== "all") p.status = statusFilter;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo)   p.date_to = dateTo;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [statusFilter, dateFrom, dateTo, q, page, pageSize]);

  // ── Fetch on param change ────────────────────────────────────────────────────
  const load = useCallback(() => {
    dispatch(fetchAppointments(params));
  }, [dispatch, params]);

  useEffect(() => { load(); }, [load]);

  // ── Toast on error — use a ref so it fires once per distinct error ────────────
  const adminError = useSelector((state) => state.admin.error);
  const lastAdminError = useRef(null);
  useEffect(() => {
    if (adminStatus === "failed" && adminError && adminError !== lastAdminError.current) {
      lastAdminError.current = adminError;
      toast.error(adminError);
    }
    if (adminStatus !== "failed") lastAdminError.current = null;
  }, [adminStatus, adminError]);

  // ── Stable action callbacks ──────────────────────────────────────────────────
  const handleUpdateStatus = useCallback(
    async (id, newStatus) => {
      const result = await dispatch(updateAppointmentStatus({ id, newStatus }));
      if (updateAppointmentStatus.fulfilled.match(result)) {
        toast.success(`Marked as ${newStatus}`);
        dispatch(fetchAppointments(params));
      } else {
        toast.error(result.payload || "Update failed");
      }
    },
    [dispatch, params]
  );

  const handleDelete = useCallback(
    async (id) => {
      const result = await dispatch(deleteAppointment(id));
      if (deleteAppointment.fulfilled.match(result)) {
        toast.success("Appointment deleted");
      } else {
        toast.error(result.payload || "Delete failed");
      }
    },
    [dispatch]
  );

  const handleOpenDeleteConfirm = useCallback(
    (id) => dispatch(openDeleteConfirm(id)),
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/admin/login");
  }, [logout, navigate]);

  const handleResetFilters = useCallback(() => {
    dispatch(resetFilters());
    // inputQ will sync via the useEffect above when q resets to ""
  }, [dispatch]);

  // ── Pagination helpers ───────────────────────────────────────────────────────
  const goToPage = useCallback((p) => dispatch(setPage(p)), [dispatch]);

  // Build visible page numbers with ellipsis for large page counts
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page]);
    if (page > 1) pages.add(page - 1);
    if (page < totalPages) pages.add(page + 1);
    // Always show first 2 and last 2
    pages.add(2);
    pages.add(totalPages - 1);
    return [...pages].sort((a, b) => a - b);
  }, [totalPages, page]);

  // ── Excel export ─────────────────────────────────────────────────────────────
  const exportToExcel = useCallback(() => {
    if (items.length === 0) {
      toast.info("No data to export");
      return;
    }
    const rows = items.map((a) => ({
      Date:         fmtDate(a.date),
      Time:         fmtTime12(a.slot),
      "First Name": a.first_name,
      "Last Name":  a.last_name,
      Designation:  a.designation,
      Company:      a.company,
      Email:        a.email,
      Phone:        a.phone,
      Concerns:     (a.concerns || []).map((c) => CONCERN_LABELS[c] || c).join(", "),
      Status:       a.status.charAt(0).toUpperCase() + a.status.slice(1),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)),
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appointments");
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    XLSX.writeFile(wb, `appointments_${timestamp}.xlsx`);
    toast.success(`Exported ${items.length} appointment${items.length !== 1 ? "s" : ""}`);
  }, [items]);

  return (
    <div className="admin-bg relative" data-testid="admin-dashboard-page">
      {DecorativeOrbs}

      {/* ── Sticky Header ── */}
      <header className="admin-header sticky top-0 z-40">
        {/* subtle dot overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* bottom edge glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* ── Left: Logo + Badge ── */}
          <div className="flex items-center gap-3">
            <img
              src="/gorogaicon.png"
              alt="Goroga"
              className="h-10 sm:h-11 w-auto"
              style={{ filter: "brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.2))" }}
            />
            <div
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#a7f3d0" }} />
              <span
                className="text-[10px] tracking-[0.2em] uppercase font-semibold"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                Admin
              </span>
            </div>
          </div>

          {/* ── Right: Email + Logout ── */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span
                className="text-[10px] tracking-[0.1em] uppercase font-semibold"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Signed in as
              </span>
              <span
                className="text-xs font-medium truncate max-w-[180px]"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {user?.email}
              </span>
            </div>

            <div className="hidden md:block w-px h-8 mx-1" style={{ background: "rgba(255,255,255,0.2)" }} />

            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.32)",
                color: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Page Title + Actions ── */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-fade-up">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "#007979" }}>
              Admin Portal
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900">
              Appointments
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={load}
              data-testid="refresh-btn"
              className="rounded-full gap-1.5 text-xs sm:text-sm px-3 sm:px-4 h-9 font-medium transition-all hover:-translate-y-[1px]"
              style={{ borderColor: "rgba(0,121,121,0.25)", color: "#007979", background: "rgba(255,255,255,0.9)" }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={exportToExcel}
              data-testid="export-excel-btn"
              disabled={loading || items.length === 0}
              className="rounded-full gap-1.5 text-xs sm:text-sm px-3 sm:px-5 h-9 font-semibold text-white border-0 transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #24B1B1 0%, #007979 100%)",
                boxShadow: "0 4px 16px rgba(36,177,177,0.35)",
              }}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {STAT_CONFIG.map(({ key, label, icon: Icon, colorClass, valueClass }, idx) => (
            <div
              key={key}
              className="stat-card animate-fade-up"
              style={{ animationDelay: `${idx * 60}ms` }}
              data-testid={`stat-${label.toLowerCase()}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase font-semibold text-stone-500">
                    {label}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-bold mt-1.5 tracking-tight ${valueClass}`}>
                    {stats[key]}
                  </p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(240,250,250,0.9)", border: "1px solid rgba(36,177,177,0.15)" }}
                >
                  <Icon className={`w-4.5 h-4.5 ${valueClass}`} style={{ width: "18px", height: "18px" }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Concerns Bar Chart ── */}
        <ConcernsBarChart items={items} />

        {/* ── Filters ── */}
        <div className="admin-card mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {/* Filter header — collapsible on mobile */}
          <button
            type="button"
            onClick={() => dispatch(toggleFiltersOpen())}
            className="w-full flex items-center justify-between p-4 sm:p-5 sm:cursor-default"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "#24B1B1" }} />
              <span className="text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: "#007979" }}>
                Filters
              </span>
              {hasFilters && (
                <span className="w-2 h-2 rounded-full animate-pulse-ring" style={{ background: "#24B1B1" }} />
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 sm:hidden transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
              style={{ color: "#24B1B1" }}
            />
          </button>

          {/* Filter body */}
          <div className={`px-4 pb-4 sm:px-5 sm:pb-5 sm:pt-0 sm:block ${filtersOpen ? "block" : "hidden"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search — local inputQ for instant feedback, debounced → Redux → API */}
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#24B1B1" }} />
                <Input
                  placeholder="Search name, email, company…"
                  value={inputQ}
                  onChange={(e) => setInputQ(e.target.value)}
                  data-testid="filter-search"
                  className="pl-9 h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100 placeholder:text-stone-300 focus-visible:ring-0"
                />
                {/* Subtle indicator that a debounced search is pending */}
                {inputQ !== q && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#24B1B1" }}
                  />
                )}
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={(v) => dispatch(setStatusFilter(v))}>
                <SelectTrigger className="h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 text-[10px] bg-white px-1 font-semibold z-10" style={{ color: "#007979" }}>
                  From
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => dispatch(setDateFrom(e.target.value))}
                  data-testid="filter-date-from"
                  className="h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 text-[10px] bg-white px-1 font-semibold z-10" style={{ color: "#007979" }}>
                  To
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => dispatch(setDateTo(e.target.value))}
                  data-testid="filter-date-to"
                  className="h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100"
                />
              </div>
            </div>

            {hasFilters && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  data-testid="filter-reset"
                  style={{ color: "#24B1B1" }}
                >
                  <RotateCcw className="w-3 h-3" /> Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile Card List (< md) ── */}
        <div className="block md:hidden space-y-3">
          {loading
            ? MobileLoadingState
            : items.length === 0
            ? MobileEmptyState
            : items.map((a) => (
                <MobileAppointmentCard
                  key={a.id}
                  appt={a}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteRequest={handleOpenDeleteConfirm}
                />
              ))
          }
        </div>

        {/* ── Desktop Table (≥ md) ── */}
        <div className="hidden md:block admin-card overflow-hidden animate-fade-up" style={{ animationDelay: "120ms" }}>
          <Table>
            <TableHeader>
              <TableRow
                className="hover:bg-transparent border-b"
                style={{ borderColor: "rgba(36,177,177,0.1)", background: "rgba(240,250,250,0.6)" }}
              >
                {["Date / Time", "Guest", "Contact", "Company", "Concerns", "Status", "Actions"].map((h, i) => (
                  <TableHead
                    key={h}
                    className={`text-[10px] tracking-[0.18em] uppercase font-semibold py-3.5 ${i === 6 ? "text-right" : ""}`}
                    style={{ color: "#007979" }}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? LoadingState
                : items.length === 0
                ? EmptyState
                : items.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appt={a}
                      onUpdateStatus={handleUpdateStatus}
                      onDeleteRequest={handleOpenDeleteConfirm}
                    />
                  ))
              }
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {!loading && total > 0 && (
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: count summary */}
            <p className="text-xs font-medium order-2 sm:order-1" style={{ color: "rgba(0,121,121,0.6)" }}>
              Showing{" "}
              <span className="font-semibold" style={{ color: "#007979" }}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>
              {" "}of{" "}
              <span className="font-semibold" style={{ color: "#007979" }}>{total}</span>
              {" "}appointment{total !== 1 ? "s" : ""}
            </p>

            {/* Right: page controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {/* Prev */}
                <PaginationBtn
                  label="Previous page"
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                </PaginationBtn>

                {/* Numbered pages with ellipsis */}
                {pageNumbers.map((p, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <span key={p} className="flex items-center gap-1.5">
                      {showEllipsis && (
                        <span className="text-xs text-stone-400 px-0.5">…</span>
                      )}
                      <PaginationBtn
                        label={`Page ${p}`}
                        active={p === page}
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </PaginationBtn>
                    </span>
                  );
                })}

                {/* Next */}
                <PaginationBtn
                  label="Next page"
                  disabled={page === totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </PaginationBtn>

                {/* Page size selector */}
                <select
                  value={pageSize}
                  onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                  className="ml-2 h-[34px] rounded-xl text-xs font-medium px-2 border border-teal-100 bg-white text-stone-600 focus:outline-none focus:border-teal-300 cursor-pointer"
                  aria-label="Rows per page"
                  data-testid="page-size-select"
                >
                  {[5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => { if (!o) dispatch(closeDeleteConfirm()); }}
      >
        <AlertDialogContent className="mx-4 rounded-3xl border-0" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <AlertDialogHeader>
            <div className="w-10 h-1 rounded-full mb-4" style={{ background: "linear-gradient(90deg, #24B1B1, #007979)" }} />
            <AlertDialogTitle className="text-stone-900">Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              This permanently removes the appointment record and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="confirm-delete-cancel"
              className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-confirm"
              onClick={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
              className="rounded-full text-white border-0 font-semibold"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
