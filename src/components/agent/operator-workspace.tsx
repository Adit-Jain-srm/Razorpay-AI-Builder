"use client";

import { useQuery } from "@tanstack/react-query";
import { ChatText, Plus, Trash } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useOperator } from "./use-operator";
import { OperatorChat } from "./operator-chat";

interface ConversationSummary {
  id: string;
  title: string;
  campaignId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full-screen Operator: a campaign-scoped conversation history rail beside the
 * live chat. History is fetched via TanStack Query (re-fetched whenever the
 * active conversation changes) and is best-effort - real when Supabase is
 * configured, empty and gracefully hidden offline.
 */
export function OperatorWorkspace({ campaignId, campaignName }: { campaignId?: string; campaignName?: string }) {
  const pathname = usePathname();
  const controller = useOperator({ campaignId, campaignName, currentPath: pathname });

  const { data: conversations = [] } = useQuery<ConversationSummary[]>({
    queryKey: ["operator", "conversations", campaignId ?? null, controller.conversationId ?? null],
    queryFn: () => fetchConversations(campaignId),
  });

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar/30 lg:flex">
        <div className="flex h-12 shrink-0 items-center justify-between px-3">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Conversations</span>
          <Button size="icon-xs" variant="ghost" aria-label="New conversation" onClick={controller.reset}>
            <Plus />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-0.5 p-2">
            {conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-pretty text-muted-foreground">
                No saved conversations yet. Start one and it will appear here.
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void controller.loadConversation(conversation.id)}
                  className={cn(
                    "group/conv flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                    controller.conversationId === conversation.id && "bg-muted",
                  )}
                >
                  <ChatText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{conversation.title}</span>
                    <span className="block text-[10px] text-muted-foreground">{formatDate(conversation.updatedAt)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void controller.deleteConversation(conversation.id);
                    }}
                    className="ml-auto opacity-0 group-hover/conv:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                  >
                    <Trash className="size-3" />
                  </button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      <div className="min-w-0 flex-1">
        <OperatorChat controller={controller} variant="full" />
      </div>
    </div>
  );
}

async function fetchConversations(campaignId?: string): Promise<ConversationSummary[]> {
  const params = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";
  const res = await fetch(`/api/operator/chat${params}`, { method: "GET" });
  if (!res.ok) return [];
  const data = (await res.json()) as { conversations?: ConversationSummary[] };
  return data.conversations ?? [];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
