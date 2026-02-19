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

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();
  
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
          <CapabilityGuard capability="trust_marks" fallback="placeholder">
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
