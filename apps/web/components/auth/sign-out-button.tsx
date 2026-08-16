import { LogOut } from "lucide-react";

import { signOut } from "@repo/auth";

import { Button } from "~/components/ui/button";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="rounded-xl">
        <LogOut aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
