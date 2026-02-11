"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AutomationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
};

type AutomationInstance = {
  id: string;
  status: string;
  enabled?: boolean | null;
  createdAt: string;
  configJson?: Record<string, unknown> | null;
  template: AutomationTemplate;
};

type AutomationInstancesResponse = {
  data: AutomationInstance[];
};

const fallbackInstances: AutomationInstance[] = [
  {
    id: "inst-001",
    status: "ACTIVE",
    enabled: true,
    createdAt: new Date().toISOString(),
    configJson: {
      apiKey: "sk_live_...",
      sheetId: "1A2B3C4D5E"
    },
    template: {
      id: "tmpl-001",
      name: "Follow-up automático",
      description: "Dispara lembretes para leads com proposta pendente.",
      category: "Vendas"
    }
  },
  {
    id: "inst-002",
    status: "PAUSED",
    enabled: false,
    createdAt: new Date().toISOString(),
    configJson: {
      apiKey: "sk_live_...",
      spreadsheetId: "SPREADSHEET-9912"
    },
    template: {
      id: "tmpl-002",
      name: "Resumo diário do suporte",
      description: "Gera um resumo diário das conversas em aberto.",
      category: "Atendimento"
    }
  }
];

const defaultConfigKeys = ["apiKey", "sheetId", "spreadsheetId"];

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

export default function MinhasInstalacoesPage() {
  const [instances, setInstances] = useState<AutomationInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] =
    useState<AutomationInstance | null>(null);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const params = new URLSearchParams({ page: "1", perPage: "50" });
        const response = await fetch(
          `${apiUrl}/api/automation-instances?${params.toString()}`,
          {
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error(
            "Não foi possível carregar as instalações do marketplace."
          );
        }

        const data = (await response.json()) as AutomationInstancesResponse;
        setInstances(data.data);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar instalações.";
        setError(message);
        setInstances(fallbackInstances);
      } finally {
        setLoading(false);
      }
    };

    void fetchInstances();
  }, []);

  useEffect(() => {
    if (!selectedInstance) {
      setConfigDraft({});
      return;
    }

    const initialConfig = selectedInstance.configJson ?? {};
    const nextConfig: Record<string, string> = {};

    defaultConfigKeys.forEach((key) => {
      const value = initialConfig[key];
      if (value !== undefined && value !== null) {
        nextConfig[key] = String(value);
      }
    });

    Object.entries(initialConfig).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      nextConfig[key] = String(value);
    });

    setConfigDraft(nextConfig);
  }, [selectedInstance]);

  const configEntries = useMemo(
    () => Object.entries(configDraft),
    [configDraft]
  );

  const handleToggle = async (instance: AutomationInstance) => {
    setTogglingId(instance.id);
    setError(null);
    try {
      const action = instance.enabled ? "disable" : "enable";
      const response = await fetch(
        `${apiUrl}/api/automations/${instance.id}/${action}`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível alterar o status da automação.");
      }

      const updated = (await response.json()) as AutomationInstance;
      setInstances((prev) =>
        prev.map((item) => (item.id === instance.id ? updated : item))
      );
    } catch (toggleError) {
      const message =
        toggleError instanceof Error
          ? toggleError.message
          : "Erro inesperado ao alternar automação.";
      setError(message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveConfig = () => {
    if (!selectedInstance) {
      return;
    }

    setInstances((prev) =>
      prev.map((item) =>
        item.id === selectedInstance.id
          ? {
              ...item,
              configJson: { ...configDraft }
            }
          : item
      )
    );
    setSelectedInstance(null);
  };

  const handleAddConfig = () => {
    if (!newConfigKey.trim()) {
      return;
    }
    setConfigDraft((prev) => ({
      ...prev,
      [newConfigKey.trim()]: newConfigValue
    }));
    setNewConfigKey("");
    setNewConfigValue("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              Marketplace · Minhas Instalações
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Minhas Instalações
            </h1>
            <p className="max-w-2xl text-sm text-zinc-300">
              Acompanhe todas as automações que você instalou no marketplace,
              controle o fluxo no n8n e ajuste as variáveis específicas de cada
              instância.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-5 py-4 text-sm text-zinc-200">
            <p className="text-xs uppercase tracking-widest text-zinc-400">
              Status geral
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {instances.length}
            </p>
            <p className="text-xs text-zinc-400">instalações monitoradas</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-300">
            Carregando instalações...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {instances.map((instance) => {
              const isActive = Boolean(instance.enabled);

              return (
                <div
                  key={instance.id}
                  className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-[0_0_40px_-30px_rgba(0,0,0,0.6)]"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {instance.template.name}
                        </h2>
                        <p className="text-sm text-zinc-400">
                          {instance.template.description ||
                            "Automação instalada via marketplace."}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "bg-zinc-700/40 text-zinc-300"
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`absolute inline-flex h-full w-full rounded-full ${
                              isActive
                                ? "animate-ping bg-emerald-400"
                                : "bg-zinc-500"
                            } opacity-75`}
                          />
                          <span
                            className={`relative inline-flex h-2 w-2 rounded-full ${
                              isActive ? "bg-emerald-400" : "bg-zinc-500"
                            }`}
                          />
                        </span>
                        {isActive ? "Ativo" : "Pausado"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                      {instance.template.category && (
                        <span className="rounded-full border border-zinc-700/80 px-2 py-1">
                          {instance.template.category}
                        </span>
                      )}
                      <span>
                        Instalado em{" "}
                        <strong className="font-medium text-zinc-200">
                          {formatDate(instance.createdAt)}
                        </strong>
                      </span>
                      <span className="rounded-full border border-zinc-700/80 px-2 py-1">
                        {instance.status}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                      <p className="text-xs uppercase tracking-widest text-zinc-500">
                        Variáveis da instância
                      </p>
                      <div className="mt-2 grid gap-2 text-sm text-zinc-200">
                        {Object.keys(instance.configJson ?? {}).length === 0 ? (
                          <span className="text-xs text-zinc-400">
                            Nenhuma variável configurada. Use o botão de
                            configurar para adicionar chaves.
                          </span>
                        ) : (
                          Object.entries(instance.configJson ?? {}).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="text-xs uppercase tracking-widest text-zinc-500">
                                  {key}
                                </span>
                                <span className="max-w-[60%] truncate text-right text-zinc-200">
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      className={
                        isActive
                          ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }
                      onClick={() => handleToggle(instance)}
                      disabled={togglingId === instance.id}
                    >
                      {togglingId === instance.id
                        ? "Atualizando..."
                        : isActive
                          ? "Desligar"
                          : "Ligar"}
                    </Button>
                    <Button
                      className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                      onClick={() => setSelectedInstance(instance)}
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Configuração
              </p>
              <h2 className="text-2xl font-semibold text-white">
                {selectedInstance.template.name}
              </h2>
              <p className="text-sm text-zinc-400">
                Edite as variáveis específicas desta instância (ex.: chaves de
                API ou IDs de planilha).
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {configEntries.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Nenhuma variável configurada até o momento.
                </p>
              ) : (
                configEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center"
                  >
                    <label className="text-xs uppercase tracking-widest text-zinc-500">
                      {key}
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                      value={value}
                      onChange={(event) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          [key]: event.target.value
                        }))
                      }
                    />
                  </div>
                ))
              )}

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Adicionar variável
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                    placeholder="Nome (ex.: apiKey)"
                    value={newConfigKey}
                    onChange={(event) => setNewConfigKey(event.target.value)}
                  />
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                    placeholder="Valor"
                    value={newConfigValue}
                    onChange={(event) => setNewConfigValue(event.target.value)}
                  />
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={handleAddConfig}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
              <Button
                className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                onClick={() => setSelectedInstance(null)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={handleSaveConfig}
              >
                Salvar configurações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
