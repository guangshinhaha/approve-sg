import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { GovBanner } from "@/components/gov-banner";
import { AppSidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <GovBanner />
      <div className="flex flex-1">
        <AppSidebar user={user} />
        <main className="flex-1 bg-approve-surface-alt overflow-auto">
          <div className="max-w-content mx-auto px-6 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
