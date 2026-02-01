"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";

type SidebarVariant = "client" | "superadmin";

type SidebarNavProps = {
  variant: SidebarVariant;
  extraSections?: Array<{
    title: string;
    links: Array<{
      href: string;
      label: string;
      emoji?: string;
      helper?: string;
    }>;
  }>;
  footerActions?: ReactNode;
};

const clientLinks = [
  { href: "/dashboard", label: "Painel geral", emoji: "📊", helper: "Resumo do funil e performance" },
  { href: "/inbox", label: "Inbox omnichannel", emoji: "💬", helper: "Atenda e acompanhe SLAs" },
  { href: "/companies", label: "Empresas", emoji: "🏢", helper: "Clientes e contas do CRM" },
  { href: "/search", label: "Busca global", emoji: "🔎", helper: "Encontre contatos e mensagens" },
  { href: "/marketplace", label: "Agentes", emoji: "🧩", helper: "Status dos agentes disponíveis" }
];

const workspaceLinks = [
  { href: "/workspaces", label: "Workspaces", emoji: "🧭", helper: "Troque de unidade ou time" },
  { href: "/dashboard/variables", label: "Variáveis", emoji: "🧪", helper: "Dados dinâmicos do CRM" }
];

const superAdminLinks = [
  { href: "/super-admin", label: "Visão geral", emoji: "🛡️", helper: "Panorama de workspaces" },
  { href: "/super-admin/marketplace", label: "Agentes do CRM", emoji: "🧠", helper: "Cadastro e configuração" },
  { href: "/super-admin/support", label: "Impersonação", emoji: "🧰", helper: "Suporte e acesso seguro" },
  { href: "/super-admin/templates", label: "Templates", emoji: "🧵", helper: "Automações oficiais" }
];

const SidebarSection = ({
  title,
  links,
  onNavigate
}: {
  title: string;
  links: Array<{
    href: string;
    label: string;
    emoji?: string;
    helper?: string;
  }>;
  onNavigate: () => void;
}) => {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
        {title}
      </p>
      <ul className="mt-3 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500/40 hover:text-white"
              href={link.href}
              onClick={onNavigate}
            >
              {link.emoji ? <span className="text-base">{link.emoji}</span> : null}
              <div>
                <p className="font-semibold">{link.label}</p>
                {link.helper ? <p className="text-xs text-slate-400">{link.helper}</p> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function SidebarNav({ variant, extraSections, footerActions }: SidebarNavProps) {
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
              <SidebarSection title="Cliente" links={clientLinks} onNavigate={() => setOpen(false)} />
              <SidebarSection title="Workspace" links={workspaceLinks} onNavigate={() => setOpen(false)} />

              {variant === "superadmin" ? (
                <SidebarSection
                  title="Super Admin"
                  links={superAdminLinks}
                  onNavigate={() => setOpen(false)}
                />
              ) : null}

              {extraSections?.map((section) => (
                <SidebarSection
                  key={section.title}
                  title={section.title}
                  links={section.links}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>

            {footerActions ? (
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="flex flex-col gap-3">{footerActions}</div>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}
    </div>
  );
}
