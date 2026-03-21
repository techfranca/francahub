import { ChevronRight } from "lucide-react"
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
        <SidebarInset className="relative flex flex-1 min-w-0 flex-col overflow-hidden md:peer-data-[state=collapsed]:[&_.app-shell]:mx-0 md:peer-data-[state=collapsed]:[&_.app-shell]:max-w-none">

          {/* Botão flutuante para reabrir sidebar — aparece na borda esquerda no centro */}
          <SidebarTrigger className="absolute left-4 top-6 z-30 hidden h-12 rounded-2xl border border-emerald-600 bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(5,150,105,0.35)] transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white md:flex md:pointer-events-none md:translate-y-[-10px] md:opacity-0 md:peer-data-[state=collapsed]:pointer-events-auto md:peer-data-[state=collapsed]:translate-y-0 md:peer-data-[state=collapsed]:opacity-100 [&_svg]:h-4 [&_svg]:w-4">
            <span className="flex items-center gap-2">
              <ChevronRight />
              Abrir menu
            </span>
          </SidebarTrigger>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Mobile trigger */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/40 lg:hidden">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground">Franca Hub</span>
            </div>
            <main className="app-shell mx-auto w-full max-w-[1400px] px-4 py-4 transition-[max-width,margin] duration-200 md:px-6 md:py-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
