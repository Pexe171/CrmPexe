import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";
import { useAuthMe } from "./hooks/useAuthMe";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AgentsPage from "./pages/Agents";
import ConversationsPage from "./pages/Conversations";
import AdminWorkspacesPage from "./pages/AdminWorkspaces";
import IntegrationsPage from "./pages/Integrations";
import ComingSoon from "./pages/ComingSoon";
import Signup from "./pages/Signup";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useAuthMe();

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

  return <>{children}</>;
}

const LoginRoute = () => {
  const { data, isLoading } = useAuthMe();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
          <Route path="/conversations" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
          <Route path="/admin/workspaces" element={<ProtectedRoute><AdminWorkspacesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
