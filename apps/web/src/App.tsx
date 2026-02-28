import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthMe } from "./hooks/useAuthMe";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AgentsPage from "./pages/Agents";
import SectionPage from "./pages/SectionPage";

const queryClient = new QueryClient();

type DashboardPage =
  | "dashboard"
  | "agents"
  | "conversations"
  | "contacts"
  | "sales"
  | "automations"
  | "integrations";

const ProtectedDashboard = ({ page = "dashboard" }: { page?: DashboardPage }) => {
  const { isLoading, isError } = useAuthMe();

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

  if (page === "dashboard") {
    return <Index />;
  }

  if (page === "agents") {
    return <AgentsPage />;
  }

  const sectionContent = {
    conversations: {
      title: "Conversas",
      description: "Acompanhe conversas em andamento e histórico de atendimentos."
    },
    contacts: {
      title: "Contatos",
      description: "Gerencie contatos e dados cadastrais da sua base."
    },
    sales: {
      title: "Vendas",
      description: "Visualize pipeline comercial, metas e desempenho de vendas."
    },
    automations: {
      title: "Automações",
      description: "Configure regras automatizadas para acelerar seus fluxos."
    },
    integrations: {
      title: "Integrações",
      description: "Conecte canais e sistemas externos ao seu workspace."
    }
  } as const;

  const section = sectionContent[page];

  return <SectionPage title={section.title} description={section.description} />;
};

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
          <Route path="/" element={<ProtectedDashboard page="dashboard" />} />
          <Route path="/agents" element={<ProtectedDashboard page="agents" />} />
          <Route path="/conversations" element={<ProtectedDashboard page="conversations" />} />
          <Route path="/contacts" element={<ProtectedDashboard page="contacts" />} />
          <Route path="/sales" element={<ProtectedDashboard page="sales" />} />
          <Route path="/automations" element={<ProtectedDashboard page="automations" />} />
          <Route path="/integrations" element={<ProtectedDashboard page="integrations" />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
