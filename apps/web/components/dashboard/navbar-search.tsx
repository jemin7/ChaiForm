"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

import { Input } from "~/components/ui/input";

export function NavbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();

        if (trimmed) {
          router.push(`/dashboard/forms?q=${encodeURIComponent(trimmed)}`);
        } else {
          router.push("/dashboard/forms");
        }
      }}
      className="relative"
    >
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-10 rounded-2xl bg-card/70 pl-9 backdrop-blur"
        placeholder="Search workspace..."
        aria-label="Search forms"
      />
    </form>
  );
}
