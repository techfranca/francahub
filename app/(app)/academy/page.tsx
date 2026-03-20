"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  GraduationCap, BookOpen, TrendingUp, Briefcase, Zap,
  Plus, Search, Eye, EyeOff, Copy, Check, ExternalLink,
  Trash2, Loader2, X, Layout, BarChart3, Layers
} from "lucide-react"
import { toast } from "sonner"

interface Course {
  id: string
  nome: string
  categoria: string | null
  descricao: string | null
  url: string | null
  login: string | null
  senha: string | null
  cor: string
  icon: string
  ativo: boolean
  created_at: string
}

const iconMap: Record<string, React.ElementType> = {
  BookOpen, TrendingUp, Briefcase, Zap, GraduationCap, BarChart3, Layout, Layers
}

const colorMap: Record<string, { bg: string; light: string; text: string; badge: string }> = {
  blue:   { bg: 'bg-blue-500',   light: 'bg-blue-100',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  green:  { bg: 'bg-emerald-500',light: 'bg-emerald-100',text: 'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  pink:   { bg: 'bg-pink-500',   light: 'bg-pink-100',   text: 'text-pink-600',   badge: 'bg-pink-100 text-pink-700' },
  amber:  { bg: 'bg-amber-500',  light: 'bg-amber-100',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  cyan:   { bg: 'bg-cyan-500',   light: 'bg-cyan-100',   text: 'text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700' },
  red:    { bg: 'bg-red-500',    light: 'bg-red-100',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
}

function getColor(cor: string) {
  return colorMap[cor] || colorMap.blue
}

const EMPTY_FORM = {
  nome: '', categoria: '', descricao: '', url: '',
  login: '', senha: '', cor: 'blue', icon: 'BookOpen',
}

export default function AcademyPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("all")
  const [selected, setSelected] = useState<Course | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/academy')
    if (res.ok) setCourses(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const categories = Array.from(new Set(courses.map(c => c.categoria).filter(Boolean))) as string[]

  const filtered = courses.filter(c => {
    const matchSearch = !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.categoria || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.descricao || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || c.categoria === filterCat
    return matchSearch && matchCat
  })

  async function handleCopy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Copiado!')
    setTimeout(() => setCopied(null), 1500)
  }

  async function handleAdd() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newCourse = await res.json()
      setCourses(prev => [newCourse, ...prev])
      setForm(EMPTY_FORM)
      setShowAdd(false)
      toast.success('Curso adicionado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este curso?')) return
    setDeleting(true)
    try {
      await fetch(`/api/academy/${id}`, { method: 'DELETE' })
      setCourses(prev => prev.filter(c => c.id !== id))
      setSelected(null)
      toast.success('Curso removido')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Academia</h1>
            <p className="text-muted-foreground text-sm">Cursos e plataformas de aprendizado da equipe</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo Curso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Cursos', value: courses.length, icon: BookOpen, color: 'bg-violet-100 text-violet-600' },
          { label: 'Plataformas', value: Array.from(new Set(courses.map(c => c.nome))).length, icon: Layout, color: 'bg-blue-100 text-blue-600' },
          { label: 'Categorias', value: categories.length, icon: Layers, color: 'bg-emerald-100 text-emerald-600' },
        ].map(stat => (
          <Card key={stat.label} className="shadow-card border-transparent">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-0.5">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar curso, categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-11 bg-white shadow-card border-transparent"
          />
        </div>
        <Select value={filterCat} onValueChange={v => setFilterCat(v || 'all')}>
          <SelectTrigger className="w-48 rounded-xl h-11 shadow-card border-transparent bg-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card border-transparent">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-violet-400" />
            </div>
            <p className="font-semibold text-lg">Nenhum curso encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">Adicione o primeiro curso da academia</p>
            <Button onClick={() => setShowAdd(true)} className="mt-4 rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Adicionar Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(course => {
            const colors = getColor(course.cor)
            const Icon = iconMap[course.icon] || BookOpen
            return (
              <Card
                key={course.id}
                onClick={() => setSelected(course)}
                className="shadow-card border-transparent hover:shadow-card-hover cursor-pointer transition-all duration-200 overflow-hidden group"
              >
                <div className={`h-1.5 ${colors.bg}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${colors.light} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">{course.nome}</h3>
                        {course.categoria && (
                          <Badge className={`text-[10px] rounded-full border-0 shrink-0 ${colors.badge}`}>
                            {course.categoria}
                          </Badge>
                        )}
                      </div>
                      {course.descricao && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{course.descricao}</p>
                      )}
                      {course.url && (
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground/60 truncate">{new URL(course.url).hostname.replace('www.', '')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {(() => {
                  const colors = getColor(selected.cor)
                  const Icon = iconMap[selected.icon] || BookOpen
                  return (
                    <>
                      <div className={`w-9 h-9 ${colors.light} rounded-xl flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      {selected.nome}
                    </>
                  )
                })()}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {selected.categoria && (
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs rounded-full border-0 ${getColor(selected.cor).badge}`}>
                    {selected.categoria}
                  </Badge>
                </div>
              )}
              {selected.descricao && (
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.descricao}</p>
              )}

              {/* Login */}
              {selected.login && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Login / E-mail</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm font-mono border border-border/50">
                      {selected.login}
                    </div>
                    <button
                      onClick={() => handleCopy(selected.login!, 'login')}
                      className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    >
                      {copied === 'login' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Senha */}
              {selected.senha && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm font-mono border border-border/50">
                      {revealedPasswords[selected.id] ? selected.senha : '••••••••••••'}
                    </div>
                    <button
                      onClick={() => setRevealedPasswords(prev => ({ ...prev, [selected.id]: !prev[selected.id] }))}
                      className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    >
                      {revealedPasswords[selected.id] ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <button
                      onClick={() => handleCopy(selected.senha!, 'senha')}
                      className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    >
                      {copied === 'senha' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full rounded-xl gap-2">
                      <ExternalLink className="h-4 w-4" /> Acessar Plataforma
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-red-50 hover:border-red-200 shrink-0"
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Curso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Nome do Curso / Plataforma *</Label>
                <Input placeholder="Ex: Mentoria Traffic.me" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <Input placeholder="Ex: Tráfego, Design, IA..." value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">URL da Plataforma</Label>
                <Input placeholder="https://..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Descrição</Label>
                <Input placeholder="Breve descrição do curso..." value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Login / E-mail</Label>
                <Input placeholder="Email de acesso" value={form.login} onChange={e => setForm(p => ({ ...p, login: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Senha</Label>
                <Input placeholder="Senha de acesso" type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cor</Label>
                <Select value={form.cor} onValueChange={v => setForm(p => ({ ...p, cor: v || 'blue' }))}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(colorMap).map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorMap[c].bg}`} />
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ícone</Label>
                <Select value={form.icon} onValueChange={v => setForm(p => ({ ...p, icon: v || 'BookOpen' }))}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(iconMap).map(ic => (
                      <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl gap-2" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Salvar Curso
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
