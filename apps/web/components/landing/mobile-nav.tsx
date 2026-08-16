"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Button } from "~/components/ui/button";

const links = [
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="size-10 rounded-2xl bg-background/70 backdrop-blur"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-16 z-50 border-b bg-background/95 px-4 pb-6 pt-3 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-white/5"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-3.5 text-base font-medium transition hover:bg-muted active:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-11 rounded-2xl">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild className="h-11 rounded-2xl">
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Start free
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
