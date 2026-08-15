"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Bell, Camera, KeyRound, Loader2, Monitor, Moon, ShieldCheck, Sparkles, Sun, User, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  changePasswordAction,
  updateProfileAction,
  type SettingsActionState,
} from "~/app/(authenticated)/dashboard/settings/actions";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { trpc } from "~/trpc/client";

interface SettingsPanelProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const initialState: SettingsActionState = {};

export function SettingsPanel({ user }: SettingsPanelProps) {
  const { setTheme, theme } = useTheme();
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, initialState);

  // The server action persists the new name in the database, but the navbar
  // and this page read the name from the NextAuth JWT. Push the rename into
  // the session and re-render so it shows up without a re-login.
  useEffect(() => {
    if (!profileState.success) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await update({ name });
      } catch {
        // The database save already succeeded; a session refresh failure is
        // not fatal — the name will appear after the next sign-in.
      }

      if (!cancelled) {
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileState.success, name, update, router]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Settings</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Manage your profile, security preferences, notifications, and workspace presentation.
        </p>
      </section>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-card/80 p-1 backdrop-blur">
          <TabsTrigger value="profile" className="rounded-xl"><User className="size-4" />Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl"><Sun className="size-4" />Appearance</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl"><ShieldCheck className="size-4" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl"><Bell className="size-4" />Notifications</TabsTrigger>
          <TabsTrigger value="workspace" className="rounded-xl"><Users className="size-4" />Workspace</TabsTrigger>
          <TabsTrigger value="plan" className="rounded-xl"><Sparkles className="size-4" />Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <SettingsCard title="Profile">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="size-20">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback>{user.name?.charAt(0) ?? "A"}</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" className="w-fit rounded-2xl" disabled title="Coming soon">
                  <Camera className="size-4" />
                  Upload avatar
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Avatar uploads are not available yet.</p>
              </div>
            </div>
            <form action={profileAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Name</Label>
                  <Input
                    id="settings-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input id="settings-email" value={user.email ?? ""} className="rounded-2xl" disabled readOnly />
                </div>
              </div>
              {profileState.error ? <p className="text-sm text-destructive">{profileState.error}</p> : null}
              {profileState.success ? <p className="text-sm text-emerald-600">{profileState.success}</p> : null}
              <Button type="submit" className="w-fit rounded-2xl">Update profile</Button>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="appearance">
          <SettingsCard title="Appearance">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className="rounded-2xl border bg-background/60 p-5 text-left transition hover:-translate-y-1 hover:shadow-lg data-[active=true]:border-foreground"
                  data-active={theme === item.value}
                >
                  <item.icon className="mb-4 size-5" />
                  <p className="font-medium">{item.label}</p>
                </button>
              ))}
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="security">
          <SettingsCard title="Security">
            <form action={passwordAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    className="rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="rounded-2xl"
                    required
                  />
                </div>
              </div>
              {passwordState.error ? <p className="text-sm text-destructive">{passwordState.error}</p> : null}
              {passwordState.success ? <p className="text-sm text-emerald-600">{passwordState.success}</p> : null}
              <Button type="submit" className="w-fit rounded-2xl">
                <KeyRound className="size-4" />
                Change password
              </Button>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsCard title="Notifications">
            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Email me on new responses</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Turn this on per form — open any form, go to the Settings tab, and flip the toggle.
                  </p>
                </div>
                <Link
                  href="/dashboard/forms"
                  className="shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Open forms
                </Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Global notification preferences are coming soon.
            </p>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="workspace">
          <SettingsCard title="Workspace">
            <p className="text-sm text-muted-foreground">Workspace settings are not available yet.</p>
            <div className="space-y-2">
              <Label>Workspace name</Label>
              <Input defaultValue="ChaiForm Studio" className="rounded-2xl" disabled />
            </div>
            <div className="space-y-2">
              <Label>Default form visibility</Label>
              <select className="h-11 w-full rounded-2xl border bg-background px-4 text-sm" disabled>
                <option>Private</option>
                <option>Public</option>
              </select>
            </div>
            <Button className="w-fit rounded-2xl" disabled>Save workspace</Button>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="plan">
          <PlanCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanCard() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const upgradeMutation = trpc.auth.upgradeToPro.useMutation({
    onSuccess() {
      toast.success("Welcome to ChaiForm Pro!");
      meQuery.refetch();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const plan = meQuery.data?.plan ?? "free";
  const isPro = plan === "pro";

  return (
    <SettingsCard title="Your plan">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-background/60 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{isPro ? "ChaiForm Pro" : "ChaiForm Free"}</p>
            <Badge
              className={`rounded-full ${isPro ? "bg-emerald-500 text-white" : ""}`}
              variant={isPro ? "default" : "secondary"}
            >
              {isPro ? "Active" : "Current"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPro
              ? "AI form generation and AI response insights are unlocked."
              : "Upgrade for AI form generation and AI response insights."}
          </p>
        </div>
        {isPro ? null : (
          <Button
            className="shrink-0 rounded-2xl"
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
          >
            {upgradeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            Upgrade to Pro
          </Button>
        )}
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {[
          "Unlimited forms and responses",
          "AI form generation from a text prompt",
          "AI response insights and summaries",
          "Remove ChaiForm branding",
        ].map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Demo upgrade — payment processing is not wired up yet.{" "}
        <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
          View pricing
        </Link>
      </p>
    </SettingsCard>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
