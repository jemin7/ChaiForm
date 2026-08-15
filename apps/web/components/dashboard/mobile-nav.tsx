"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "~/components/brand/brand-mark";
import { ProBadge } from "~/components/dashboard/pro-badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { navItems } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="rounded-2xl lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-background p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <BrandMark href="/dashboard" />
                <ProBadge />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close navigation"
                className="rounded-xl"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <Button asChild className="mb-5 w-full rounded-2xl shadow-lg shadow-black/10">
              <Link href="/dashboard/forms/create" onClick={() => setOpen(false)}>
                <Plus className="size-4" />
                Create form
              </Link>
            </Button>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-foreground text-background shadow-lg shadow-black/10 hover:bg-foreground hover:text-background dark:bg-white dark:text-black",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
