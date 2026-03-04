import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  useLocation
} from "react-router-dom";
import { ReactNode } from "react";
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
        Validando sessao...
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

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
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
    </>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
