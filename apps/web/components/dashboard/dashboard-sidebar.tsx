"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Plus, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "~/components/brand/brand-mark";
import { ProBadge } from "~/components/dashboard/pro-badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { navItems } from "./nav-items";

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar/80 p-4 backdrop-blur-xl lg:block",
        collapsed ? "w-[5.5rem]" : "w-72",
      )}
    >
      <div className={cn("mb-8 flex items-center justify-between gap-3", collapsed && "flex-col gap-3")}>
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark href="/dashboard" compact={collapsed} />
          {!collapsed ? <ProBadge /> : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle sidebar"
          className={cn("rounded-xl", collapsed && "rotate-180")}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      {!collapsed ? (
        <Button asChild className="mb-5 w-full rounded-2xl shadow-lg shadow-black/10">
          <Link href="/dashboard/forms/create">
            <Plus className="size-4" />
            Create form
          </Link>
        </Button>
      ) : null}

      <nav className="space-y-2">
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-foreground text-background shadow-lg shadow-black/10 hover:bg-foreground hover:text-background dark:bg-white dark:text-black",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" /> : null}
      <Icon aria-hidden="true" className="size-4" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}
