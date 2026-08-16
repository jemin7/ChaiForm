import Link from "next/link";

import { cn } from "~/lib/utils";

interface BrandMarkProps {
  href?: string;
  compact?: boolean;
  className?: string;
  /** Extra classes for the "ChaiForm" wordmark, e.g. to hide it on tiny screens. */
  wordmarkClassName?: string;
}

export function BrandMark({ href = "/", compact = false, className, wordmarkClassName }: BrandMarkProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative flex size-10 items-center justify-center rounded-2xl border border-white/15 bg-foreground text-background shadow-lg shadow-black/10">
        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="size-full">
          <path d="M14.5 18.5C13 15.5 16 13.5 14.5 10.5" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 18.5C21.5 15.5 18.5 13.5 20 10.5" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 19h16v6a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5V19z" fill="currentColor" />
          <path d="M27 21.5h1.6a2.6 2.6 0 0 1 0 5.2H27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19.4h14v1.2a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-1.2z" fill="#34d399" />
        </svg>
        <span className="absolute -right-1 -top-1 size-3 rounded-full bg-emerald-400 ring-4 ring-background" />
      </span>
      {!compact ? (
        <span className={cn("text-lg font-semibold tracking-tight", wordmarkClassName)}>ChaiForm</span>
      ) : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex rounded-2xl outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
