'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, UserPlus, ShieldAlert, Loader2, Trash2, ArrowUpDown, Shield, User, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const NEON_PINK = '#ff007a'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export default function TeamPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [teamLoading, setTeamLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const supabase = createClient()

  // Clear feedback after 4s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  // Fetch team members
  useEffect(() => {
    setMounted(true)
    fetchTeam()
  }, [])

  async function fetchTeam() {
    setTeamLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setTeamLoading(false); return }
      setCurrentUserId(user.id)

      // Get current user's org
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const orgId = (myProfile as any)?.organization_id
      if (!orgId) {
        setTeamLoading(false)
        return
      }

      // Fetch all members in same org
      const { data: teamData, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching team:', error)
        setFeedback({ type: 'error', message: 'Erro ao carregar equipe.' })
      } else {
        setMembers((teamData as any[]) || [])
      }
    } catch (err: any) {
      console.error('fetchTeam error:', err)
      setFeedback({ type: 'error', message: err.message })
    }
    setTeamLoading(false)
  }

  // Create user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert("Erro de autenticação: Sua sessão expirou.")
        return
      }

      await api.post('/api/admin/create-user', formData)
      setFeedback({ type: 'success', message: `Vendedor ${formData.name} adicionado com sucesso!` })
      setFormData({ name: '', email: '', password: '' })
      // Refresh team list
      fetchTeam()
    } catch (error: any) {
      console.error('Error creating user:', error)
      setFeedback({ type: 'error', message: `Erro ao criar: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Update role
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (memberId === currentUserId) {
      setFeedback({ type: 'error', message: 'Você não pode alterar seu próprio cargo.' })
      return
    }

    const member = members.find(m => m.id === memberId)
    const confirmMsg = newRole === 'MANAGER'
      ? `Promover ${member?.full_name || 'este membro'} para Gestor?`
      : `Rebaixar ${member?.full_name || 'este membro'} para Vendedor?`

    if (!confirm(confirmMsg)) return

    setActionLoading(memberId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole } as any)
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      setFeedback({ type: 'success', message: `Cargo atualizado para ${newRole === 'MANAGER' ? 'Gestor' : 'Vendedor'}.` })
    } catch (err: any) {
      console.error('updateRole error:', err)
      setFeedback({ type: 'error', message: `Erro ao atualizar cargo: ${err.message}` })
    }
    setActionLoading(null)
  }

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (memberId === currentUserId) {
      setFeedback({ type: 'error', message: 'Você não pode remover a si mesmo.' })
      return
    }

    const member = members.find(m => m.id === memberId)
    if (!confirm(`Tem certeza que deseja remover ${member?.full_name || 'este vendedor'}? Esta ação não pode ser desfeita.`)) return

    setActionLoading(memberId)
    try {
      // Set organization_id to null (soft remove — keeps auth account but disconnects from org)
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null, role: 'SELLER' } as any)
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.filter(m => m.id !== memberId))
      setFeedback({ type: 'success', message: `${member?.full_name || 'Membro'} removido da organização.` })
    } catch (err: any) {
      console.error('removeMember error:', err)
      setFeedback({ type: 'error', message: `Erro ao remover: ${err.message}` })
    }
    setActionLoading(null)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return '—' }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6" suppressHydrationWarning={true}>
      <DashboardHeader title="Equipe" />

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all duration-300 ${feedback.type === 'success'
            ? 'bg-green-900/80 border-green-500/30 text-green-300'
            : 'bg-red-900/80 border-red-500/30 text-red-300'
          }`}>
          {feedback.type === 'success' ? '✅' : '❌'} {feedback.message}
        </div>
      )}

      {/* Top Row: Create Form + Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create User Form */}
        <Card className="bg-[#1E1E1E] border-white/5">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-neon-pink/10">
                <UserPlus className="w-5 h-5 text-neon-pink" />
              </div>
              <CardTitle className="text-xl text-white">Adicionar Vendedor</CardTitle>
            </div>
            <CardDescription>
              Crie uma nova conta para um membro da sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Ex: João Silva"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-neon-pink hover:bg-neon-pink/90 text-white font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-[#1E1E1E] border-white/5 h-fit">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
              </div>
              <CardTitle className="text-xl text-white">Informações Importantes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-400">
            <p>
              • Os novos usuários serão criados com o perfil de <strong>VENDEDOR</strong> (Seller).
            </p>
            <p>
              • Eles terão acesso apenas às próprias ligações e métricas.
            </p>
            <p>
              • A organização será vinculada automaticamente à sua conta de Gestor.
            </p>
            <p>
              • Você pode <strong>promover</strong> um vendedor a Gestor ou <strong>remover</strong> da organização a qualquer momento.
            </p>
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 mt-4">
              <p className="text-yellow-500 text-xs">
                ⚠️ Certifique-se de compartilhar a senha inicial com o vendedor de forma segura.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card className="rounded-2xl border shadow-none" style={CARD_STYLE}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-base font-bold text-white">
                Membros da Organização ({members.length})
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent suppressHydrationWarning={true}>
          {teamLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-neon-pink/10 flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-neon-pink" />
              </div>
              <p className="text-gray-400 text-sm mb-4">Nenhum membro cadastrado ainda.</p>
              <Button
                onClick={() => document.getElementById('name')?.focus()}
                className="bg-neon-pink hover:bg-neon-pink/90 text-white font-bold"
              >
                Convidar primeiro vendedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-gray-500 font-medium pb-3">Vendedor</th>
                    <th className="text-left text-gray-500 font-medium pb-3">E-mail</th>
                    <th className="text-left text-gray-500 font-medium pb-3">Cargo</th>
                    <th className="text-left text-gray-500 font-medium pb-3">Desde</th>
                    <th className="text-right text-gray-500 font-medium pb-3 pr-1">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => {
                    const isMe = member.id === currentUserId
                    const isManager = member.role === 'MANAGER' || member.role === 'ADMIN'
                    const isActing = actionLoading === member.id

                    return (
                      <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isManager ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                              }`}>
                              {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="text-white font-medium">
                              {member.full_name || '—'}
                              {isMe && <span className="ml-1.5 text-[10px] text-gray-500">(Você)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-gray-400">{member.email || '—'}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isManager
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                            {isManager ? <Shield size={10} /> : <User size={10} />}
                            {isManager ? 'Gestor' : 'Vendedor'}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-500 text-xs">{formatDate(member.created_at)}</td>
                        <td className="py-3.5 text-right pr-1">
                          {isMe ? (
                            <span className="text-[10px] text-gray-600">—</span>
                          ) : isActing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
                          ) : (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleUpdateRole(member.id, isManager ? 'SELLER' : 'MANAGER')}
                                className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-amber-400"
                                title={isManager ? 'Rebaixar para Vendedor' : 'Promover a Gestor'}
                              >
                                <ArrowUpDown size={14} />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors text-gray-400 hover:text-red-400"
                                title="Remover da organização"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
