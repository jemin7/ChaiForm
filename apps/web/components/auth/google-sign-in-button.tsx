import { ArrowRight } from "lucide-react";

import { signIn } from "@repo/auth";

import { Button } from "~/components/ui/button";

interface GoogleSignInButtonProps {
  callbackUrl?: string;
}

export function GoogleSignInButton({ callbackUrl = "/dashboard" }: GoogleSignInButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl });
      }}
    >
      <Button type="submit" size="lg" className="w-full">
        Continue with Google
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
