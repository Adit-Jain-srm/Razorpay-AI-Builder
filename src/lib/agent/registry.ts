import { ToolRegistry } from "./types";

/**
 * Shared Operator tool registry. Feature teams import this singleton and call
 * `agentToolRegistry.register(defineTool({ ... }))` to expose a capability to
 * the agent. The runtime (agent-core phase) reads from it to build the AI SDK
 * tool set and to render artifacts.
 */
export const agentToolRegistry = new ToolRegistry();
