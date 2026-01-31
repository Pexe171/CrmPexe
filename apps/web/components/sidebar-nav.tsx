"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type SidebarVariant = "client" | "superadmin";

type SidebarNavProps = {
  variant: SidebarVariant;
};

const clientLinks = [
  { href: "/dashboard", label: "Painel geral", emoji: "📊", helper: "Resumo do funil e performance" },
  { href: "/inbox", label: "Inbox omnichannel", emoji: "💬", helper: "Atenda e acompanhe SLAs" },
  { href: "/companies", label: "Empresas", emoji: "🏢", helper: "Clientes e contas do CRM" },
  { href: "/search", label: "Busca global", emoji: "🔎", helper: "Encontre contatos e mensagens" },
  { href: "/marketplace", label: "Marketplace", emoji: "🧩", helper: "Compre e ative agentes" }
];

const workspaceLinks = [
  { href: "/workspaces", label: "Workspaces", emoji: "🧭", helper: "Troque de unidade ou time" },
  { href: "/dashboard/variables", label: "Variáveis", emoji: "🧪", helper: "Dados dinâmicos do CRM" }
];

const superAdminLinks = [
  { href: "/super-admin", label: "Visão geral", emoji: "🛡️", helper: "Panorama de workspaces" },
  { href: "/super-admin/marketplace", label: "Marketplace do CRM", emoji: "🧠", helper: "Catálogo de agentes" },
  { href: "/super-admin/support", label: "Impersonação", emoji: "🧰", helper: "Suporte e acesso seguro" },
  { href: "/super-admin/templates", label: "Templates", emoji: "🧵", helper: "Automações oficiais" }
];

export function SidebarNav({ variant }: SidebarNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        aria-label="Abrir menu"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        ☰
      </Button>

      {open ? (
        <>
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside className="fixed left-0 top-0 z-40 h-full w-80 border-r border-slate-800 bg-slate-950/95 px-6 py-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Menu CRM IA
                </p>
                <p className="text-sm text-slate-300">Navegação rápida</p>
              </div>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                onClick={() => setOpen(false)}
                type="button"
              >
                Fechar ✕
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Cliente
                </p>
                <ul className="mt-3 space-y-3">
                  {clientLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500/40 hover:text-white"
                        href={link.href}
                        onClick={() => setOpen(false)}
                      >
                        <span className="text-base">{link.emoji}</span>
                        <div>
                          <p className="font-semibold">{link.label}</p>
                          <p className="text-xs text-slate-400">{link.helper}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Workspace
                </p>
                <ul className="mt-3 space-y-3">
                  {workspaceLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500/40 hover:text-white"
                        href={link.href}
                        onClick={() => setOpen(false)}
                      >
                        <span className="text-base">{link.emoji}</span>
                        <div>
                          <p className="font-semibold">{link.label}</p>
                          <p className="text-xs text-slate-400">{link.helper}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {variant === "superadmin" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                    Super Admin
                  </p>
                  <ul className="mt-3 space-y-3">
                    {superAdminLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500/40 hover:text-white"
                          href={link.href}
                          onClick={() => setOpen(false)}
                        >
                          <span className="text-base">{link.emoji}</span>
                          <div>
                            <p className="font-semibold">{link.label}</p>
                            <p className="text-xs text-slate-400">{link.helper}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
