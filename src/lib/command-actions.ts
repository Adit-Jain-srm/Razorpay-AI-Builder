import type { Icon } from "@phosphor-icons/react";

/**
 * Command palette action registry. The palette seeds itself with navigation +
 * theme actions; feature verticals (the Operator especially) extend it by
 * calling `registerCommandAction` at module load so capabilities are one
 * keystroke away.
 */

export interface CommandActionBase {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  icon?: Icon;
}

export interface NavigateCommandAction extends CommandActionBase {
  type: "navigate";
  href: string;
}

export interface RunCommandAction extends CommandActionBase {
  type: "run";
  run: () => void | Promise<void>;
}

export type CommandAction = NavigateCommandAction | RunCommandAction;

const registered: CommandAction[] = [];

export function registerCommandAction(action: CommandAction): void {
  if (registered.some((existing) => existing.id === action.id)) return;
  registered.push(action);
}

export function registerCommandActions(actions: CommandAction[]): void {
  for (const action of actions) registerCommandAction(action);
}

export function getRegisteredCommandActions(): CommandAction[] {
  return [...registered];
}
