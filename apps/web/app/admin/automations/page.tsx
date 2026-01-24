"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AutomationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  version: string;
  category: string;
  requiredIntegrations: string[];
  definitionJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type AutomationInstance = {
  id: string;
  status: string;
  createdAt: string;
  template: AutomationTemplate;
};

export default function AutomationsPage() {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [instances, setInstances] = useState<AutomationInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/automation-templates`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar a biblioteca de automações.");
    }

    const data = (await response.json()) as AutomationTemplate[];
    setTemplates(data);
  }, []);

  const fetchInstances = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/automation-instances`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar as automações instaladas.");
    }

    const data = (await response.json()) as AutomationInstance[];
    setInstances(data);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchTemplates(), fetchInstances()]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar automações.");
    } finally {
      setLoading(false);
    }
  }, [fetchInstances, fetchTemplates]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleInstall = async (templateId: string) => {
    setInstallingId(templateId);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/automation-templates/${templateId}/install`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          configJson: {
            source: "ui",
            installedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível instalar a automação.");
      }

      await fetchInstances();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Erro inesperado ao instalar automação.");
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Biblioteca de automações</h1>
          <p className="text-sm text-gray-500">
            Instale templates prontos e acompanhe o provisionamento com conectores reais.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              Atualizar biblioteca
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Templates disponíveis</h2>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando biblioteca...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhum template cadastrado ainda. Cadastre templates pela API para aparecer aqui.
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">
                        Categoria: {template.category} · Versão {template.version}
                      </p>
                      {template.description ? (
                        <p className="mt-2 text-sm text-gray-600">{template.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        {(template.requiredIntegrations ?? []).length === 0 ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1">Sem integrações</span>
                        ) : (
                          template.requiredIntegrations.map((integration) => (
                            <span
                              key={integration}
                              className="rounded-full bg-blue-50 px-3 py-1 text-blue-600"
                            >
                              {integration}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInstall(template.id)}
                      disabled={installingId === template.id}
                    >
                      {installingId === template.id ? "Instalando..." : "Instalar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="w-full max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Automações instaladas</h2>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando status...
            </div>
          ) : instances.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhuma automação instalada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <div key={instance.id} className="rounded-xl border bg-white p-4 text-sm shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{instance.template.name}</p>
                      <p className="text-xs text-gray-500">
                        Instalada em {new Date(instance.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {instance.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
