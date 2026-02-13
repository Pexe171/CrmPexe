"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type AgentsTab = "EXPLORE" | "MY_AGENTS";

type StorefrontAgent = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  requirements: string[];
  canInstall?: boolean;
};

type AutomationInstance = {
  id: string;
  status: "PENDING_CONFIG" | "ACTIVE" | "PAUSED" | "FAILED";
  template: {
    id: string;
    name: string;
    description: string | null;
    requirements: string[];
  };
  updatedAt: string;
};

type InstancesResponse = {
  data: AutomationInstance[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const fetchStorefrontAgents = async (
  signal?: AbortSignal
): Promise<StorefrontAgent[]> => {
  const response = await fetch(`${apiUrl}/api/marketplace/storefront`, {
    credentials: "include",
    signal
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os agentes do marketplace.");
  }

  return (await response.json()) as StorefrontAgent[];
};

const fetchInstalledAgents = async (
  signal?: AbortSignal
): Promise<AutomationInstance[]> => {
  const response = await fetch(
    `${apiUrl}/api/automation-instances?perPage=100`,
    {
      credentials: "include",
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar os agentes instalados.");
  }

  const payload = (await response.json()) as InstancesResponse;
  return payload.data;
};

const registerInterest = async (templateId: string) => {
  const response = await fetch(
    `${apiUrl}/api/marketplace/agents/${templateId}/interest`,
    {
      method: "POST",
      credentials: "include"
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível registrar seu interesse agora.");
  }

  return response.json();
};

function getDevelopersSettingsLink(variableKeys: string[]) {
  const params = new URLSearchParams();
  if (variableKeys.length > 0) {
    params.set("keys", variableKeys.join(","));
  }

  const query = params.toString();
  return query
    ? `/dashboard/settings/developers?${query}`
    : "/dashboard/settings/developers";
}

function formatLastUpdate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status: AutomationInstance["status"]) {
  if (status === "ACTIVE") {
    return { text: "Ativo", variant: "success" as const };
  }

  if (status === "PENDING_CONFIG" || status === "PAUSED") {
    return { text: "Parado", variant: "secondary" as const };
  }

  return { text: "Falha", variant: "secondary" as const };
}

export default function AgentsStorePage() {
  const [activeTab, setActiveTab] = useState<AgentsTab>("EXPLORE");
  const [marketplaceAgents, setMarketplaceAgents] = useState<StorefrontAgent[]>(
    []
  );
  const [installedAgents, setInstalledAgents] = useState<AutomationInstance[]>(
    []
  );
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(true);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(true);
  const [hasMarketplaceError, setHasMarketplaceError] = useState(false);
  const [hasInstalledError, setHasInstalledError] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchStorefrontAgents(controller.signal)
      .then((data) => {
        setMarketplaceAgents(data);
        setHasMarketplaceError(false);
      })
      .catch(() => {
        setHasMarketplaceError(true);
      })
      .finally(() => setIsLoadingMarketplace(false));

    fetchInstalledAgents(controller.signal)
      .then((data) => {
        setInstalledAgents(data);
        setHasInstalledError(false);
      })
      .catch(() => {
        setHasInstalledError(true);
      })
      .finally(() => setIsLoadingInstalled(false));

    return () => controller.abort();
  }, []);

  const installedTemplateIds = useMemo(
    () => new Set(installedAgents.map((instance) => instance.template.id)),
    [installedAgents]
  );

  const handleInterest = async (templateId: string) => {
    setRequestingId(templateId);

    try {
      await registerInterest(templateId);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          Loja de Agentes
        </h1>
        <p className="text-sm text-slate-400">
          Escolha um agente no marketplace e clique em Tenho Interesse para a
          equipe CrmPexe receber seu lead e implantar para você.
        </p>
      </header>

      <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
        <Button
          type="button"
          variant={activeTab === "EXPLORE" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("EXPLORE")}
          className="rounded-md"
        >
          Explorar
        </Button>
        <Button
          type="button"
          variant={activeTab === "MY_AGENTS" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("MY_AGENTS")}
          className="rounded-md"
        >
          Meus Agentes
        </Button>
      </div>

      {activeTab === "EXPLORE" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {isLoadingMarketplace ? (
            <Card>
              <CardContent className="py-8 text-sm text-slate-400">
                Carregando agentes do marketplace...
              </CardContent>
            </Card>
          ) : null}

          {hasMarketplaceError ? (
            <Card>
              <CardContent className="py-8 text-sm text-rose-300">
                Não foi possível carregar o marketplace agora.
              </CardContent>
            </Card>
          ) : null}

          {!isLoadingMarketplace &&
          !hasMarketplaceError &&
          marketplaceAgents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-slate-400">
                Nenhum agente publicado no momento.
              </CardContent>
            </Card>
          ) : null}

          {marketplaceAgents.map((agent) => {
            const isInstalled = installedTemplateIds.has(agent.id);
            const isRequesting = requestingId === agent.id;

            return (
              <Card key={agent.id}>
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{agent.categoryId}</Badge>
                    {agent.canInstall ? (
                      <Badge variant="success">Liberado</Badge>
                    ) : (
                      <Badge variant="secondary">Em análise</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle>{agent.name}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </div>
                </CardHeader>

                <CardFooter className="flex items-center justify-between gap-2">
                  {isInstalled ? (
                    <Badge variant="success">Já instalado no workspace</Badge>
                  ) : (
                    <div className="text-xs text-slate-400">
                      Implantação feita pela equipe admin
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleInterest(agent.id)}
                    disabled={isRequesting}
                  >
                    {isRequesting ? "Enviando..." : "Tenho Interesse"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {isLoadingInstalled ? (
            <Card>
              <CardContent className="py-8 text-sm text-slate-400">
                Carregando agentes instalados...
              </CardContent>
            </Card>
          ) : null}

          {hasInstalledError ? (
            <Card>
              <CardContent className="py-8 text-sm text-rose-300">
                Não foi possível carregar seus agentes instalados.
              </CardContent>
            </Card>
          ) : null}

          {!isLoadingInstalled &&
          !hasInstalledError &&
          installedAgents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-slate-400">
                Você ainda não possui agentes instalados.
              </CardContent>
            </Card>
          ) : null}

          {installedAgents.map((agent) => {
            const status = statusLabel(agent.status);

            return (
              <Card key={agent.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">
                      {agent.template.name}
                    </CardTitle>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>
                  <CardDescription>
                    {agent.template.description ??
                      "Agente instalado e pronto para configuração."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                  <span>
                    Última atualização: {formatLastUpdate(agent.updatedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={getDevelopersSettingsLink(
                        agent.template.requirements
                      )}
                    >
                      <Button type="button" variant="outline" size="sm">
                        Configurar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
