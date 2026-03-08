'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Loader2, Trash2, BrainCircuit, X, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'

const NEON_PINK = '#ff007a'

interface Coach {
  id: string
  name: string
  description: string | null
  persona: string | null
  methodology: string | null
  tone: string
  intervention_level: string
  product_name: string | null
  product_description: string | null
  product_differentials: string | null
  product_pricing_info: string | null
  product_target_audience: string | null
  script_name: string | null
  script_steps: any[]
  script_objections: any[]
  script_content: string | null
  is_active: boolean
  is_default: boolean
}

const emptyForm: Omit<Coach, 'id'> = {
  name: '',
  description: null,
  persona: null,
  methodology: 'SPIN Selling',
  tone: 'CONSULTIVE',
  intervention_level: 'MEDIUM',
  product_name: null,
  product_description: null,
  product_differentials: null,
  product_pricing_info: null,
  product_target_audience: null,
  script_name: null,
  script_steps: [],
  script_objections: [],
  script_content: null,
  is_active: true,
  is_default: false,
}

const TONE_OPTIONS = [
  { value: 'CONSULTIVE', label: 'Consultivo', desc: 'Equilibrado e profissional' },
  { value: 'AGGRESSIVE', label: 'Direto', desc: 'Assertivo e desafiador' },
  { value: 'EMPATHETIC', label: 'Empatico', desc: 'Acolhedor e paciente' },
] as const

export default function CoachesPage() {
  const [mounted, setMounted] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [uploadingScript, setUploadingScript] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchCoaches()
  }, [])

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  async function fetchCoaches() {
    setLoading(true)
    try {
      const data = await api.get('/api/coaches')
      setCoaches(data || [])
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar coaches' })
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowAdvanced(false)
    setModalOpen(true)
  }

  async function openEdit(id: string) {
    try {
      const data = await api.get(`/api/coaches/${id}`)
      setEditingId(id)
      setForm({
        name: data.name || '',
        description: data.description,
        persona: data.persona,
        methodology: data.methodology || 'SPIN Selling',
        tone: data.tone || 'CONSULTIVE',
        intervention_level: data.intervention_level || 'MEDIUM',
        product_name: data.product_name,
        product_description: data.product_description,
        product_differentials: data.product_differentials,
        product_pricing_info: data.product_pricing_info,
        product_target_audience: data.product_target_audience,
        script_name: data.script_name,
        script_steps: data.script_steps || [],
        script_objections: data.script_objections || [],
        script_content: data.script_content || null,
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
      })
      setShowAdvanced(false)
      setModalOpen(true)
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFeedback({ type: 'error', message: 'Nome do coach e obrigatorio' })
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/api/coaches/${editingId}`, form)
        setFeedback({ type: 'success', message: 'Coach atualizado!' })
      } else {
        await api.post('/api/coaches', form)
        setFeedback({ type: 'success', message: 'Coach criado!' })
      }
      setModalOpen(false)
      fetchCoaches()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    }
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja deletar o coach "${name}"?`)) return
    try {
      await api.delete(`/api/coaches/${id}`)
      setFeedback({ type: 'success', message: 'Coach deletado.' })
      fetchCoaches()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    }
  }

  function updateForm(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await api.put(`/api/coaches/${id}`, { is_active: !currentActive })
      setCoaches(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c))
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    }
  }

  async function handleScriptUpload(file: File) {
    setUploadingScript(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload('/api/coaches/parse-script', formData)
      updateForm('script_content', result.script_content)
      setFeedback({ type: 'success', message: 'Script extraido e organizado!' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao processar o PDF' })
    }
    setUploadingScript(false)
  }

  if (!mounted) return null

  // Reusable PDF upload component
  function PdfUploadArea({
    id, uploading, content, onUpload, onClear, label, loadingText, icon: Icon
  }: {
    id: string; uploading: boolean; content: string | null;
    onUpload: (file: File) => void; onClear: () => void;
    label: string; loadingText: string; icon: any
  }) {
    return (
      <div className="space-y-3">
        <Label className="text-gray-300 text-sm font-medium">{label}</Label>
        <div
          className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
            uploading
              ? 'border-neon-pink/40 bg-neon-pink/5'
              : content
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-white/10 hover:border-white/20 bg-black/20'
          }`}
          onClick={() => { if (!uploading) document.getElementById(id)?.click() }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
          onDrop={async e => {
            e.preventDefault(); e.stopPropagation()
            const file = e.dataTransfer.files?.[0]
            if (file && file.type === 'application/pdf') onUpload(file)
            else setFeedback({ type: 'error', message: 'Apenas arquivos PDF' })
          }}
        >
          <input
            id={id}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ''
            }}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-neon-pink" />
              <span className="text-sm text-neon-pink font-medium">{loadingText}</span>
            </div>
          ) : content ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Carregado</span>
              <span className="text-xs text-gray-500">Clique para substituir</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Icon className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-400">Arraste o PDF ou clique aqui</span>
            </div>
          )}
        </div>

        {content && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Revise e ajuste se necessario</span>
              <button type="button" onClick={onClear} className="text-[10px] text-red-400 hover:text-red-300">
                Remover
              </button>
            </div>
            <Textarea
              value={content}
              onChange={e => updateForm('script_content', e.target.value || null)}
              rows={8}
              className="bg-black/30 border-white/10 text-white resize-y text-xs leading-relaxed"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <DashboardHeader title="Coaches" />

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all duration-300 ${feedback.type === 'success'
          ? 'bg-green-900/80 border-green-500/30 text-green-300'
          : 'bg-red-900/80 border-red-500/30 text-red-300'
          }`}>
          {feedback.message}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Crie coaches com script de vendas para seus vendedores. Basta fazer upload do PDF.
        </p>
        <Button
          onClick={openCreate}
          className="bg-neon-pink hover:bg-neon-pink/90 text-white font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Coach
        </Button>
      </div>

      {/* Coaches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : coaches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neon-pink/10 flex items-center justify-center mb-4">
            <BrainCircuit className="w-8 h-8 text-neon-pink" />
          </div>
          <p className="text-gray-400 text-sm mb-2">Nenhum coach criado ainda.</p>
          <p className="text-gray-500 text-xs mb-6">Faca upload do PDF do script para criar seu primeiro coach.</p>
          <Button onClick={openCreate} className="bg-neon-pink hover:bg-neon-pink/90 text-white font-bold gap-2">
            <Plus className="w-4 h-4" />
            Criar primeiro coach
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map(coach => (
            <Card
              key={coach.id}
              className="bg-[#1e1e1e] border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
              onClick={() => openEdit(coach.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,0,122,0.1)' }}>
                      <BrainCircuit className="w-5 h-5" style={{ color: NEON_PINK }} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{coach.name}</h3>
                      <span className="text-[10px] text-gray-500">
                        {coach.tone === 'AGGRESSIVE' ? 'Direto' : coach.tone === 'EMPATHETIC' ? 'Empatico' : 'Consultivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(coach.id, coach.name) }}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {coach.is_default && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Padrao
                      </span>
                    )}
                    {coach.script_content && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Script
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(coach.id, coach.is_active) }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${coach.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                    title={coach.is_active ? 'Desativar coach' : 'Ativar coach'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${coach.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Create/Edit — Single Screen */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !saving && setModalOpen(false)}>
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Editar Coach' : 'Novo Coach'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">

              {/* Name */}
              <div className="space-y-2">
                <Label className="text-gray-300">Nome do Coach *</Label>
                <p className="text-[10px] text-gray-500">Identifica o coach para os vendedores na extensao.</p>
                <Input
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="Ex: Coach de SaaS B2B"
                  required
                  autoFocus
                  className="bg-black/30 border-white/10 text-white placeholder:text-gray-600"
                />
              </div>

              {/* Script PDF Upload */}
              <PdfUploadArea
                id="script-pdf-input"
                uploading={uploadingScript}
                content={form.script_content}
                onUpload={handleScriptUpload}
                onClear={() => updateForm('script_content', null)}
                label="Script de Vendas (PDF)"
                loadingText="Extraindo script..."
                icon={Upload}
              />
              <p className="text-[10px] text-gray-500 -mt-3">O roteiro de vendas que a IA usara como referencia durante a ligacao. Faca upload do PDF e o texto sera extraido automaticamente.</p>

              {/* Extra Instructions */}
              <div className="space-y-2">
                <Label className="text-gray-300">Instrucoes extras (opcional)</Label>
                <p className="text-[10px] text-gray-500">Orientacoes adicionais para a IA seguir durante o coaching em tempo real.</p>
                <Textarea
                  value={form.persona || ''}
                  onChange={e => updateForm('persona', e.target.value || null)}
                  placeholder="Ex: Foque em perguntas de dor antes de apresentar o produto. Nunca fale o preco antes de entender a necessidade. Sempre sugira agendar uma demo."
                  rows={3}
                  className="bg-black/30 border-white/10 text-white placeholder:text-gray-600 resize-none text-sm"
                />
              </div>

              {/* Advanced Settings (collapsible) */}
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Configuracoes avancadas</span>
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvanced && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                    {/* Tone — visual toggle buttons */}
                    <div className="space-y-2 pt-3">
                      <Label className="text-gray-300 text-xs">Tom do Coach</Label>
                      <p className="text-[10px] text-gray-500">Define o estilo de comunicacao da IA com o vendedor durante a ligacao.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {TONE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateForm('tone', opt.value)}
                            className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                              form.tone === opt.value
                                ? 'border-neon-pink/50 bg-neon-pink/10 text-white'
                                : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <div>{opt.label}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_default}
                          onChange={e => updateForm('is_default', e.target.checked)}
                          className="rounded border-white/20 bg-black/30 accent-[#ff007a]"
                        />
                        Coach padrao
                      </label>
                      <p className="text-[10px] text-gray-500 ml-6">Sera selecionado automaticamente quando o vendedor abrir a extensao.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-400 hover:bg-white/5"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-neon-pink hover:bg-neon-pink/90 text-white font-bold"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Salvar' : 'Criar Coach'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
