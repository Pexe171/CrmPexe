"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AgentTemplate = {
  id: string;
  name: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  versions: Array<{ version: number; publishedAt?: string | null }>;
};

export default function AgentCatalogPage() {
  const [items, setItems] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/agent-templates?page=1&perPage=20");
    const payload = (await response.json()) as { data: AgentTemplate[] };
    setItems(payload.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const publish = async (id: string) => {
    setMessage(null);
    const response = await fetch(`/api/agent-templates/${id}/publish`, {
      method: "POST"
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message ?? "Falha ao publicar.");
      return;
    }

    setMessage("Agent publicado com sucesso no n8n.");
    await load();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Catálogo de Agents</h1>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      {loading ? <p>Carregando...</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-700 p-4">
            <h2 className="font-semibold">{item.name}</h2>
            <p className="text-sm text-slate-400">{item.category}</p>
            <p className="text-sm">Status: {item.status}</p>
            <p className="text-sm">
              Versão atual: v{item.versions?.[0]?.version ?? "-"}
            </p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => publish(item.id)}>Publicar no n8n</Button>
              <Button variant="outline" onClick={() => window.location.assign(`/api/agent-templates/${item.id}/versions`)}>
                Ver versões
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
