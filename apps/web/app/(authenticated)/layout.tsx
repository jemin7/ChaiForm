import { redirect } from "next/navigation";

import { auth } from "@repo/auth";

import { DashboardNavbar } from "~/components/dashboard/dashboard-navbar";
import { DashboardSidebar } from "~/components/dashboard/dashboard-sidebar";
import { ChessBackground } from "~/components/layout/chess-background";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ChessBackground className="min-h-screen">
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar session={session} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
    </ChessBackground>
  );
}
