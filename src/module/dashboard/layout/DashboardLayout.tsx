import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LogOut, Menu, MessageCircle } from "lucide-react";
import { EachElement } from "../../../shared/components/ui/each-element";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import HeaderControls from "./HeaderControls";
import type { NavItem } from "@/shared/types";
import { NAV_ITEMS } from "./nav-items";
import { useAuth } from "@/module/auth/hooks";

export default function DashboardLayout({
  children,
  module = "DASHBOARD",
}: {
  children: ReactNode;
  module?: "DASHBOARD" | "CHAT";
}) {
  const { logoutMutation, user } = useAuth()
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile);
    if (!isMobile) setMobileOpen(false);
  }
  const onChatView = location.pathname === "/chat";

  async function onLogout() {
    await logoutMutation.mutateAsync();
    navigate("/signin");
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className="flex w-full">
        {module === "DASHBOARD" && (
          <aside
            className={
              "z-20 hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ease-linear " +
              (collapsed ? "w-16" : "w-64")
            }
          >
            <div className="px-3 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-md bg-primary/10 p-2">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    F
                  </div>
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Fineract Chat</span>
                    <span className="text-xs text-sidebar-foreground/70">
                      Chat Console
                    </span>
                  </div>
                )}
                <button
                  aria-label="Toggle sidebar"
                  onClick={() => setCollapsed((s) => !s)}
                  className="ml-auto p-2 rounded-md hover:bg-sidebar-accent"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-auto py-4">
              <DashboardNavigationList collapsed={collapsed} />
            </nav>

            <div className="px-3 py-4 border-t">
              {!collapsed && (
                <button 
                  disabled={logoutMutation.isPending} 
                  onClick={() => onLogout()}
                  className="mt-3 w-full text-left px-3 py-2 rounded-md hover:bg-sidebar-accent flex items-center gap-3 hover:cursor-pointer"
                >
                  <LogOut className="h-4 w-4" /> {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <div className="h-5 w-5 rounded-full bg-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      Apache Fineract Chat
                    </div>
                    <div className="text-xs text-sidebar-foreground/70">
                      Cashier
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-md hover:bg-sidebar-accent"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-6">
                <ul className="space-y-2">
                  <EachElement
                    of={NAV_ITEMS}
                    render={(item: NavItem) => {
                      const isActive =
                        item.url === "/"
                          ? location.pathname === "/"
                          : location.pathname === item.url ||
                            location.pathname.startsWith(item.url + "/");

                      return (
                        <li key={item.title}>
                          <Link
                            to={item.url}
                            className={
                              "flex items-center gap-3 px-3 py-2 rounded-md " +
                              (isActive
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-sidebar-accent")
                            }
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </li>
                      );
                    }}
                  />
                </ul>
              </nav>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-screen min-w-0 relative">
          {/* Header */}
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:px-6 py-4 border-b bg-white/50 dark:bg-slate-900/40 z-10">
            <div className="flex items-start md:items-center gap-4">
              <button
                className="md:hidden p-2 rounded-md hover:bg-sidebar-accent"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="flex flex-col md:flex-row text-sm md:text-2xl font-semibold">
                  <span>Welcome back, </span> <span> {user?.username}!</span>
                </h2>
                <p className="hidden md:block text-xs md:text-sm text-muted-foreground">
                  Here's what's happening with your store today.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2 rounded-full border border-muted bg-muted/60 p-1 text-xs font-medium">
                <Link
                  to="/"
                  className={
                    "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                    (!onChatView
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Home className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <Link
                  to="/chat"
                  className={
                    "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                    (onChatView
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </Link>
              </div>

              <HeaderControls isMobile={isMobile} onLogout={onLogout} />
            </div>
          </header>

          {/* Content */}
          {module === "DASHBOARD" && (
            <main className="flex-1 px-1 md:p-6 overflow-y-auto flex flex-col items-start space-y-3">
              <div className="flex-1 w-full mx-auto flex flex-col">
                {children}
              </div>
              {/* Footer */}
              <footer className="px-1 md:px-6 py-4 border-t text-sm text-muted-foreground w-full items-end">
                © {new Date().getFullYear()} Fineract Chat. All rights reserved.
              </footer>
            </main>
          )}
          {module === "CHAT" && (
            <main className="min-h-0 flex-1 overflow-hidden px-1 md:p-3">
              <div className="h-full min-h-0 w-full">{children}</div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

const DashboardNavigationList = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <ul className="space-y-1">
      <EachElement
        of={NAV_ITEMS}
        render={(item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname === item.url ||
                location.pathname.startsWith(item.url + "/");

          return (
            <li key={item.title}>
              <Link
                to={item.url}
                className={
                  "flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors text-sm " +
                  (collapsed ? "justify-center" : "justify-start") +
                  (isActive
                    ? " bg-primary/10 text-primary"
                    : " hover:bg-sidebar-accent")
                }
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </Link>
            </li>
          );
        }}
      />
    </ul>
  );
};
