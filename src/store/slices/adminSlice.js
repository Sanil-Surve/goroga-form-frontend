import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api, formatApiErrorDetail } from "@/lib/api";

// ── Async thunks ───────────────────────────────────────────────────────────────
export const fetchAppointments = createAsyncThunk(
  "admin/fetchAppointments",
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/appointments", { params });
      return data; // { items, stats, total }
    } catch (e) {
      return rejectWithValue(
        formatApiErrorDetail(e.response?.data?.detail) || "Failed to load"
      );
    }
  }
);

export const updateAppointmentStatus = createAsyncThunk(
  "admin/updateStatus",
  async ({ id, newStatus }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status: newStatus });
      return { id, newStatus };
    } catch (e) {
      return rejectWithValue(
        formatApiErrorDetail(e.response?.data?.detail) || "Update failed"
      );
    }
  }
);

export const deleteAppointment = createAsyncThunk(
  "admin/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/appointments/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(
        formatApiErrorDetail(e.response?.data?.detail) || "Delete failed"
      );
    }
  }
);

// ── Initial state ──────────────────────────────────────────────────────────────
const initialState = {
  // Data
  items: [],
  stats: { total: 0, booked: 0, completed: 0, cancelled: 0 },
  total: 0,           // total records count from the server (for pagination)

  // Filters
  statusFilter: "all",
  dateFrom: "",
  dateTo: "",
  q: "",              // debounced search query committed to store
  filtersOpen: false,

  // Pagination
  page: 1,
  pageSize: 10,

  // UI
  confirmDeleteId: null,

  // Async
  status: "idle",     // "idle" | "loading" | "succeeded" | "failed"
  error: null,
};

// ── Slice ──────────────────────────────────────────────────────────────────────
const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    // Filters — each one resets page to 1 so you never land on a ghost page
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
      state.page = 1;
    },
    setDateFrom: (state, action) => {
      state.dateFrom = action.payload;
      state.page = 1;
    },
    setDateTo: (state, action) => {
      state.dateTo = action.payload;
      state.page = 1;
    },
    setQ: (state, action) => {
      state.q = action.payload;
      state.page = 1;
    },

    // Pagination
    setPage: (state, action) => {
      state.page = action.payload;
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
      state.page = 1; // reset to first page when page size changes
    },

    // UI
    toggleFiltersOpen(state) { state.filtersOpen = !state.filtersOpen; },
    resetFilters(state) {
      state.statusFilter = "all";
      state.dateFrom = "";
      state.dateTo = "";
      state.q = "";
      state.page = 1;
    },
    openDeleteConfirm: (state, action) => { state.confirmDeleteId = action.payload; },
    closeDeleteConfirm: (state) => { state.confirmDeleteId = null; },
  },
  extraReducers: (builder) => {
    // fetchAppointments
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items ?? [];
        state.stats = action.payload.stats ?? initialState.stats;
        // Backend should return `total` for pagination; fall back to items.length
        state.total = action.payload.total ?? action.payload.items?.length ?? 0;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // updateAppointmentStatus — optimistic in-row status update
    builder.addCase(updateAppointmentStatus.fulfilled, (state, action) => {
      const { id, newStatus } = action.payload;
      const appt = state.items.find((a) => a.id === id);
      if (appt) appt.status = newStatus;
    });

    // deleteAppointment — remove from list + decrement total
    builder.addCase(deleteAppointment.fulfilled, (state, action) => {
      state.items = state.items.filter((a) => a.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
      state.confirmDeleteId = null;
    });
  },
});

export const {
  setStatusFilter, setDateFrom, setDateTo, setQ,
  setPage, setPageSize,
  toggleFiltersOpen, resetFilters,
  openDeleteConfirm, closeDeleteConfirm,
} = adminSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectItems           = (state) => state.admin.items;
export const selectStats           = (state) => state.admin.stats;
export const selectTotal           = (state) => state.admin.total;
export const selectAdminStatus     = (state) => state.admin.status;
export const selectStatusFilter    = (state) => state.admin.statusFilter;
export const selectDateFrom        = (state) => state.admin.dateFrom;
export const selectDateTo          = (state) => state.admin.dateTo;
export const selectQ               = (state) => state.admin.q;
export const selectFiltersOpen     = (state) => state.admin.filtersOpen;
export const selectConfirmDeleteId = (state) => state.admin.confirmDeleteId;
export const selectPage            = (state) => state.admin.page;
export const selectPageSize        = (state) => state.admin.pageSize;
export const selectTotalPages      = (state) =>
  Math.ceil(state.admin.total / state.admin.pageSize) || 1;
export const selectHasFilters      = (state) =>
  state.admin.statusFilter !== "all" || state.admin.dateFrom || state.admin.dateTo || state.admin.q;

export default adminSlice.reducer;
