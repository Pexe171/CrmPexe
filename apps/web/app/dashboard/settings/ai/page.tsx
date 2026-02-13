"use client";

import { useState } from "react";
import { Brain, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClassName =
  "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-violet-500/20 focus:border-violet-500";

export default function SettingsAiPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: "",
    model: "gpt-4-turbo",
    baseUrl: "https://api.openai.com/v1"
  });

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const variablesToSave = [
        { key: "OPENAI_API_KEY", value: formData.apiKey, isSensitive: true },
        { key: "OPENAI_MODEL", value: formData.model, isSensitive: false },
        { key: "OPENAI_BASE_URL", value: formData.baseUrl, isSensitive: false }
      ];

      await Promise.all(
        variablesToSave.map((variable) =>
          fetch("/api/workspace-variables", {
            method: "POST",
            body: JSON.stringify(variable),
            headers: { "Content-Type": "application/json" }
          })
        )
      );

      alert("Configurações de IA salvas com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-8">
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2">
              <Brain className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <CardTitle>OpenAI & Inteligência</CardTitle>
              <CardDescription>
                Configure o cérebro que potencializa seus agentes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">API Key da OpenAI</Label>
              <Input
                type="password"
                placeholder="sk-..."
                className={inputClassName}
                value={formData.apiKey}
                onChange={(event) =>
                  setFormData({ ...formData, apiKey: event.target.value })
                }
              />
              <p className="text-xs text-slate-500">
                Sua chave nunca será mostrada totalmente após salva.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Modelo Padrão</Label>
                <Input
                  placeholder="gpt-4-turbo"
                  className={inputClassName}
                  value={formData.model}
                  onChange={(event) =>
                    setFormData({ ...formData, model: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Base URL (Opcional)</Label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  className={inputClassName}
                  value={formData.baseUrl}
                  onChange={(event) =>
                    setFormData({ ...formData, baseUrl: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                className="bg-violet-600 text-white hover:bg-violet-500"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
