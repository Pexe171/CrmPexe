"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60";

export default function SettingsAiPage() {
  const [isSaving, setIsSaving] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
    }, 1200);
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <Card className="overflow-hidden border-slate-800">
        <CardHeader className="space-y-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90 text-xl shadow-inner shadow-slate-900">
              <span aria-hidden="true">🧠</span>
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl">Inteligência Artificial</CardTitle>
              <CardDescription className="text-slate-300">
                Configure a OpenAI para recursos inteligentes, respostas
                automáticas e automações do workspace.
              </CardDescription>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            Dica: use uma API Key com permissões restritas e monitore consumo
            por projeto.
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  API Key
                </span>
                <input
                  type="password"
                  name="apiKey"
                  placeholder="sk-..."
                  className={inputClassName}
                  autoComplete="off"
                  required
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Model
                  </span>
                  <input
                    type="text"
                    name="model"
                    placeholder="gpt-4o"
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Base URL
                  </span>
                  <input
                    type="url"
                    name="baseUrl"
                    placeholder="https://api.openai.com/v1"
                    className={inputClassName}
                    required
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-800 pt-4">
              <Button type="submit" disabled={isSaving} className="min-w-28">
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
