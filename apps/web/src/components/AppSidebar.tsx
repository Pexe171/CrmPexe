import {
  LayoutDashboard,
  MessageSquare,
  Users,
  TrendingUp,
  Settings,
  Bot,
  Plug,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useAuthMe } from "@/hooks/useAuthMe";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Contatos", url: "/contacts", icon: Users },
  { title: "Vendas", url: "/sales", icon: TrendingUp },
  { title: "Agentes", url: "/agents", icon: Bot },
  { title: "Integracoes", url: "/integrations", icon: Plug },
];

const adminNav = [
  { title: "Workspaces", url: "/admin/workspaces", icon: Building2 },
];

const bottomNav = [
  { title: "Atendimento", url: "/support", icon: Headphones },
  { title: "Configuracoes", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: me } = useAuthMe();
  const isAdmin = Boolean(me?.isSuperAdmin || me?.role === "ADMIN");

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">Ai</span>
        </div>
        {!collapsed && (
          <span className="text-foreground font-semibold text-lg tracking-tight">
            AtendeAi
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {mainNav.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
            activeClassName="bg-sidebar-accent text-primary font-medium"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </p>
              </div>
            )}
            {adminNav.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
                activeClassName="bg-sidebar-accent text-primary font-medium"
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="py-4 px-2 space-y-1 border-t border-sidebar-border">
        {bottomNav.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
            activeClassName="bg-sidebar-accent text-primary font-medium"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
