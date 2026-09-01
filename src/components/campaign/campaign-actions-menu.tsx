"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, DotsThreeVertical, Play, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  deleteCampaignAction,
  duplicateCampaignAction,
  setCampaignStatusAction,
} from "@/app/(dashboard)/campaigns/actions";
import type { CampaignStatus } from "@/lib/campaign/brief";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CampaignActionsMenuProps {
  id: string;
  status: CampaignStatus;
  /** When true, deleting returns to the list instead of refreshing in place. */
  redirectOnDelete?: boolean;
}

export function CampaignActionsMenu({ id, status, redirectOnDelete }: CampaignActionsMenuProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const changeStatus = (next: CampaignStatus, label: string) => {
    start(async () => {
      const result = await setCampaignStatusAction(id, next);
      if (result.ok) {
        toast.success(label);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const duplicate = () => {
    start(async () => {
      const result = await duplicateCampaignAction(id);
      if (result.ok) {
        toast.success("Campaign duplicated");
        router.push(`/campaigns/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  const remove = () => {
    start(async () => {
      const result = await deleteCampaignAction(id);
      if (result.ok) {
        toast.success("Campaign deleted");
        if (redirectOnDelete) router.push("/campaigns");
        else router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Campaign actions" disabled={pending} />}
      >
        <DotsThreeVertical weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {status !== "active" ? (
          <DropdownMenuItem onClick={() => changeStatus("active", "Campaign activated")}>
            <Play weight="fill" /> Set active
          </DropdownMenuItem>
        ) : null}
        {status !== "draft" ? (
          <DropdownMenuItem onClick={() => changeStatus("draft", "Moved to draft")}>
            <PencilSimple /> Move to draft
          </DropdownMenuItem>
        ) : null}
        {status !== "archived" ? (
          <DropdownMenuItem onClick={() => changeStatus("archived", "Campaign archived")}>
            <Archive /> Archive
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={duplicate}>
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
