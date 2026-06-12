import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";

// ── Route-level lazy imports — each page loads its own JS chunk on demand ──────
const AppointmentForm = lazy(() => import("@/pages/AppointmentForm"));
const Success         = lazy(() => import("@/pages/Success"));
const AdminLogin      = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard  = lazy(() => import("@/pages/AdminDashboard"));

// ── Shared page-level loading fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6]">
      <div
        className="flex flex-col items-center gap-3"
        aria-label="Loading page"
      >
        {/* Spinner */}
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(36,177,177,0.25)", borderTopColor: "#24B1B1" }}
        />
        <span className="text-xs font-medium tracking-wide" style={{ color: "rgba(0,121,121,0.55)" }}>
          Loading…
        </span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        {/* Suspense wraps all routes — each chunk shows PageLoader while downloading */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<AppointmentForm />} />
            <Route path="/success"      element={<Success />} />
            <Route path="/admin/login"  element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
