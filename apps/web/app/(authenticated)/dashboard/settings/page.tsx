import { auth } from "@repo/auth";

import { SettingsPanel } from "~/components/dashboard/settings-panel";

export default async function SettingsPage() {
  const session = await auth();

  return <SettingsPanel user={session?.user ?? {}} />;
}
