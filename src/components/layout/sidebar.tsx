"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

import { getActiveRoute, NAV_ROUTES } from "@/lib/nav";
import { useUiStore } from "@/stores/ui-store";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedIndicator } from "@/components/motion";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const activeRoute = getActiveRoute(pathname);
  const reduced = useReducedMotion();
  const { play } = useSound();

  const handleToggleSidebar = () => {
    play("toggle");
    toggleSidebar();
  };

  return (
    <aside
      className={cn(
        "hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        "shadow-[inset_-1px_0_0_0_oklch(1_0_0/4%)]",
        collapsed ? "w-14" : "w-60",
      )}
      style={{
        transition: reduced ? "none" : "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed && "justify-center px-0")}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ROUTES.map((route) => {
          const Icon = route.icon;
          const active = activeRoute?.href === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              title={collapsed ? route.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer",
                "transition-all duration-[var(--motion-duration-fast)]",
                active
                  ? "bg-sidebar-accent text-foreground shadow-[0_0_8px_oklch(0.696_0.17_162.5/20%)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground hover:translate-x-0.5",
                collapsed && "justify-center px-0",
                !reduced && "hover:translate-x-0.5",
              )}
              style={!reduced ? { transition: "background-color 0.1s ease, color 0.1s ease, transform 0.1s ease" } : undefined}
            >
              {active && !collapsed ? (
                <AnimatedIndicator layoutId="sidebar-active-indicator" />
              ) : null}
              <Icon weight={active ? "fill" : "regular"} className={cn("size-[18px] shrink-0 transition-transform duration-[var(--motion-duration-fast)] group-hover:-translate-y-px group-hover:scale-110 motion-reduce:group-hover:transform-none", active && "text-primary")} />
              {!collapsed ? <span className="truncate">{route.label}</span> : null}
              {collapsed && active ? (
                <motion.div
                  layoutId="sidebar-active-dot"
                  className="absolute -right-0.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30 }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("flex items-center gap-1 border-t border-sidebar-border p-2", collapsed ? "flex-col" : "justify-between")}>
        <ThemeToggle />
        <Button variant="ghost" size="icon-sm" onClick={handleToggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="btn-press">
          {collapsed ? <CaretRight /> : <CaretLeft />}
        </Button>
      </div>
    </aside>
  );
}
