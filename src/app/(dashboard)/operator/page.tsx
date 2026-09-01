import type { Metadata } from "next";

import { OperatorWorkspace } from "@/components/agent/operator-workspace";

export const metadata: Metadata = { title: "Operator" };

/**
 * Full-screen home of the Operator - the platform's primary surface. Renders the
 * live agent workspace (conversation history + streaming chat with plans, tool
 * calls, and artifacts). The same agent runs in the persistent rail.
 */
export default function OperatorPage() {
  return (
    <div className="h-full min-h-0">
      <OperatorWorkspace />
    </div>
  );
}
