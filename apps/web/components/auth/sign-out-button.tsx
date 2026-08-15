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
      <Button type="submit" variant="ghost" size="sm">
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}
