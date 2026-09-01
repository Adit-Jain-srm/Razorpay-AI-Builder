"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";

/**
 * Theme toggle. Icon visibility is driven by the `.dark` class (set by
 * next-themes before paint) via CSS, so there is no hydration mismatch and no
 * mount-gating effect.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { play } = useSound();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label="Toggle theme"
      onClick={() => {
        play("toggle");
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
