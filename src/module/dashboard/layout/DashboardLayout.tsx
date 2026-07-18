import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAuth } from "@/module/auth/hooks";
import HeaderControls from "./HeaderControls";
import { NAV_ITEMS } from "./nav-items";

export default function DashboardLayout({
  children,
  module = "DASHBOARD",
}: {
  children: ReactNode;
  module?: "DASHBOARD" | "CHAT";
}) {
  const { logoutMutation, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => event.matches && setMobileOpen(false);
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    const trigger = triggerRef.current;
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !drawer?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (window.matchMedia("(max-width: 767px)").matches) trigger?.focus();
    };
  }, [mobileOpen]);

  async function onLogout() {
    await logoutMutation.mutateAsync();
    navigate("/signin");
  }

  const navigation = (
    <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5 group-data-[collapsed=true]/sidebar:px-2">
      {["Workspace", "Insights", "Manage"].map((group) => (
        <div className="mb-6" key={group}>
          <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/70 group-data-[collapsed=true]/sidebar:hidden">{group}</p>
          <ul className="space-y-1">
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
              const active = item.url === "/" ? location.pathname === "/" : item.url && (location.pathname === item.url || location.pathname.startsWith(`${item.url}/`));
              return (
                <li key={item.title}>
                  {item.disabled ? (
                    <span aria-disabled="true" title={item.title} className="flex min-h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/65 group-data-[collapsed=true]/sidebar:justify-center">
                      <item.icon className="size-4" aria-hidden="true" />
                      <span className="flex-1 group-data-[collapsed=true]/sidebar:hidden">{item.title}</span>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-sidebar-foreground group-data-[collapsed=true]/sidebar:hidden">Soon</span>
                    </span>
                  ) : (
                    <Link to={item.url!} title={item.title} aria-label={item.title} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors group-data-[collapsed=true]/sidebar:justify-center ${active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                      <item.icon className="size-4" aria-hidden="true" />
                      <span className="group-data-[collapsed=true]/sidebar:hidden">{item.title}</span>
                      {active && <span className="ml-auto size-1.5 rounded-full bg-current group-data-[collapsed=true]/sidebar:hidden" aria-hidden="true" />}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebar = (
    <>
      <div className="flex h-17 items-center gap-3 border-b border-sidebar-border px-5 group-data-[collapsed=true]/sidebar:px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><BarChart3 className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 group-data-[collapsed=true]/sidebar:hidden"><p className="truncate text-sm font-semibold">Fineract Intelligence</p><p className="text-xs text-sidebar-foreground/70">Report workspace</p></div>
      </div>
      {navigation}
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">{user?.username?.slice(0, 2) || "U"}</span>
          <div className="min-w-0 group-data-[collapsed=true]/sidebar:hidden"><p className="truncate text-sm font-medium">{user?.username || "Team member"}</p><p className="text-xs text-sidebar-foreground/70">Authorized user</p></div>
        </div>
        <button aria-label={logoutMutation.isPending ? "Signing out" : "Sign out"} disabled={logoutMutation.isPending} onClick={onLogout} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:opacity-50 group-data-[collapsed=true]/sidebar:justify-center">
          <LogOut className="size-4" aria-hidden="true" /><span className="group-data-[collapsed=true]/sidebar:hidden">{logoutMutation.isPending ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside data-collapsed={collapsed} className={`group/sidebar relative hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex ${collapsed ? "w-20" : "w-64"}`}>
        {sidebar}
        <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} className="absolute right-2 top-[1.125rem] grid size-8 place-items-center rounded-lg hover:bg-sidebar-accent">
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label="Mobile navigation" className="relative flex h-full w-[min(18rem,88vw)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
            {sidebar}
            <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg hover:bg-sidebar-accent"><X className="size-5" aria-hidden="true" /></button>
          </aside>
        </div>
      )}

      <div inert={mobileOpen} className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-17 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={triggerRef} aria-label="Open navigation" aria-expanded={mobileOpen} className="grid size-10 shrink-0 place-items-center rounded-lg border hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" aria-hidden="true" /></button>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{module === "CHAT" ? "AI Report Chat" : "Report Dashboard"}</p><p className="hidden text-xs text-muted-foreground sm:block">Welcome back, {user?.username || "team member"}</p></div>
          </div>
          <HeaderControls isMobile={isMobile} onLogout={onLogout} />
        </header>

        <main className={module === "CHAT" ? "min-h-0 flex-1 overflow-hidden px-1 md:p-3" : "flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8"}>
          <div className={module === "CHAT" ? "h-full min-h-0 w-full" : "mx-auto w-full max-w-7xl"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
