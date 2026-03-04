import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { integrationsApi } from "@/lib/api/integrations";
import { Loader2 } from "lucide-react";

const openAiSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  apiKey: z.string().min(1, "API Key é obrigatória")
});

const n8nSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  baseUrl: z.string().url("URL inválida").or(z.literal("")),
  apiKey: z.string().min(1, "API Key é obrigatória")
});

type OpenAiForm = z.infer<typeof openAiSchema>;
type N8nForm = z.infer<typeof n8nSchema>;

const schemas = {
  OPENAI: openAiSchema,
  N8N: n8nSchema,
  INSTAGRAM_DIRECT: openAiSchema,
  FACEBOOK_MESSENGER: openAiSchema,
  VOIP: openAiSchema
} as const;

type IntegrationTypeForKeys = keyof typeof schemas;

const defaultValues: Record<string, Record<string, string>> = {
  OPENAI: { name: "OpenAI", apiKey: "" },
  N8N: { name: "N8N", baseUrl: "http://localhost:5678", apiKey: "" },
  INSTAGRAM_DIRECT: { name: "Instagram", apiKey: "" },
  FACEBOOK_MESSENGER: { name: "Messenger", apiKey: "" },
  VOIP: { name: "VoIP", apiKey: "" }
};

type Props = {
  type: IntegrationTypeForKeys;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function IntegrationKeysDialog({ type, open, onOpenChange, onSuccess }: Props) {
  const schema = schemas[type] ?? openAiSchema;
  const defaults = defaultValues[type] ?? defaultValues.OPENAI;

  const [saving, setSaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults
  });

  const onSubmit = async (data: OpenAiForm | N8nForm) => {
    setSaving(true);
    form.clearErrors("root");
    try {
      const created = await integrationsApi.createAccount({
        name: data.name,
        type,
        status: "ACTIVE"
      });
      const payload: Record<string, string> = { ...data } as Record<string, string>;
      await integrationsApi.upsertSecret(created.id, payload);
      form.reset(defaults);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Erro ao salvar"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar {type === "OPENAI" ? "OpenAI" : type === "N8N" ? "N8N" : type}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit as (d: OpenAiForm) => void)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              {...form.register("name")}
              placeholder="Ex: Minha API OpenAI"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {type === "OPENAI" && (
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                {...form.register("apiKey")}
                placeholder="sk-..."
              />
              {form.formState.errors.apiKey && (
                <p className="text-xs text-destructive">{form.formState.errors.apiKey.message}</p>
              )}
            </div>
          )}

          {type === "N8N" && (
            <>
              <div className="space-y-2">
                <Label>URL do N8N</Label>
                <Input
                  {...form.register("baseUrl")}
                  placeholder="http://localhost:5678"
                />
                {form.formState.errors.baseUrl && (
                  <p className="text-xs text-destructive">{form.formState.errors.baseUrl.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  {...form.register("apiKey")}
                  placeholder="Token de API do N8N"
                />
                {form.formState.errors.apiKey && (
                  <p className="text-xs text-destructive">{form.formState.errors.apiKey.message}</p>
                )}
              </div>
            </>
          )}

          {form.formState.errors.root && (
            <p className="text-xs text-destructive">{form.formState.errors.root.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
