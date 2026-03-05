import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation
} from "react-router-dom";
import { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { useAuthMe } from "./hooks/useAuthMe";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AgentsPage from "./pages/Agents";
import ConversationsPage from "./pages/Conversations";
import AdminWorkspacesPage from "./pages/AdminWorkspaces";
import IntegrationsPage from "./pages/Integrations";
import FlowBuilderPage from "./pages/Automations/FlowBuilder";
import ComingSoon from "./pages/ComingSoon";
import PipelinePage from "./pages/Pipeline";
import SettingsTagsPage from "./pages/Settings/Tags";
import SettingsQueuesPage from "./pages/Settings/Queues";
import Signup from "./pages/Signup";
import WorkspaceSetup from "./pages/WorkspaceSetup";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: user, isLoading, isError, hasToken } = useAuthMe();
  const isWorkspaceSetup = location.pathname === "/workspace-setup";

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Validando sessão...
      </main>
    );
  }

  if (isError) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.currentWorkspaceId == null && !isWorkspaceSetup) {
    return <Navigate to="/workspace-setup" replace />;
  }

  return <>{children}</>;
}

const LoginRoute = () => {
  const { data, isLoading, hasToken } = useAuthMe();

  if (!hasToken) {
    return <Login />;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </main>
    );
  }

  if (data) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
};

function RouteErrorFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-lg font-semibold">Erro ao carregar esta página</h1>
        <p className="text-sm text-muted-foreground">
          Tente recarregar ou voltar ao início.
        </p>
        <Button onClick={() => (window.location.href = "/")}>Ir para o início</Button>
      </div>
    </main>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Outlet />} errorElement={<RouteErrorFallback />}>
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
      <Route path="/conversations" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/automations/flow" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      <Route path="/settings/tags" element={<ProtectedRoute><SettingsTagsPage /></ProtectedRoute>} />
      <Route path="/settings/queues" element={<ProtectedRoute><SettingsQueuesPage /></ProtectedRoute>} />
      <Route path="/admin/workspaces" element={<ProtectedRoute><AdminWorkspacesPage /></ProtectedRoute>} />
      <Route path="/workspace-setup" element={<ProtectedRoute><WorkspaceSetup /></ProtectedRoute>} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
