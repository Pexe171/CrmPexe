"use client";

import Link from "next/link";
import { type ComponentProps, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";

type SidebarVariant = "client" | "superadmin";

type SidebarLink = {
  href: string;
  label: string;
  Icon?: (props: ComponentProps<"svg">) => JSX.Element;
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
      {
        href: "/dashboard",
        label: "Painel geral",
        Icon: DashboardIcon,
        helper: "Resumo do funil e performance"
      },
      {
        href: "/search",
        label: "Busca global",
        Icon: SearchIcon,
        helper: "Encontre contatos e mensagens"
      }
    ]
  },
  {
    title: "Atendimento",
    links: [
      {
        href: "/inbox",
        label: "Inbox omnichannel",
        Icon: InboxIcon,
        helper: "Atenda e acompanhe SLAs"
      }
    ]
  },
  {
    title: "Vendas & CRM",
    links: [
      {
        href: "/workspaces",
        label: "Workspaces",
        Icon: CompassIcon,
        helper: "Troque de unidade ou time"
      }
    ]
  },
];

const superAdminSections: SidebarSectionData[] = [
  {
    title: "Super Admin",
    links: [
      {
        href: "/super-admin",
        label: "Visão geral",
        Icon: ShieldIcon,
        helper: "Panorama de workspaces"
      },
      {
        href: "/super-admin/marketplace",
        label: "Agentes do CRM",
        Icon: BotIcon,
        helper: "Cadastro e configuração"
      },
      {
        href: "/super-admin/support",
        label: "Impersonação",
        Icon: SupportIcon,
        helper: "Suporte e acesso seguro"
      },
      {
        href: "/super-admin/templates",
        label: "Templates",
        Icon: TemplateIcon,
        helper: "Automações oficiais"
      }
    ]
  }
];

function DashboardIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

function SearchIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

function InboxIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12l4-7h10l4 7v6H3v-6z" />
      <path d="M3 12h6l3 3 3-3h6" />
    </svg>
  );
}

function CompassIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 14l4-2 2-4-4 2-2 4z" />
    </svg>
  );
}

function ShieldIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}

function BotIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 7V4" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M9 16h6" />
    </svg>
  );
}

function SupportIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function TemplateIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 4v16" />
    </svg>
  );
}

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
              href={link.href}
              onClick={onNavigate}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-slate-300 transition group-hover:bg-blue-500/20 group-hover:text-blue-200">
                {link.Icon ? (
                  <link.Icon className="h-4 w-4" />
                ) : (
                  <span aria-hidden="true" className="text-sm leading-none">
                    {link.emoji ?? "•"}
                  </span>
                )}
              </span>
              <div>
                <p className="font-medium">{link.label}</p>
                {link.helper ? (
                  <p className="text-xs text-slate-500 group-hover:text-slate-300">
                    {link.helper}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function SidebarNav({
  variant,
  extraSections,
  footerActions
}: SidebarNavProps) {
  const [open, setOpen] = useState(false);
  const sections =
    variant === "superadmin" ? superAdminSections : clientSections;

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
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-slate-900/80 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900/90 px-5 py-6 shadow-2xl backdrop-blur transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-lg font-bold text-blue-200">
              A
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">AtendeAi</p>
              <p className="text-xs text-slate-400">Automação inteligente</p>
            </div>
          </div>
          <button
            className="text-xs text-slate-400 hover:text-slate-200 md:hidden"
            onClick={() => setOpen(false)}
            type="button"
          >
            Fechar ✕
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-5 overflow-y-auto pr-2 [scrollbar-color:#64748b_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-track]:bg-transparent">
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
