import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BackendProvider } from "@/contexts/BackendContext";
import { TrustAnchorProvider } from "@/contexts/TrustAnchorContext";
import { CapabilityProvider } from "@/contexts/CapabilityContext";
import { CapabilityGuard } from "@/components/CapabilityGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiError } from "@/client/core/ApiError";
import { refreshAccessToken } from "@/lib/token-manager";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EntitiesPage from "./pages/EntitiesPage";
import EntityDetailPage from "./pages/EntityDetailPage";
import EntityRegisterPage from "./pages/EntityRegisterPage";
import TrustAnchorsPage from "./pages/TrustAnchorsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import TrustMarksPage from "./pages/TrustMarksPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import RBACManagementPage from "./pages/RBACManagementPage";
import NotFound from "./pages/NotFound";

/**
 * Global retry handler for the generated OpenAPI client.
 *
 * When a query fails with a 401, we silently refresh the access token and
 * signal React Query to retry (which re-invokes OpenAPI.TOKEN → fresh token).
 * Only one retry is attempted for 401s; all other errors use default behaviour.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401 && failureCount === 0) {
          // Fire-and-forget: by the time React Query retries, the
          // refreshAccessToken promise has already stored the new pair and
          // OpenAPI.TOKEN resolver will read it.
          refreshAccessToken();
          return true;
        }
        // Default: retry up to 3 times for non-auth errors
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401 && failureCount === 0) {
          refreshAccessToken();
          return true;
        }
        return false;
      },
    },
  },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={
        <ProtectedRoute>
          <TrustAnchorProvider>
            <AppLayout />
          </TrustAnchorProvider>
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/entities" element={
          <CapabilityGuard capability="subordinates" fallback="placeholder">
            <EntitiesPage />
          </CapabilityGuard>
        } />
        <Route path="/entities/register" element={
          <CapabilityGuard capability="subordinates" operation="create" fallback="placeholder">
            <EntityRegisterPage />
          </CapabilityGuard>
        } />
        <Route path="/entities/:id" element={
          <CapabilityGuard capability="subordinates" fallback="placeholder">
            <EntityDetailPage />
          </CapabilityGuard>
        } />
        <Route path="/trust-anchors" element={
          <ProtectedRoute adminOnly>
            <CapabilityGuard capability="trust_anchors" fallback="placeholder">
              <TrustAnchorsPage />
            </CapabilityGuard>
          </ProtectedRoute>
        } />
        <Route path="/approvals" element={
          <ProtectedRoute adminOnly>
            <CapabilityGuard capability="subordinates" fallback="placeholder">
              <ApprovalsPage />
            </CapabilityGuard>
          </ProtectedRoute>
        } />
        <Route path="/trust-marks" element={
          <CapabilityGuard capability="federation_trust_marks" fallback="placeholder">
            <TrustMarksPage />
          </CapabilityGuard>
        } />
        <Route path="/users" element={
          <ProtectedRoute adminOnly>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/rbac" element={
          <ProtectedRoute adminOnly>
            <RBACManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackendProvider>
          <AuthProvider>
            <CapabilityProvider>
              <AppRoutes />
            </CapabilityProvider>
          </AuthProvider>
        </BackendProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
