import type { Session } from "next-auth";
import Link from "next/link";
import { Plus } from "lucide-react";

import { BrandMark } from "~/components/brand/brand-mark";
import { SignOutButton } from "~/components/auth/sign-out-button";
import { MobileNav } from "~/components/dashboard/mobile-nav";
import { ProBadge } from "~/components/dashboard/pro-badge";
import { NavbarSearch } from "~/components/dashboard/navbar-search";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface DashboardNavbarProps {
  session: Session;
}

export function DashboardNavbar({ session }: DashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-background/75 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav />
        <div className="lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark href="/dashboard" compact />
            <ProBadge className="md:hidden" />
          </div>
        </div>
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Workspace</p>
            <h1 className="truncate text-lg font-semibold">ChaiForm Studio</h1>
          </div>
          <ProBadge />
        </div>
        <div className="relative hidden w-72 lg:block">
          <NavbarSearch />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button asChild className="hidden rounded-2xl sm:inline-flex">
          <Link href="/dashboard/forms/create">
            <Plus className="size-4" />
            New form
          </Link>
        </Button>
        <ThemeToggle />
        <Avatar className="size-9">
          <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ""} />
          <AvatarFallback>
            {session.user.name?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
