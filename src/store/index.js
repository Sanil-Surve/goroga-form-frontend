import { configureStore } from "@reduxjs/toolkit";
import appointmentReducer from "./slices/appointmentSlice";
import adminReducer from "./slices/adminSlice";

export const store = configureStore({
  reducer: {
    appointment: appointmentReducer,
    admin: adminReducer,
  },
});
