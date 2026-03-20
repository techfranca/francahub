"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Loader2, Save, Trash2, Mail, Phone, Instagram, Linkedin, Briefcase } from "lucide-react"
import { toast } from "sonner"

interface Profile {
  nome: string
  cargo: string
  bio: string
  avatar_url: string
  telefone: string
  instagram: string
  linkedin: string
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [email, setEmail] = useState("")
  const [googleAvatar, setGoogleAvatar] = useState("")
  const [form, setForm] = useState<Profile>({
    nome: "",
    cargo: "",
    bio: "",
    avatar_url: "",
    telefone: "",
    instagram: "",
    linkedin: "",
  })

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/profile")
    const data = await res.json()
    if (data.profile) {
      setForm({
        nome: data.profile.nome || data.user.name || "",
        cargo: data.profile.cargo || "",
        bio: data.profile.bio || "",
        avatar_url: data.profile.avatar_url || "",
        telefone: data.profile.telefone || "",
        instagram: data.profile.instagram || "",
        linkedin: data.profile.linkedin || "",
      })
    } else {
      setForm(prev => ({ ...prev, nome: data.user.name || "" }))
    }
    setEmail(data.user.email || "")
    setGoogleAvatar(data.user.avatar || "")
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Perfil atualizado!")
    } else {
      toast.error("Erro ao salvar perfil")
    }
    setSaving(false)
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData })
    const data = await res.json()

    if (res.ok) {
      setForm(prev => ({ ...prev, avatar_url: data.avatar_url }))
      toast.success("Foto atualizada!")
    } else {
      toast.error(data.error || "Erro ao enviar foto")
    }
    setUploading(false)
  }

  async function handleAvatarRemove() {
    setUploading(true)
    const res = await fetch("/api/profile/avatar", { method: "DELETE" })
    if (res.ok) {
      setForm(prev => ({ ...prev, avatar_url: "" }))
      toast.success("Foto removida")
    }
    setUploading(false)
  }

  function triggerFileInput() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/jpeg,image/png,image/webp"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleAvatarUpload(file)
    }
    input.click()
  }

  const avatarSrc = form.avatar_url || googleAvatar
  const initials = (form.nome || email).split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar Section */}
      <Card className="shadow-card border-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-emerald-100 flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt={form.nome} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-emerald-600">{initials}</span>
                )}
              </div>
              <button
                onClick={triggerFileInput}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{form.nome || "Seu nome"}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
              <div className="flex gap-2 mt-3">
                <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={triggerFileInput} disabled={uploading}>
                  Alterar foto
                </Button>
                {form.avatar_url && (
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs text-muted-foreground hover:text-destructive" onClick={handleAvatarRemove} disabled={uploading}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="shadow-card border-transparent">
        <CardContent className="p-6 space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações Pessoais</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Nome completo</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Seu nome"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Cargo / Função</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm(prev => ({ ...prev, cargo: e.target.value }))}
                  placeholder="Ex: Gestor de Tráfego"
                  className="rounded-xl h-11 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground/70">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={email}
                disabled
                className="rounded-xl h-11 pl-10 bg-muted/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground/70">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Conte um pouco sobre você..."
              className="rounded-xl min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Social */}
      <Card className="shadow-card border-transparent">
        <CardContent className="p-6 space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato & Redes</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="rounded-xl h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Instagram</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@seuuser"
                  className="rounded-xl h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">LinkedIn</Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/seu-perfil"
                  className="rounded-xl h-11 pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl h-10 px-6 font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </div>
    </div>
  )
}
