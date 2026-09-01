"use client";

import { create } from "zustand";

/**
 * Global UI state for the dashboard shell: sidebar collapse, command palette
 * visibility, and the Operator agent rail. Kept intentionally small - feature
 * state lives in TanStack Query / feature stores.
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;

  commandOpen: boolean;
  setCommandOpen: (value: boolean) => void;
  toggleCommand: () => void;

  agentRailOpen: boolean;
  toggleAgentRail: () => void;
  setAgentRailOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

  commandOpen: false,
  setCommandOpen: (value) => set({ commandOpen: value }),
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),

  agentRailOpen: true,
  toggleAgentRail: () => set((state) => ({ agentRailOpen: !state.agentRailOpen })),
  setAgentRailOpen: (value) => set({ agentRailOpen: value }),
}));
