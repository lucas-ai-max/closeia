'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { SessionConfig } from '@/hooks/use-web-session'

interface Script {
  id: string
  name: string
}

interface Coach {
  id: string
  name: string
}

interface SessionConfigFormProps {
  onStart: (config: SessionConfig) => void
}

const NEON_PINK = '#ff007a'

export function SessionConfigForm({ onStart }: SessionConfigFormProps) {
  const [leadName, setLeadName] = useState('')
  const [scriptId, setScriptId] = useState('')
  const [coachId, setCoachId] = useState('')
  const [scripts, setScripts] = useState<Script[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking')
  const [requestingMic, setRequestingMic] = useState(false)
  const supabase = createClient()

  // Check microphone permission on mount
  useEffect(() => {
    async function checkMic() {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        result.onchange = () => setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
      } catch {
        // Firefox doesn't support permissions.query for microphone
        setMicPermission('prompt')
      }
    }
    checkMic()
  }, [])

  const requestMicPermission = async () => {
    setRequestingMic(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicPermission('granted')
    } catch {
      setMicPermission('denied')
    }
    setRequestingMic(false)
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const orgId = (profile as { organization_id?: string } | null)?.organization_id
      if (!orgId) return

      const [scriptsRes, coachesRes] = await Promise.all([
        supabase.from('scripts').select('id, name').eq('organization_id', orgId).order('name'),
        supabase.from('coaches').select('id, name').eq('organization_id', orgId).order('name'),
      ])

      if (scriptsRes.data) setScripts(scriptsRes.data)
      if (coachesRes.data) setCoaches(coachesRes.data)
    }
    loadData()
  }, [supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStart({
      leadName: leadName.trim() || 'Lead',
      scriptId: scriptId || undefined,
      coachId: coachId || undefined,
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-white/5" style={{ backgroundColor: '#1e1e1e' }}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${NEON_PINK}15` }}>
            <span className="material-icons-outlined text-3xl" style={{ color: NEON_PINK }}>videocam</span>
          </div>
          <CardTitle className="text-xl text-white">Nova Sessão</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Coaching em tempo real durante sua reunião.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leadName" className="text-gray-300 text-sm">Nome do Lead</Label>
              <Input
                id="leadName"
                placeholder="Ex: João da Silva"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-pink-500"
              />
            </div>

            {scripts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="script" className="text-gray-300 text-sm">Script (opcional)</Label>
                <select
                  id="script"
                  value={scriptId}
                  onChange={(e) => setScriptId(e.target.value)}
                  className="w-full h-10 rounded-md bg-black/40 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-pink-500"
                >
                  <option value="">Nenhum script</option>
                  {scripts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {coaches.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="coach" className="text-gray-300 text-sm">Coach IA (opcional)</Label>
                <select
                  id="coach"
                  value={coachId}
                  onChange={(e) => setCoachId(e.target.value)}
                  className="w-full h-10 rounded-md bg-black/40 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-pink-500"
                >
                  <option value="">Coach padrão</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 space-y-3">
              {/* Mic permission alert */}
              {micPermission !== 'granted' && micPermission !== 'checking' && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${micPermission === 'denied' ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                  <span className="material-icons-outlined text-lg" style={{ color: micPermission === 'denied' ? '#ef4444' : '#f59e0b' }}>mic_off</span>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${micPermission === 'denied' ? 'text-red-300' : 'text-amber-200'}`}>
                      {micPermission === 'denied'
                        ? 'Microfone bloqueado. Habilite nas configurações do navegador.'
                        : 'Permissão de microfone necessária para a sessão funcionar.'}
                    </p>
                  </div>
                  {micPermission === 'prompt' && (
                    <button
                      type="button"
                      onClick={requestMicPermission}
                      disabled={requestingMic}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: NEON_PINK }}
                    >
                      {requestingMic ? 'Aguarde...' : 'Permitir'}
                    </button>
                  )}
                </div>
              )}

              {micPermission === 'granted' && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="material-icons-outlined text-sm text-emerald-400">mic</span>
                  <p className="text-xs text-emerald-300">Microfone habilitado</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold text-white rounded-xl transition-all hover:brightness-110"
                style={{ backgroundColor: NEON_PINK }}
              >
                <span className="flex items-center gap-2">
                  <span className="material-icons-outlined text-xl">play_arrow</span>
                  Iniciar Sessão
                </span>
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="material-icons-outlined text-sm text-gray-500 mt-0.5">info</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A sessão abre nesta aba e em um <strong className="text-gray-400">popup flutuante</strong> ao lado do Meet.
                  Selecione a aba da reunião e marque <strong className="text-gray-400">&quot;Compartilhar áudio&quot;</strong>.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
