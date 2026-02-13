"use client";

import { useMemo, useState } from "react";
import {
  Facebook,
  Instagram,
  MessageCircle,
  QrCode,
  Unplug,
  Workflow
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type IntegrationChannelType =
  | "WHATSAPP"
  | "INSTAGRAM_DIRECT"
  | "FACEBOOK_MESSENGER";
type IntegrationAccountStatus = "ACTIVE" | "INACTIVE";

type IntegrationAccount = {
  type: IntegrationChannelType;
  status: IntegrationAccountStatus;
  name: string | null;
};

type ChannelCatalogItem = {
  type: IntegrationChannelType;
  title: string;
  description: string;
  icon: typeof MessageCircle;
  connectLabel: string;
};

const channelCatalog: ChannelCatalogItem[] = [
  {
    type: "WHATSAPP",
    title: "WhatsApp",
    description: "Conecte o número oficial para atendimento centralizado.",
    icon: MessageCircle,
    connectLabel: "Conectar"
  },
  {
    type: "INSTAGRAM_DIRECT",
    title: "Instagram Direct",
    description: "Ative mensagens da conta comercial do Instagram.",
    icon: Instagram,
    connectLabel: "Conectar com Meta"
  },
  {
    type: "FACEBOOK_MESSENGER",
    title: "Facebook Messenger",
    description: "Sincronize o Messenger da página oficial da empresa.",
    icon: Facebook,
    connectLabel: "Conectar com Meta"
  }
];

const initialAccounts: IntegrationAccount[] = [
  { type: "WHATSAPP", status: "INACTIVE", name: null },
  { type: "INSTAGRAM_DIRECT", status: "ACTIVE", name: "@crmpexe.oficial" },
  { type: "FACEBOOK_MESSENGER", status: "INACTIVE", name: null }
];

export default function ChannelsPage() {
  const [accounts, setAccounts] =
    useState<IntegrationAccount[]>(initialAccounts);
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);

  const accountsByType = useMemo(
    () =>
      Object.fromEntries(accounts.map((account) => [account.type, account])),
    [accounts]
  );

  function handleDisconnect(channelType: IntegrationChannelType) {
    setAccounts((current) =>
      current.map((account) =>
        account.type === channelType
          ? { ...account, status: "INACTIVE", name: null }
          : account
      )
    );
  }

  function handleMetaConnect(channelType: IntegrationChannelType) {
    window.alert(
      "Redirecionamento social da Meta será integrado na próxima etapa."
    );

    setAccounts((current) =>
      current.map((account) =>
        account.type === channelType
          ? {
              ...account,
              status: "ACTIVE",
              name:
                channelType === "INSTAGRAM_DIRECT"
                  ? "@empresa.conectada"
                  : "facebook.com/empresa"
            }
          : account
      )
    );
  }

  function handleMockWhatsappConnect() {
    setAccounts((current) =>
      current.map((account) =>
        account.type === "WHATSAPP"
          ? { ...account, status: "ACTIVE", name: "+55 (11) 98888-0000" }
          : account
      )
    );
    setIsWhatsappDialogOpen(false);
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          Canais de Atendimento
        </h1>
        <p className="text-sm text-slate-400">
          Conecte os canais oficiais para que todo o workspace atenda leads em
          um único fluxo.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {channelCatalog.map((channel) => {
          const account = accountsByType[channel.type];
          const isConnected = account?.status === "ACTIVE";
          const Icon = channel.icon;

          return (
            <Card
              key={channel.type}
              className={isConnected ? "border-emerald-500/70" : undefined}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg border border-slate-700 bg-slate-800 p-2">
                    <Icon className="h-5 w-5 text-slate-100" />
                  </div>
                  <Badge variant={isConnected ? "success" : "secondary"}>
                    {isConnected ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle>{channel.title}</CardTitle>
                  <CardDescription>{channel.description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {isConnected ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    <Workflow className="h-4 w-4" />
                    {account.name}
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400">
                    Nenhuma conta conectada.
                  </div>
                )}
              </CardContent>

              <CardFooter>
                {isConnected ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleDisconnect(channel.type)}
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                ) : channel.type === "WHATSAPP" ? (
                  <Button onClick={() => setIsWhatsappDialogOpen(true)}>
                    {channel.connectLabel}
                  </Button>
                ) : (
                  <Button onClick={() => handleMetaConnect(channel.type)}>
                    {channel.connectLabel}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Em breve vamos renderizar o QR Code real via API. Por enquanto,
              este modal já está preparado para o fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/60">
            <div className="flex flex-col items-center gap-2 text-slate-300">
              <QrCode className="h-10 w-10" />
              <p className="text-sm">Placeholder do QR Code</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsWhatsappDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleMockWhatsappConnect}>Simular conexão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
