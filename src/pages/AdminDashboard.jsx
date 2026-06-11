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

// ── Module-level constants ────────────────────────────────────────────────────
const CONCERN_LABELS = {
  stress:          "Stress",
  poor_sleep:      "Poor Sleep",
  anxiety:         "Anxiety",
  mental_fatigue:  "Mental Fatigue",
  lack_of_focus:   "Lack of Focus",
  screen_fatigue:  "Screen Fatigue",
  other:           "Other",
};

const STATUS_STYLES = {
  booked:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
};

const STATUS_DOT = {
  booked:    "bg-indigo-500",
  completed: "bg-emerald-500",
  cancelled: "bg-stone-400",
};

const STAT_CONFIG = [
  { key: "total",     label: "Total",     icon: CalendarDays, colorClass: "stat-card-total",     valueClass: "text-indigo-700" },
  { key: "booked",    label: "Booked",    icon: BookCheck,    colorClass: "stat-card-booked",    valueClass: "text-violet-700" },
  { key: "completed", label: "Completed", icon: CheckCircle2, colorClass: "stat-card-completed", valueClass: "text-emerald-700" },
  { key: "cancelled", label: "Cancelled", icon: Ban,          colorClass: "stat-card-cancelled", valueClass: "text-stone-400" },
];

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
          className="h-7 w-7 p-0 rounded-full text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
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
          className="h-7 w-7 p-0 rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-700"
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
        className="h-7 w-7 p-0 rounded-full text-red-500 hover:bg-red-100 hover:text-red-600"
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
      className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm"
      data-testid={`appt-row-${appt.id}`}
    >
      {/* Top row: date + status + actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-stone-900 text-sm">{fmtDate(appt.date)}</p>
          <p className="text-xs text-stone-500 mt-0.5">{fmtTime12(appt.slot)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[appt.status]}`}
            data-testid={`appt-status-${appt.id}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[appt.status]}`} />
            {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Guest info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 text-sm truncate">
            {appt.first_name} {appt.last_name}
          </p>
          <p className="text-xs text-stone-500 truncate">{appt.designation} · {appt.company}</p>
          <p className="text-xs text-stone-500 truncate mt-0.5">{appt.email}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
        >
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
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
                    className="text-[10px] border-stone-200 text-stone-600 bg-stone-50 font-normal"
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
      <div className="flex items-center justify-end mt-3 pt-3 border-t border-stone-100">
        <ActionButtons
          appt={appt}
          onUpdateStatus={onUpdateStatus}
          onDeleteRequest={onDeleteRequest}
        />
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
        <p className="text-xs text-stone-500 mt-0.5">{fmtTime12(appt.slot)}</p>
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
        <p className="text-sm text-stone-700 font-medium">{appt.company}</p>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(appt.concerns || []).map((c) => (
            <Badge
              key={c}
              variant="outline"
              className="text-[10px] border-stone-200 text-stone-600 bg-stone-50 font-normal"
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
        <ActionButtons
          appt={appt}
          onUpdateStatus={onUpdateStatus}
          onDeleteRequest={onDeleteRequest}
        />
      </TableCell>
    </TableRow>
  );
}

// ── Static empty / loading states ─────────────────────────────────────────────
const EmptyState = (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Archive className="w-10 h-10 text-stone-200" />
        <p className="text-stone-400 text-sm font-medium">No appointments match your filters</p>
        <p className="text-stone-300 text-xs">Try adjusting your search or date range</p>
      </div>
    </TableCell>
  </TableRow>
);

const LoadingState = (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-20">
      <Loader2 className="w-6 h-6 animate-spin inline text-stone-300" />
    </TableCell>
  </TableRow>
);

const MobileEmptyState = (
  <div className="flex flex-col items-center gap-3 py-16">
    <Archive className="w-10 h-10 text-stone-200" />
    <p className="text-stone-400 text-sm font-medium">No appointments match your filters</p>
    <p className="text-stone-300 text-xs">Try adjusting your search or date range</p>
  </div>
);

const MobileLoadingState = (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
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

    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? "").length)
      ),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appointments");

    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "_")
      .replace(":", "-");
    XLSX.writeFile(wb, `appointments_${timestamp}.xlsx`);
    toast.success(`Exported ${items.length} appointment${items.length !== 1 ? "s" : ""}`);
  }, [items]);

  return (
    <div className="admin-bg" data-testid="admin-dashboard-page">

      {/* ── Sticky Header ── */}
      <header className="admin-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/gorogaicon.png" alt="Goroga" className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] tracking-[0.2em] uppercase font-semibold px-2 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs text-stone-400 hidden md:inline font-medium truncate max-w-[160px]">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-btn"
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full gap-1.5 text-xs font-medium px-3"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Page Title ── */}
        <div className="flex items-center justify-between mb-5 sm:mb-7">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-stone-400">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900 mt-0.5">
              Appointments
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={load}
              data-testid="refresh-btn"
              className="rounded-full border-stone-300 text-stone-600 hover:text-stone-900 hover:bg-stone-100 gap-1.5 text-xs sm:text-sm px-3 sm:px-4"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              data-testid="export-excel-btn"
              disabled={loading || items.length === 0}
              className="rounded-full border-emerald-300 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 gap-1.5 text-xs sm:text-sm px-3 sm:px-4"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-7">
          {STAT_CONFIG.map(({ key, label, icon: Icon, colorClass, valueClass }) => (
            <div
              key={key}
              className={`stat-card ${colorClass}`}
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
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-50 flex items-center justify-center">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${valueClass}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="admin-card mb-4 sm:mb-5">
          {/* Filter header — collapsible on mobile */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 sm:p-5 sm:cursor-default"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-xs tracking-[0.15em] uppercase font-semibold text-stone-500">
                Filters
              </span>
              {hasFilters && (
                <span className="w-2 h-2 rounded-full bg-violet-500" />
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-stone-400 sm:hidden transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Filter body — always visible on sm+, collapsible on mobile */}
          <div className={`px-4 pb-4 sm:px-5 sm:pb-5 sm:pt-0 sm:block ${filtersOpen ? "block" : "hidden"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="Search name, email, company…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  data-testid="filter-search"
                  className="pl-9 bg-stone-50 border-stone-200 text-sm h-10 rounded-xl focus-visible:ring-violet-200 focus-visible:border-violet-400"
                />
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className="bg-stone-50 border-stone-200 h-10 rounded-xl text-sm"
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
                <label className="absolute -top-2 left-2.5 text-[10px] text-stone-400 bg-white px-1 font-medium z-10">
                  From
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="filter-date-from"
                  className="bg-stone-50 border-stone-200 h-10 rounded-xl text-sm"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 text-[10px] text-stone-400 bg-white px-1 font-medium z-10">
                  To
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="filter-date-to"
                  className="bg-stone-50 border-stone-200 h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            {hasFilters && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-violet-700 font-medium transition-colors"
                  data-testid="filter-reset"
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
        <div className="hidden md:block admin-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80 hover:bg-stone-50/80 border-b border-stone-100">
                {["Date / Time", "Guest", "Contact", "Company", "Concerns", "Status", "Actions"].map((h, i) => (
                  <TableHead
                    key={h}
                    className={`text-[10px] tracking-[0.18em] uppercase text-stone-400 font-semibold py-3 ${i === 6 ? "text-right" : ""}`}
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
          <p className="text-xs text-stone-400 mt-3 text-right">
            Showing {items.length} appointment{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => (!o && setConfirm(null))}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the appointment record and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-confirm"
              onClick={() => {
                if (confirm) handleDelete(confirm.id);
                setConfirm(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
