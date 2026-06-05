import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  LogOut,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
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

const CONCERN_LABELS = {
  stress: "Stress",
  poor_sleep: "Poor Sleep",
  anxiety: "Anxiety",
  mental_fatigue: "Mental Fatigue",
  lack_of_focus: "Lack of Focus",
  screen_fatigue: "Screen Fatigue",
  other: "Other",
};

const STATUS_STYLES = {
  booked: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
};

function fmtTime12(slot) {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const [confirm, setConfirm] = useState(null); // { id, action }

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

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/appointments/${id}`);
      toast.success("Appointment deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Delete failed");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setQ("");
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6]" data-testid="admin-dashboard-page">
      {/* Topbar */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/gorogaicon.png" alt="Goroga" className="h-16 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-500 hidden sm:inline">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-btn"
              className="text-stone-600 hover:text-stone-900"
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">Dashboard</p>
            <h1 className="font-heading text-3xl sm:text-4xl tracking-tight mt-2">Appointments</h1>
          </div>
          <Button
            variant="outline"
            onClick={load}
            data-testid="refresh-btn"
            className="rounded-full border-stone-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, color: "text-stone-900" },
            { label: "Booked", value: stats.booked, color: "text-indigo-700" },
            { label: "Completed", value: stats.completed, color: "text-emerald-700" },
            { label: "Cancelled", value: stats.cancelled, color: "text-stone-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-stone-200 rounded-2xl p-5"
              data-testid={`stat-${s.label.toLowerCase()}`}
            >
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">{s.label}</p>
              <p className={`font-heading text-3xl tracking-tight mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="Search name, email, company…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  data-testid="filter-search"
                  className="pl-9 bg-stone-50 border-stone-200"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-stone-50 border-stone-200" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="filter-date-from"
              className="bg-stone-50 border-stone-200"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="filter-date-to"
              className="bg-stone-50 border-stone-200"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={resetFilters}
              className="text-xs text-stone-500 hover:text-indigo-700"
              data-testid="filter-reset"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/60 hover:bg-stone-50/60">
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Date / Time</TableHead>
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Guest</TableHead>
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Contact</TableHead>
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Company</TableHead>
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Concerns</TableHead>
                <TableHead className="text-xs tracking-[0.18em] uppercase text-stone-500">Status</TableHead>
                <TableHead className="text-right text-xs tracking-[0.18em] uppercase text-stone-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-stone-400">
                    No appointments match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                items.map((a) => (
                  <TableRow key={a.id} data-testid={`appt-row-${a.id}`}>
                    <TableCell>
                      <p className="font-medium text-stone-900">{fmtDate(a.date)}</p>
                      <p className="text-sm text-stone-500">{fmtTime12(a.slot)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-stone-900">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-stone-500">{a.designation}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-stone-900 break-all">{a.email}</p>
                      <p className="text-xs text-stone-500">{a.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm text-stone-700">{a.company}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(a.concerns || []).map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="text-[10px] border-stone-200 text-stone-600 bg-stone-50"
                          >
                            {CONCERN_LABELS[c] || c}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[a.status]}`}
                        data-testid={`appt-status-${a.id}`}
                      >
                        {a.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {a.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateStatus(a.id, "completed")}
                            data-testid={`complete-btn-${a.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {a.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-700 hover:bg-amber-50"
                            onClick={() => updateStatus(a.id, "cancelled")}
                            data-testid={`cancel-btn-${a.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setConfirm({ id: a.id, action: "delete" })}
                          data-testid={`delete-btn-${a.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes the appointment record. This cannot be undone.
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
