"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CatalogAgent = { id: string; name: string; description?: string | null; category: string };

export default function AvailableWorkspaceAgentsPage() {
  const [items, setItems] = useState<CatalogAgent[]>([]);

  useEffect(() => {
    fetch("/api/workspace-agents/catalog")
      .then((res) => res.json())
      .then((data) => setItems(data as CatalogAgent[]))
      .catch(() => setItems([]));
  }, []);

  const activate = async (id: string) => {
    await fetch(`/api/workspace-agents/${id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configJson: {} })
    });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Agents disponíveis</h1>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-700 p-4">
            <h2 className="font-semibold">{item.name}</h2>
            <p className="text-sm text-slate-400">{item.description}</p>
            <p className="text-xs text-slate-400">Categoria: {item.category}</p>
            <Button className="mt-3" onClick={() => activate(item.id)}>
              Ativar no meu workspace
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
