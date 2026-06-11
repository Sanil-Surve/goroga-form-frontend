import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  CalendarDays,
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
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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
  { key: "total",     label: "Total",     icon: TrendingUp,  colorClass: "stat-card-total",     valueClass: "text-teal-700" },
  { key: "booked",    label: "Booked",    icon: BookCheck,   colorClass: "stat-card-booked",    valueClass: "text-cyan-700" },
  { key: "completed", label: "Completed", icon: CheckCircle2,colorClass: "stat-card-completed", valueClass: "text-emerald-700" },
  { key: "cancelled", label: "Cancelled", icon: Ban,         colorClass: "stat-card-cancelled", valueClass: "text-slate-400" },
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

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, booked: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // rerender-derived-state — derive params during render, not in effect
  const params = useMemo(() => {
    const p = {};
    if (statusFilter && statusFilter !== "all") p.status = statusFilter;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [statusFilter, dateFrom, dateTo, q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/appointments", { params });
      setItems(data.items || []);
      setStats(data.stats || { total: 0, booked: 0, completed: 0, cancelled: 0 });
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (id, newStatus) => {
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Update failed");
    }
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/admin/appointments/${id}`);
      toast.success("Appointment deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Delete failed");
    }
  }, [load]);

  const openDeleteConfirm = useCallback((id) => setConfirm({ id }), []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/admin/login");
  }, [logout, navigate]);

  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setQ("");
  }, []);

  const hasFilters = statusFilter !== "all" || dateFrom || dateTo || q;

  const exportToExcel = useCallback(() => {
    if (items.length === 0) {
      toast.info("No data to export");
      return;
    }
    const rows = items.map((a) => ({
      Date: fmtDate(a.date),
      Time: fmtTime12(a.slot),
      "First Name": a.first_name,
      "Last Name": a.last_name,
      Designation: a.designation,
      Company: a.company,
      Email: a.email,
      Phone: a.phone,
      Concerns: (a.concerns || []).map((c) => CONCERN_LABELS[c] || c).join(", "),
      Status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
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
        {/* subtle dot overlay — contained by position:relative + overflow:hidden on .admin-header */}
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
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.28)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#a7f3d0" }}
              />
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
            {/* Divider */}
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

            <div
              className="hidden md:block w-px h-8 mx-1"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />

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
            <p
              className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-1"
              style={{ color: "#007979" }}
            >
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
              className={`stat-card animate-fade-up`}
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

        {/* ── Filters ── */}
        <div className="admin-card mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {/* Filter header — collapsible on mobile */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 sm:p-5 sm:cursor-default"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "#24B1B1" }} />
              <span
                className="text-xs tracking-[0.15em] uppercase font-semibold"
                style={{ color: "#007979" }}
              >
                Filters
              </span>
              {hasFilters && (
                <span
                  className="w-2 h-2 rounded-full animate-pulse-ring"
                  style={{ background: "#24B1B1" }}
                />
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
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#24B1B1" }}
                />
                <Input
                  placeholder="Search name, email, company…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  data-testid="filter-search"
                  className="pl-9 h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100 placeholder:text-stone-300 focus-visible:ring-0"
                  style={{ "--tw-ring-color": "rgba(36,177,177,0.2)" }}
                />
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className="h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100"
                  data-testid="filter-status"
                >
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
                  onChange={(e) => setDateFrom(e.target.value)}
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
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="filter-date-to"
                  className="h-10 rounded-xl text-sm bg-teal-50/50 border-teal-100"
                />
              </div>
            </div>

            {hasFilters && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={resetFilters}
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
                  onUpdateStatus={updateStatus}
                  onDeleteRequest={openDeleteConfirm}
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
                      onUpdateStatus={updateStatus}
                      onDeleteRequest={openDeleteConfirm}
                    />
                  ))
              }
            </TableBody>
          </Table>
        </div>

        {/* Row count */}
        {!loading && items.length > 0 && (
          <p className="text-xs mt-3 text-right font-medium" style={{ color: "rgba(0,121,121,0.6)" }}>
            Showing {items.length} appointment{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => (!o && setConfirm(null))}>
        <AlertDialogContent className="mx-4 rounded-3xl border-0" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <AlertDialogHeader>
            <div
              className="w-10 h-1 rounded-full mb-4"
              style={{ background: "linear-gradient(90deg, #24B1B1, #007979)" }}
            />
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
              onClick={() => { if (confirm) handleDelete(confirm.id); setConfirm(null); }}
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
