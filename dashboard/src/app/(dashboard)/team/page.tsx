'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, UserPlus, Check, ShieldAlert, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

export default function TeamPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert("Erro de autenticação: Sua sessão expirou.")
        return
      }

      // api.post handles auth internally
      await api.post('/api/admin/create-user', formData)

      alert(`Usuário criado com sucesso! O vendedor ${formData.name} foi adicionado à equipe.`)

      // Reset form
      setFormData({ name: '', email: '', password: '' })

    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(`Erro ao criar usuário: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Equipe" />

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
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 mt-4">
              <p className="text-yellow-500 text-xs">
                ⚠️ Certifique-se de compartilhar a senha inicial com o vendedor de forma segura.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
