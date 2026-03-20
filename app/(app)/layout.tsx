import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Mobile trigger — desktop usa o botão dentro da sidebar */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/40 lg:hidden">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground">Franca Hub</span>
            </div>
            <main className="mx-auto max-w-[1400px] px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
