"use client";

import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Robot, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useSound } from "@/hooks/use-sound";

import { getActiveRoute } from "@/lib/nav";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function UserMenu() {
  const router = useRouter();

  const onSignOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        await createClient().auth.signOut();
      }
    } catch {
      // ignore - we navigate to login regardless
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      aria-label="Sign out"
      title="Sign out"
    >
      <Avatar className="size-6">
        <AvatarFallback className="bg-primary/15 text-[10px] font-medium text-primary">OP</AvatarFallback>
      </Avatar>
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const route = getActiveRoute(pathname);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const toggleAgentRail = useUiStore((state) => state.toggleAgentRail);
  const { enabled: soundEnabled, toggle: toggleSoundEnabled } = useSound();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate font-heading text-sm font-semibold text-foreground">{route?.label ?? "MediaOS"}</h1>
        {route?.description ? <p className="hidden truncate text-xs text-muted-foreground sm:block">{route.description}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-8 w-64 items-center gap-2 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-input/50 sm:flex"
        >
          <MagnifyingGlass className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search or run a command</span>
          <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Search" onClick={() => setCommandOpen(true)}>
          <MagnifyingGlass />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          onClick={toggleSoundEnabled}
          title={soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {soundEnabled ? <SpeakerHigh /> : <SpeakerSlash />}
        </Button>

        <UserMenu />

        <Button variant="outline" size="icon-sm" aria-label="Toggle Operator rail" onClick={toggleAgentRail}>
          <Robot />
        </Button>
      </div>
    </header>
  );
}
