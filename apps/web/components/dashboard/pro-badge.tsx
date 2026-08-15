"use client";

import { Sparkles } from "lucide-react";

import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

interface ProBadgeProps {
  className?: string;
}

/**
 * Premium emerald "Pro" badge shown next to the ChaiForm brand for users on
 * the Pro plan. Renders nothing for free users or while the plan loads.
 */
export function ProBadge({ className }: ProBadgeProps) {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });

  if (meQuery.data?.plan !== "pro") {
    return null;
  }

  return (
    <span
      title="Pro plan"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm shadow-emerald-500/30",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      Pro
    </span>
  );
}
