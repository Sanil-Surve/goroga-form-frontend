import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api, formatApiErrorDetail } from "@/lib/api";

// ── Async thunk ────────────────────────────────────────────────────────────────
export const submitAppointment = createAsyncThunk(
  "appointment/submit",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/appointments", payload);
      return data;
    } catch (e) {
      return rejectWithValue(
        formatApiErrorDetail(e.response?.data?.detail) || "Booking failed"
      );
    }
  }
);

// ── Initial state ──────────────────────────────────────────────────────────────
const initialState = {
  // Form selections (not in react-hook-form — your custom state)
  concerns: [],         // string[]
  picked: {
    date: null,         // "YYYY-MM-DD"
    slot: null,         // "HH:MM"
  },

  // Async status
  status: "idle",       // "idle" | "loading" | "succeeded" | "failed"
  error: null,          // string | null
  submittedAppointment: null, // the API response after success
};

// ── Slice ──────────────────────────────────────────────────────────────────────
const appointmentSlice = createSlice({
  name: "appointment",
  initialState,
  reducers: {
    toggleConcern(state, action) {
      const id = action.payload;
      const idx = state.concerns.indexOf(id);
      if (idx === -1) {
        state.concerns.push(id);
      } else {
        state.concerns.splice(idx, 1);
      }
    },
    setPicked(state, action) {
      state.picked = action.payload; // { date, slot }
    },
    resetForm(state) {
      state.concerns = [];
      state.picked = { date: null, slot: null };
      state.status = "idle";
      state.error = null;
      state.submittedAppointment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAppointment.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(submitAppointment.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.submittedAppointment = action.payload;
      })
      .addCase(submitAppointment.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { toggleConcern, setPicked, resetForm } = appointmentSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectConcerns = (state) => state.appointment.concerns;
export const selectPicked = (state) => state.appointment.picked;
export const selectSubmitStatus = (state) => state.appointment.status;
export const selectSubmitError = (state) => state.appointment.error;
export const selectSubmittedAppointment = (state) => state.appointment.submittedAppointment;

export default appointmentSlice.reducer;
