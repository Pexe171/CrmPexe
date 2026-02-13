"use client";

import { useState } from "react";
import { Loader2, Mail, Save, Zap } from "lucide-react";

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
  "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-amber-500/20 focus:border-amber-500";

export default function SettingsEmailPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: ""
  });

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const variablesToSave = [
        { key: "SMTP_HOST", value: formData.host, isSensitive: false },
        { key: "SMTP_PORT", value: formData.port, isSensitive: false },
        { key: "SMTP_USER", value: formData.user, isSensitive: false },
        { key: "SMTP_PASS", value: formData.pass, isSensitive: true },
        { key: "SMTP_FROM", value: formData.from, isSensitive: false }
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
      alert("SMTP configurado com sucesso!");
    } catch (_error) {
      alert("Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-8">
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
              <Mail className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <CardTitle>SMTP & Disparo</CardTitle>
              <CardDescription>
                Credenciais para envio de e-mails transacionais.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Host (Servidor)</Label>
                <Input
                  className={inputClassName}
                  placeholder="smtp.resend.com"
                  value={formData.host}
                  onChange={(event) =>
                    setFormData({ ...formData, host: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Porta</Label>
                <Input
                  className={inputClassName}
                  placeholder="587"
                  value={formData.port}
                  onChange={(event) =>
                    setFormData({ ...formData, port: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Usuário SMTP</Label>
              <Input
                className={inputClassName}
                placeholder="resend"
                value={formData.user}
                onChange={(event) =>
                  setFormData({ ...formData, user: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Senha SMTP</Label>
              <Input
                type="password"
                className={inputClassName}
                placeholder="••••••••"
                value={formData.pass}
                onChange={(event) =>
                  setFormData({ ...formData, pass: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">E-mail de Envio (From)</Label>
              <Input
                className={inputClassName}
                placeholder="nao-responda@suaempresa.com"
                value={formData.from}
                onChange={(event) =>
                  setFormData({ ...formData, from: event.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Zap className="mr-2 h-4 w-4" /> Testar Conexão
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 text-white hover:bg-amber-500"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar SMTP
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
