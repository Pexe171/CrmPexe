"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";

type SidebarVariant = "client" | "superadmin";

type SidebarLink = {
  href: string;
  label: string;
  emoji?: string;
  helper?: string;
};

type SidebarSectionData = {
  title: string;
  links: SidebarLink[];
};

type SidebarNavProps = {
  variant: SidebarVariant;
  extraSections?: SidebarSectionData[];
  footerActions?: ReactNode;
};

const clientSections: SidebarSectionData[] = [
  {
    title: "Início rápido",
    links: [
      { href: "/dashboard", label: "Painel geral", emoji: "📊", helper: "Resumo do funil e performance" },
      { href: "/search", label: "Busca global", emoji: "🔎", helper: "Encontre contatos e mensagens" }
    ]
  },
  {
    title: "Atendimento",
    links: [{ href: "/inbox", label: "Inbox omnichannel", emoji: "💬", helper: "Atenda e acompanhe SLAs" }]
  },
  {
    title: "Vendas & CRM",
    links: [
      { href: "/companies", label: "Empresas", emoji: "🏢", helper: "Clientes e contas do CRM" }
    ]
  },
  {
    title: "Operações",
    links: [
      { href: "/workspaces", label: "Workspaces", emoji: "🧭", helper: "Troque de unidade ou time" },
      { href: "/dashboard/variables", label: "Variáveis", emoji: "🧪", helper: "Dados dinâmicos do CRM" }
    ]
  },
  {
    title: "Integrações",
    links: [
      { href: "/marketplace", label: "Agentes", emoji: "🧩", helper: "Status dos agentes disponíveis" }
    ]
  }
];

const superAdminSections: SidebarSectionData[] = [
  {
    title: "Super Admin",
    links: [
      { href: "/super-admin", label: "Visão geral", emoji: "🛡️", helper: "Panorama de workspaces" },
      { href: "/super-admin/marketplace", label: "Agentes do CRM", emoji: "🧠", helper: "Cadastro e configuração" },
      { href: "/super-admin/support", label: "Impersonação", emoji: "🧰", helper: "Suporte e acesso seguro" },
      { href: "/super-admin/templates", label: "Templates", emoji: "🧵", helper: "Automações oficiais" }
    ]
  }
];

const SidebarSection = ({
  title,
  links,
  onNavigate
}: {
  title: string;
  links: SidebarLink[];
  onNavigate: () => void;
}) => {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="group flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500/50 hover:bg-slate-900/90 hover:text-white"
              href={link.href}
              onClick={onNavigate}
            >
              {link.emoji ? (
                <span className="mt-0.5 text-base transition group-hover:scale-110">
                  {link.emoji}
                </span>
              ) : null}
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
  const sections = variant === "superadmin" ? superAdminSections : clientSections;

  return (
    <div className="relative">
      <Button
        aria-label="Abrir menu"
        className="md:hidden"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        ☰
      </Button>

      {open ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-80 flex-col border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900/80 px-6 py-6 shadow-2xl backdrop-blur transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              CRM Pexe
            </p>
            <p className="text-sm text-slate-300">Automação inteligente</p>
          </div>
          <button
            className="text-xs text-slate-400 hover:text-slate-200 md:hidden"
            onClick={() => setOpen(false)}
            type="button"
          >
            Fechar ✕
          </button>
        </div>

        <div className="mt-6 space-y-6 overflow-y-auto pr-1">
          {sections.map((section) => (
            <SidebarSection
              key={section.title}
              title={section.title}
              links={section.links}
              onNavigate={() => setOpen(false)}
            />
          ))}

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
    </div>
  );
}
