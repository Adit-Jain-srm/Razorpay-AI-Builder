"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "mediaos:sound";

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "on";
}

function getServerSnapshot(): boolean {
  return false;
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function toggleSound() {
  const next = !getSnapshot();
  localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  notify();
}

export function useSound() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const play = useCallback(
    (type: "click" | "success" | "pop" | "toggle") => {
      if (!enabled) return;
      void import("@/lib/sound").then((mod) => mod.playSound(type));
    },
    [enabled],
  );

  return { enabled, play, toggle: toggleSound };
}
