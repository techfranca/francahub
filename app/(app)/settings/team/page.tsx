"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Clock, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TeamMember {
  id: string
  email: string
  name: string | null
  created_at: string
  last_sign_in_at: string | null
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/team")
    if (res.ok) setMembers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMembers()
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id || null)
    })
  }, [fetchMembers])

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Nunca acessou"
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function formatJoinDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        <p className="text-muted-foreground mt-1">
          Membros com acesso ao Franca Hub · Login via Google
        </p>
      </div>

      {/* Stats */}
      <Card className="shadow-card border-transparent">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold">{members.length}</p>
            <p className="text-sm text-muted-foreground">Membros ativos</p>
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <Card className="shadow-card border-transparent">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">Nenhum membro ainda</p>
            <p className="text-muted-foreground text-sm mt-1">
              Adicione e-mails em <code className="bg-muted px-1.5 py-0.5 rounded text-xs">ALLOWED_EMAILS</code> no .env.local
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId
            const initials = (member.name || member.email || "?")
              .split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

            return (
              <Card key={member.id} className="shadow-card border-transparent hover:shadow-card-hover transition-all">
                <CardContent className="p-5 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-emerald-600">{initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">
                        {member.name || member.email?.split("@")[0]}
                      </p>
                      {isCurrentUser && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 rounded-full px-2">
                          Você
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Último acesso: {formatDate(member.last_sign_in_at)}
                      </span>
                    </div>
                  </div>

                  {/* Join date */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">Entrou em</p>
                    <p className="text-xs font-medium mt-0.5">{formatJoinDate(member.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info box */}
      <Card className="shadow-card border-transparent bg-muted/30">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Como adicionar membros?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Adicione o e-mail da pessoa em <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ALLOWED_EMAILS</code> no arquivo <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> e reinicie o servidor. Na próxima vez que ela acessar e clicar em "Entrar com Google", o acesso será criado automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
