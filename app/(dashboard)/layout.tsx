import { currentUser } from "@clerk/nextjs/server";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AccessDenied } from "@/components/access-denied";
import { isHydrillaEmail } from "@/lib/email";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress;

  if (!isHydrillaEmail(email)) {
    return <AccessDenied />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Admin</span>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>
        <div className="flex-1 px-6 py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
