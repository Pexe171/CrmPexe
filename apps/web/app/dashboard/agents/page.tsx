"use client";

import { useMemo, useState } from "react";
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
type AgentCategory = "Vendas" | "Atendimento" | "Financeiro" | "Operações";
type AgentStatus = "RUNNING" | "PAUSED";

type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  iconLabel: string;
  variableKeys: string[];
};

type InstalledAgent = {
  id: string;
  templateId: string;
  templateName: string;
  description: string;
  status: AgentStatus;
  lastExecution: string;
  variableKeys: string[];
};

const WHATSAPP_NUMBER = "SEUNUMERO";

const agentTemplates: AgentTemplate[] = [
  {
    id: "sales-bot",
    name: "Robô de Vendas",
    description:
      "Atende leads no WhatsApp, qualifica interesse e cria oportunidades automaticamente.",
    category: "Vendas",
    iconLabel: "RV",
    variableKeys: ["WHATSAPP_API_KEY", "SALES_PIPELINE_ID", "N8N_WEBHOOK_URL"]
  },
  {
    id: "support-assistant",
    name: "Assistente de Suporte",
    description:
      "Responde dúvidas frequentes e encaminha tickets para o time quando necessário.",
    category: "Atendimento",
    iconLabel: "AS",
    variableKeys: ["SUPPORT_CHANNEL_ID", "OPENAI_API_KEY"]
  },
  {
    id: "billing-reminder",
    name: "Cobrador Inteligente",
    description:
      "Dispara lembretes de cobrança e acompanha retornos de pagamento.",
    category: "Financeiro",
    iconLabel: "CI",
    variableKeys: ["MERCADO_PAGO_ACCESS_TOKEN", "BILLING_REMINDER_DAYS"]
  },
  {
    id: "pipeline-updater",
    name: "Atualizador de Pipeline",
    description:
      "Organiza etapas do funil e notifica responsáveis por pendências de negócio.",
    category: "Operações",
    iconLabel: "AP",
    variableKeys: ["DEFAULT_OWNER_ID", "PIPELINE_STAGE_MAPPING"]
  }
];

const installedAgents: InstalledAgent[] = [
  {
    id: "inst-001",
    templateId: "sales-bot",
    templateName: "Robô de Vendas",
    description: "Instalado pela equipe CrmPexe para a operação de pré-vendas.",
    status: "RUNNING",
    lastExecution: "Hoje às 09:42",
    variableKeys: ["WHATSAPP_API_KEY", "SALES_PIPELINE_ID", "N8N_WEBHOOK_URL"]
  },
  {
    id: "inst-002",
    templateId: "billing-reminder",
    templateName: "Cobrador Inteligente",
    description:
      "Instalado para automação de follow-up financeiro do workspace.",
    status: "PAUSED",
    lastExecution: "Ontem às 18:15",
    variableKeys: ["MERCADO_PAGO_ACCESS_TOKEN", "BILLING_REMINDER_DAYS"]
  }
];

function getInterestLink(agentName: string) {
  const text = encodeURIComponent(
    `Olá, tenho interesse no agente ${agentName}.`
  );

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

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

export default function AgentsStorePage() {
  const [activeTab, setActiveTab] = useState<AgentsTab>("EXPLORE");

  const installedByName = useMemo(
    () => new Set(installedAgents.map((agent) => agent.templateName)),
    []
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          Loja de Agentes
        </h1>
        <p className="text-sm text-slate-400">
          Escolha um agente no marketplace, clique em Tenho Interesse e a equipe
          CrmPexe implanta para você.
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
          {agentTemplates.map((agent) => {
            const isInstalled = installedByName.has(agent.name);

            return (
              <Card key={agent.id}>
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100">
                      {agent.iconLabel}
                    </div>
                    <Badge variant="secondary">{agent.category}</Badge>
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
                      Instalação feita pela equipe admin
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      window.open(
                        getInterestLink(agent.name),
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    Tenho Interesse ↗
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {installedAgents.map((agent) => {
            const isRunning = agent.status === "RUNNING";

            return (
              <Card key={agent.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">
                      {agent.templateName}
                    </CardTitle>
                    <Badge variant={isRunning ? "success" : "secondary"}>
                      {isRunning ? "Rodando" : "Pausado"}
                    </Badge>
                  </div>
                  <CardDescription>{agent.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                  <span>Última execução: {agent.lastExecution}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm">
                      Ver Logs
                    </Button>
                    <Link href={getDevelopersSettingsLink(agent.variableKeys)}>
                      <Button type="button" variant="secondary" size="sm">
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
