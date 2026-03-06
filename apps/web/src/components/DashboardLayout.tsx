import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, TrendingUp, Menu, MoreHorizontal } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const mobileNav = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Vendas", url: "/sales", icon: TrendingUp },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar: hidden on mobile */}
      <div className="hidden md:block shrink-0">
        <AppSidebar />
      </div>
      <main className={`flex-1 overflow-auto ${isMobile ? "pb-16" : ""}`}>
        {children}
      </main>
      {/* Bottom nav: only on mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-pb">
          {mobileNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 px-4 min-w-[64px] text-xs transition-colors ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 py-2 px-4 min-w-[64px] text-xs text-muted-foreground"
              >
                <MoreHorizontal className="w-5 h-5 shrink-0" />
                <span>Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <div className="grid gap-2 py-4">
                <NavLink
                  to="/agents"
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-3 rounded-lg hover:bg-accent text-sm font-medium"
                >
                  Agentes
                </NavLink>
                <NavLink
                  to="/integrations"
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-3 rounded-lg hover:bg-accent text-sm font-medium"
                >
                  Integrações
                </NavLink>
                <NavLink
                  to="/settings/tags"
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-3 rounded-lg hover:bg-accent text-sm font-medium"
                >
                  Tags
                </NavLink>
                <NavLink
                  to="/settings/queues"
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-3 rounded-lg hover:bg-accent text-sm font-medium"
                >
                  Filas
                </NavLink>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      )}
    </div>
  );
}
