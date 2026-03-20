import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 px-6 pt-5 pb-0 md:hidden">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          </div>
          <main className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
