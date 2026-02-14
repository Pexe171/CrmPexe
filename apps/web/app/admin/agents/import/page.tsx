"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ValidationState = { valid: boolean; message: string };

export default function ImportAgentPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rawJson, setRawJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const validation = useMemo<ValidationState>(() => {
    try {
      const parsed = JSON.parse(rawJson);

      if (!Array.isArray(parsed.nodes)) {
        return { valid: false, message: "Campo nodes deve ser um array." };
      }

      if (!parsed.connections || typeof parsed.connections !== "object") {
        return { valid: false, message: "Campo connections deve ser um objeto." };
      }

      return { valid: true, message: "JSON válido para importação." };
    } catch {
      return { valid: false, message: "JSON inválido. Corrija a sintaxe." };
    }
  }, [rawJson]);

  const parsedPreview = useMemo(() => {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }, [rawJson]);

  const onFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRawJson(text);
  };

  const onSubmit = async () => {
    if (!validation.valid) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/agent-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          jsonPayload: JSON.parse(rawJson)
        })
      });

      const payload = (await response.json()) as { message?: string; version?: number };

      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao importar agent.");
      }

      setFeedback(`Draft salvo com sucesso na versão v${payload.version}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao importar agent.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Importar Agent</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input type="file" accept="application/json" onChange={onFileUpload} />
          <textarea
            className="w-full min-h-48 rounded-md border bg-slate-950 p-3 text-sm"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
          <p className={validation.valid ? "text-emerald-400" : "text-red-400"}>{validation.message}</p>
          <Button disabled={!validation.valid || saving} onClick={onSubmit}>
            {saving ? "Salvando..." : "Salvar como Draft"}
          </Button>
          {feedback ? <p className="text-sm text-slate-300">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto text-xs">{JSON.stringify(parsedPreview, null, 2)}</pre>
        </CardContent>
      </Card>
    </section>
  );
}
