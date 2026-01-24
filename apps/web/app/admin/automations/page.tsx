"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INSTANCES_PER_PAGE = 20;

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

type AutomationInstancesMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type AutomationInstancesResponse = {
  data: AutomationInstance[];
  meta: AutomationInstancesMeta;
};

export default function AutomationsPage() {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [instances, setInstances] = useState<AutomationInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instancesPage, setInstancesPage] = useState(1);
  const [instancesMeta, setInstancesMeta] = useState<AutomationInstancesMeta>({
    page: 1,
    perPage: INSTANCES_PER_PAGE,
    total: 0,
    totalPages: 0
  });

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

  const fetchInstances = useCallback(async (page: number) => {
    const requestedPage = Math.max(page, 1);

    setInstancesLoading(true);
    setError(null);

    try {
      const doFetch = async (pageToLoad: number) => {
        const pageParams = new URLSearchParams({
          page: String(pageToLoad),
          perPage: String(INSTANCES_PER_PAGE)
        });
        const response = await fetch(`${apiUrl}/api/automation-instances?${pageParams.toString()}`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar as automações instaladas.");
        }

        return (await response.json()) as AutomationInstancesResponse;
      };

      const payload = await doFetch(requestedPage);

      if (payload.meta.totalPages > 0 && requestedPage > payload.meta.totalPages) {
        const adjustedPage = payload.meta.totalPages;
        const adjustedPayload = await doFetch(adjustedPage);
        setInstances(adjustedPayload.data);
        setInstancesMeta(adjustedPayload.meta);
        setInstancesPage(adjustedPage);
        return;
      }

      setInstances(payload.data);
      setInstancesMeta(payload.meta);
      setInstancesPage(requestedPage);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar automações.";
      setError(message);
      throw fetchError;
    } finally {
      setInstancesLoading(false);
    }
  }, []);

  const refreshData = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchTemplates(), fetchInstances(page)]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar automações.");
    } finally {
      setLoading(false);
    }
  }, [fetchInstances, fetchTemplates]);

  useEffect(() => {
    void refreshData(1);
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

      await fetchInstances(instancesPage);
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Erro inesperado ao instalar automação.");
    } finally {
      setInstallingId(null);
    }
  };

  const handleInstancesPageChange = (nextPage: number) => {
    if (
      nextPage < 1 ||
      (instancesMeta.totalPages > 0 && nextPage > instancesMeta.totalPages) ||
      nextPage === instancesPage
    ) {
      return;
    }

    setInstancesPage(nextPage);
    void fetchInstances(nextPage);
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
            <Button variant="outline" onClick={() => void refreshData(instancesPage)} disabled={loading || instancesLoading}>
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
          {loading || instancesLoading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando status...
            </div>
          ) : instances.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhuma automação instalada ainda.
            </div>
          ) : (
            <div className="space-y-4">
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

              {instancesMeta.totalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
                  <p>
                    Página {instancesMeta.page} de {instancesMeta.totalPages} · {instancesMeta.total} automações
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleInstancesPageChange(instancesMeta.page - 1)}
                      disabled={instancesLoading || instancesMeta.page <= 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleInstancesPageChange(instancesMeta.page + 1)}
                      disabled={
                        instancesLoading ||
                        instancesMeta.totalPages === 0 ||
                        instancesMeta.page >= instancesMeta.totalPages
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  {instancesMeta.total} automações instaladas.
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
