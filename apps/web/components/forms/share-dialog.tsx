"use client";

import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

interface ShareDialogProps {
  slug: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ slug, title, open, onOpenChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/f/${slug}`);
  }, [slug]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Share link copied to clipboard");
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-4 text-emerald-500" aria-hidden="true" />
            Share “{title}”
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <QRCodeSVG value={url} size={176} level="M" bgColor="#ffffff" fgColor="#18181b" />
          </div>
          <div className="flex w-full items-center gap-2">
            <Input readOnly value={url} className="rounded-2xl text-sm" aria-label="Form share link" />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-2xl"
              onClick={copyLink}
              aria-label="Copy share link"
            >
              {copied ? <Check className="size-4 text-emerald-500" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button asChild variant="ghost" className="rounded-2xl">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              Open form in new tab
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
