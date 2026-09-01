"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";

import { NAV_ROUTES } from "@/lib/nav";
import { getRegisteredCommandActions } from "@/lib/command-actions";
import "@/lib/command-actions-init";
import { useUiStore } from "@/stores/ui-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * Cmd+K command palette. Seeds itself with navigation + theme actions and reads
 * the shared command-action registry so feature verticals (the Operator) can
 * extend it. Global ⌘K / Ctrl+K listener toggles it open.
 */
export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const toggleCommand = useUiStore((state) => state.toggleCommand);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleCommand();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleCommand]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const registeredActions = getRegisteredCommandActions();

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAV_ROUTES.map((route) => {
            const Icon = route.icon;
            return (
              <CommandItem key={route.href} value={`Go to ${route.label}`} onSelect={() => navigate(route.href)}>
                <Icon className="size-4 text-muted-foreground" />
                {route.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {registeredActions.length > 0 ? (
          <CommandGroup heading="Actions">
            {registeredActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${(action.keywords ?? []).join(" ")}`}
                  onSelect={() => {
                    setOpen(false);
                    if (action.type === "navigate") router.push(action.href);
                    else void action.run();
                  }}
                >
                  {ActionIcon ? <ActionIcon className="size-4 text-muted-foreground" /> : null}
                  {action.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Theme">
          <CommandItem value="Theme dark" onSelect={() => { setTheme("dark"); setOpen(false); }}>
            <Moon className="size-4 text-muted-foreground" />
            Dark
          </CommandItem>
          <CommandItem value="Theme light" onSelect={() => { setTheme("light"); setOpen(false); }}>
            <Sun className="size-4 text-muted-foreground" />
            Light
          </CommandItem>
          <CommandItem value="Theme system" onSelect={() => { setTheme("system"); setOpen(false); }}>
            <Desktop className="size-4 text-muted-foreground" />
            System
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
