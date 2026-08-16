import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface ChessBackgroundProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

export function ChessBackground({ children, className, innerClassName }: ChessBackgroundProps) {
  return (
    <div className={cn("relative isolate overflow-x-clip bg-background", className)}>
      <div aria-hidden className="absolute inset-0 -z-30 chess-grid opacity-70" />
      <div aria-hidden className="absolute left-1/2 top-0 -z-20 size-[34rem] -translate-x-1/2 rounded-full bg-slate-400/20 blur-3xl dark:bg-white/10" />
      <div aria-hidden className="absolute bottom-10 right-[-8rem] -z-20 size-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-400/10" />
      <div aria-hidden className="floating-glow absolute left-8 top-24 -z-10 size-36 rounded-full bg-foreground/10 blur-2xl" />
      <div className={innerClassName}>{children}</div>
    </div>
  );
}
