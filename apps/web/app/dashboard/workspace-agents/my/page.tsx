"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type WorkspaceAgent = {
  id: string;
  isActive: boolean;
  activatedAt: string;
  agentTemplateId: string;
  agentTemplateVersion: { version: number };
  agentTemplate: { name: string };
};

export default function MyWorkspaceAgentsPage() {
  const [items, setItems] = useState<WorkspaceAgent[]>([]);

  const load = async () => {
    const response = await fetch("/api/workspace-agents");
    const payload = (await response.json()) as WorkspaceAgent[];
    setItems(payload);
  };

  useEffect(() => {
    void load();
  }, []);

  const deactivate = async (agentTemplateId: string) => {
    await fetch(`/api/workspace-agents/${agentTemplateId}/deactivate`, {
      method: "POST"
    });
    await load();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Meus Agents</h1>
      {items.map((item) => (
        <article key={item.id} className="rounded-md border border-slate-700 p-4">
          <h2 className="font-semibold">{item.agentTemplate.name}</h2>
          <p className="text-sm">Versão ativa: v{item.agentTemplateVersion.version}</p>
          <p className="text-sm">Ativado em: {new Date(item.activatedAt).toLocaleString("pt-BR")}</p>
          <p className="text-sm">Status: {item.isActive ? "Ativo" : "Inativo"}</p>
          {item.isActive ? (
            <Button className="mt-3" variant="outline" onClick={() => deactivate(item.agentTemplateId)}>
              Desativar
            </Button>
          ) : null}
        </article>
      ))}
    </section>
  );
}
