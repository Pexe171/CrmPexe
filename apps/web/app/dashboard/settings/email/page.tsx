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

export default function SettingsEmailPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
    }, 1200);
  }

  function handleTestConnection() {
    setIsTestingConnection(true);

    setTimeout(() => {
      setIsTestingConnection(false);
    }, 1200);
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <Card className="overflow-hidden border-slate-800">
        <CardHeader className="space-y-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90 text-xl shadow-inner shadow-slate-900">
              <span aria-hidden="true">📨</span>
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl">Envio de E-mail (SMTP)</CardTitle>
              <CardDescription className="text-slate-300">
                Defina credenciais SMTP para envio de e-mails transacionais,
                notificações e testes de conectividade.
              </CardDescription>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            O botão <strong className="text-slate-300">Testar Conexão</strong>{" "}
            enviará um e-mail de validação para o usuário logado.
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Host</span>
                <input
                  type="text"
                  name="host"
                  placeholder="smtp.seudominio.com"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Port</span>
                <input
                  type="number"
                  name="port"
                  placeholder="587"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Secure
                </span>
                <select
                  name="secure"
                  defaultValue="false"
                  className={inputClassName}
                >
                  <option value="false">false (TLS/STARTTLS opcional)</option>
                  <option value="true">true (SSL/TLS obrigatório)</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">User</span>
                <input
                  type="text"
                  name="user"
                  placeholder="usuario-smtp"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className={inputClassName}
                  autoComplete="off"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-200">
                  From Email
                </span>
                <input
                  type="email"
                  name="fromEmail"
                  placeholder="noreply@seudominio.com"
                  className={inputClassName}
                  required
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTestingConnection || isSaving}
                className="min-w-40"
              >
                {isTestingConnection ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Testando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true">✉️</span>
                    Testar Conexão
                  </span>
                )}
              </Button>

              <Button
                type="submit"
                disabled={isSaving || isTestingConnection}
                className="min-w-28"
              >
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
