import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import { ApiError } from "@/lib/api/client";
import { Building2, LogIn } from "lucide-react";

const WorkspaceSetup = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");

  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTemplate, setCreateTemplate] = useState<"blank" | "real_estate" | "agency">("blank");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await workspacesApi.createWorkspace({
        name: createName.trim(),
        password: createPassword,
        template: createTemplate,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível criar o workspace.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await workspacesApi.joinWorkspace({
        code: joinCode.trim().toUpperCase(),
        password: joinPassword,
      });
      setJoinSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Código ou senha inválidos.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (joinSuccess) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <p className="text-sm text-emerald-600 font-medium">
              Solicitação enviada com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Aguarde o administrador do workspace aprovar seu acesso. Enquanto isso, você pode criar um workspace próprio para começar a usar.
            </p>
            <button
              type="button"
              onClick={() => {
                setJoinSuccess(false);
                setMode("choose");
              }}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium"
            >
              Criar meu workspace
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "create") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold">Criar workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Defina um nome e uma senha para o workspace. Escolha um modelo para começar com colunas e tags prontas.
            </p>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="text-sm font-medium">Modelo do workspace</label>
            <div className="grid gap-2">
              {[
                { value: "blank" as const, label: "Em branco", desc: "Pipeline e tags vazios para configurar do zero" },
                { value: "real_estate" as const, label: "CRM para Imobiliária", desc: "Colunas: Qualificação, Visita, Proposta, Negociação, Fechado + tags de imóveis" },
                { value: "agency" as const, label: "CRM para Agência", desc: "Colunas: Lead, Reunião, Proposta, Fechado + tags Serviço/Produto" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer transition-colors ${
                    createTemplate === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={opt.value}
                    checked={createTemplate === opt.value}
                    onChange={() => setCreateTemplate(opt.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <label className="text-sm font-medium" htmlFor="create-name">
              Nome do workspace
            </label>
            <input
              id="create-name"
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: Minha Empresa"
            />
            <label className="text-sm font-medium" htmlFor="create-password">
              Senha do workspace
            </label>
            <input
              id="create-password"
              type="password"
              required
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Senha para convidados entrarem"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Criando..." : "Criar workspace"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (mode === "join") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold">Entrar em um workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Peça o código e a senha ao administrador do workspace para solicitar acesso.
            </p>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            <label className="text-sm font-medium" htmlFor="join-code">
              Código do workspace
            </label>
            <input
              id="join-code"
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
              placeholder="Ex: ABC123"
            />
            <label className="text-sm font-medium" htmlFor="join-password">
              Senha do workspace
            </label>
            <input
              id="join-password"
              type="password"
              required
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Senha fornecida pelo administrador"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Solicitar entrada"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Escolha seu workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um novo workspace ou entre em um existente com o código e a senha fornecidos pelo administrador.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="flex items-center gap-3 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Criar novo workspace</p>
              <p className="text-sm text-muted-foreground">
                Você será o administrador e poderá convidar outras pessoas.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("join")}
            className="flex items-center gap-3 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <LogIn className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Entrar em um workspace</p>
              <p className="text-sm text-muted-foreground">
                Use o código e a senha fornecidos pelo administrador.
              </p>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
};

export default WorkspaceSetup;
