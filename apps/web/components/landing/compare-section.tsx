"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

export interface ComparisonRow {
  label: string;
  values: [string | boolean, string | boolean, string | boolean];
}

// Data is preserved from the original section, ordered most important first.
export const comparisonRows: ComparisonRow[] = [
  { label: "Price", values: ["Free to start · Pro for AI", "Free", "$29+/mo"] },
  { label: "Response limits", values: ["Unlimited on Free", "Unlimited", "Strict monthly caps — forms pause"] },
  { label: "Design quality", values: ["Polished, glassy, theme-aware", "Plain and uniform", "Beautiful, but paywalled"] },
  { label: "AI form generation", values: ["Yes — Pro plan", "Gemini, paid Workspace", "Yes — paid tiers"] },
  { label: "AI response insights", values: ["Yes — Pro plan", "Paid Workspace only", "Add-ons / workflows"] },
  { label: "File uploads", values: ["Yes", "Yes", "Limited / add-ons"] },
  { label: "Email notifications", values: ["Built in", "Add-on required", "Workflows, paid"] },
  { label: "CSV export", values: ["One click", "Yes", "Paid tiers"] },
  { label: "QR code + share links", values: ["Built in", "Limited", "Paid tiers"] },
  { label: "Remove branding", values: ["Pro plan", "No", "Paid tiers"] },
];

const products: Array<{ name: string; badge?: string }> = [
  { name: "ChaiForm", badge: "You" },
  { name: "Google Forms" },
  { name: "Typeform" },
];

function rowsDiffer(row: ComparisonRow): boolean {
  const [a, b, c] = row.values;
  return JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(b) !== JSON.stringify(c);
}

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
};

function ComparisonCell({ value, emphasized }: { value: string | boolean; emphasized: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
        <Check className="size-4" aria-hidden="true" /> Yes
      </span>
    );
  }

  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
        <X className="size-4" aria-hidden="true" /> No
      </span>
    );
  }

  return (
    <span className={cn("text-sm leading-5", emphasized && "text-emerald-600 dark:text-emerald-300")}>
      {value}
    </span>
  );
}

export function CompareSection() {
  // The comparison data is static, so loading is never triggered today — the
  // state is wired up so async data can slot in without reworking the UI.
  const [isLoading, setIsLoading] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const visibleRows = onlyDifferences ? comparisonRows.filter(rowsDiffer) : comparisonRows;

  return (
    <section id="compare" className="mx-auto max-w-7xl px-5 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Compare</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight">ChaiForm vs Google Forms vs Typeform.</h2>
        <p className="mt-4 text-muted-foreground">
          The short version: Google Forms is free but flat, Typeform is beautiful but caps your
          responses hard — ChaiForm keeps the polish without the limits.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        className="mt-10 overflow-hidden rounded-[2rem] border bg-card/95 shadow-xl backdrop-blur-xl"
      >
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2">
            <Switch
              id="compare-differences"
              checked={onlyDifferences}
              onCheckedChange={setOnlyDifferences}
            />
            <label
              htmlFor="compare-differences"
              className="cursor-pointer text-sm font-medium"
            >
              Only show differences
            </label>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {onlyDifferences
              ? `${visibleRows.length} of ${comparisonRows.length} attributes differ`
              : "Select a column to focus it"}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <CheckCircle2 className="size-9 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-medium">No differences to show</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              All three products match on every attribute. Turn off &ldquo;Only show differences&rdquo;
              to see the full list.
            </p>
          </div>
        ) : comparisonRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No comparison data to display yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-40 min-w-40 bg-card/95 p-4 font-medium text-muted-foreground backdrop-blur-xl"
                  >
                    Capability
                  </th>
                  {products.map((product, index) => {
                    const active = selected === index;

                    return (
                      <th key={product.name} scope="col" className="p-2 sm:p-3">
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelected(index)}
                          className={cn(
                            "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                            active
                              ? "bg-foreground text-background shadow-lg shadow-black/10 dark:bg-white dark:text-black"
                              : "hover:bg-muted/60",
                          )}
                        >
                          <span className="flex items-center gap-2 font-semibold">
                            {product.name}
                            {product.badge ? (
                              <Badge className="rounded-full">{product.badge}</Badge>
                            ) : null}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 w-40 min-w-40 bg-card/95 p-4 font-medium backdrop-blur-xl"
                    >
                      {row.label}
                    </th>
                    {row.values.map((value, column) => (
                      <td
                        key={column}
                        className={cn(
                          "p-4 align-top transition-colors",
                          column === selected && "bg-primary/[0.04]",
                        )}
                      >
                        <ComparisonCell value={value} emphasized={column === 0} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t bg-muted/30 p-5 sm:flex-row sm:px-6">
          <p className="text-sm text-muted-foreground">Ready to see the difference for yourself?</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-2xl">
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
