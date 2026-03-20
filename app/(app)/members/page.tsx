"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Instagram, Linkedin, Loader2, Users } from "lucide-react"

interface Member {
  id: string
  email: string
  nome: string
  cargo: string | null
  bio: string | null
  avatar_url: string | null
  telefone: string | null
  instagram: string | null
  linkedin: string | null
  created_at: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/members")
    if (res.ok) {
      const data = await res.json()
      setMembers(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
        <p className="text-muted-foreground mt-1">Conheça a equipe da Franca Assessoria</p>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Users className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{members.length}</p>
          <p className="text-xs text-muted-foreground">membros na equipe</p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {members.map((member) => {
            const initials = (member.nome || member.email)
              .split(" ")
              .map(w => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()

            return (
              <Card key={member.id} className="shadow-card border-transparent hover:shadow-card-hover transition-all overflow-hidden group">
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                <CardContent className="p-6">
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-100 flex items-center justify-center shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-emerald-600">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">{member.nome}</h3>
                      {member.cargo && (
                        <Badge variant="outline" className="mt-1 text-[11px] font-medium rounded-full px-2.5 h-5">
                          {member.cargo}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                      {member.bio}
                    </p>
                  )}

                  {/* Contact info */}
                  <div className="space-y-2 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{member.email}</span>
                    </div>
                    {member.telefone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{member.telefone}</span>
                      </div>
                    )}

                    {/* Social links */}
                    {(member.instagram || member.linkedin) && (
                      <div className="flex items-center gap-3 pt-2">
                        {member.instagram && (
                          <a
                            href={member.instagram.startsWith("http") ? member.instagram : `https://instagram.com/${member.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                        {member.linkedin && (
                          <a
                            href={member.linkedin.startsWith("http") ? member.linkedin : `https://${member.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
