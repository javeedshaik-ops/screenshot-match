import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  Lightbulb,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Ambient, Logo } from "@/components/brand";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/interview/new", label: "Start New Interview", icon: PlusCircle },
  { to: "/history", label: "Practice History", icon: History },
  { to: "/analytics", label: "Performance Analytics", icon: BarChart3 },
  { to: "/practice", label: "Learning Recommendations", icon: Lightbulb },
  { to: "/settings", label: "Profile & Settings", icon: Settings },
] as const;

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const focus = path.startsWith("/interview/") && path !== "/interview/new";

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center justify-between px-1">
        {!collapsed && <Logo to="/dashboard" />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      {NAV.map((n) => {
        const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setMobileOpen(false)}
            title={n.label}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-sidebar-accent text-foreground shadow-[inset_2px_0_0_var(--violet)]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <n.icon className={`size-4.5 shrink-0 ${active ? "text-violet" : ""}`} />
            {!collapsed && n.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="size-4.5" /> {!collapsed && "Logout"}
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <Ambient />
      {!focus && (
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar backdrop-blur-2xl transition-[width] duration-300 lg:block ${
            collapsed ? "w-[76px]" : "w-[260px]"
          }`}
        >
          {sidebar}
        </aside>
      )}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-background/70" />
          <aside
            className="glass-strong absolute left-0 top-0 h-full w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {!focus && (
          <div className="flex items-center justify-between border-b border-glass-border px-4 py-3 lg:hidden">
            <Logo to="/dashboard" />
            <button
              onClick={() => setMobileOpen(true)}
              className="btn-ghost !p-2"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        )}
        <main className={`mx-auto w-full ${focus ? "max-w-6xl" : "max-w-6xl"} px-4 py-8 md:px-8`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
