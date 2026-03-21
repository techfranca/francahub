"use client"

import { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutDashboard,
  Video,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  UserCircle,
  UsersRound,
  Key,
  GraduationCap,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const navGroups = [
  {
    label: "Geral",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Clientes", href: "/clients", icon: Users },
      { title: "Reuniões", href: "/meetings", icon: Video },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Ads & Performance", href: "/ads", icon: BarChart3 },
      { title: "Insights IA", href: "/insights", icon: Sparkles },
    ],
  },
  {
    label: "Equipe",
    items: [
      { title: "Membros", href: "/members", icon: UsersRound },
      { title: "Códigos 2FA", href: "/verification-codes", icon: Key },
      { title: "Academia", href: "/academy", icon: GraduationCap },
    ],
  },
]

const settingsItems = [
  { title: "Perfil", href: "/settings/profile", icon: UserCircle },
  { title: "Integrações", href: "/settings/integrations", icon: Settings },
]

interface UserInfo {
  name: string
  email: string
  avatar: string
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, toggleSidebar } = useSidebar()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/profile")
        if (res.ok) {
          const data = await res.json()
          setUser({
            name: data.profile?.nome || data.user.name || data.user.email?.split("@")[0] || "",
            email: data.user.email || "",
            avatar: data.profile?.avatar_url || data.user.avatar || "",
          })
        }
      } catch {
        // ignore
      }
    }
    loadUser()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = (user?.name || "U").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="overflow-visible">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={state === "expanded" ? "Minimizar sidebar" : "Reabrir sidebar"}
        title={state === "expanded" ? "Minimizar sidebar" : "Reabrir sidebar"}
        className="absolute right-[-16px] top-1/2 z-30 hidden h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-border/70 bg-background/95 text-muted-foreground shadow-md shadow-black/5 backdrop-blur transition-all duration-200 hover:bg-muted hover:text-foreground md:flex"
      >
        {state === "expanded" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <SidebarHeader className="p-5 pb-2">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Franca"
            width={36}
            height={36}
            className="shrink-0"
            style={{ width: 'auto', height: 'auto' }}
          />
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-[15px] font-bold text-foreground leading-none tracking-tight">
              Franca Hub
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Gestão de Clientes
            </p>
          </div>
        </Link>

        {/* User info */}
        {user && (
          <Link href="/settings/profile" className="flex items-center gap-3 mt-4 p-2 rounded-xl hover:bg-muted/60 transition-colors group">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-emerald-100 flex items-center justify-center shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-emerald-600">{initials}</span>
              )}
            </div>
            <div className="group-data-[collapsible=icon]:hidden min-w-0">
              <p className="text-sm font-medium truncate leading-none">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <SidebarSeparator className="mx-3 my-1.5 bg-border/60" />}
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em] font-semibold px-3 mb-0.5">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          tooltip={item.title}
                          className={`h-10 rounded-xl transition-all duration-150 ${isActive
                            ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                          <span className="truncate text-[13px]">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}

        <SidebarSeparator className="mx-3 my-1.5 bg-border/60" />

        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em] font-semibold px-3 mb-0.5">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {settingsItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      className={`h-10 rounded-xl transition-all duration-150 ${isActive
                        ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                      <span className="truncate text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="h-10 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all duration-150"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate text-[13px]">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}
