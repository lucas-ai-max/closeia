'use client'

import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, MoreVertical, Trash, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScripts, deleteScript } from '@/services/scripts'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Database } from '@/types/database'

const NEON_PINK = '#ff007a'

type ScriptRow = Database['public']['Tables']['scripts']['Row']

export default function ScriptsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const { data: scripts, isLoading } = useQuery<ScriptRow[]>({
        queryKey: ['scripts'],
        queryFn: () => getScripts(supabase),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteScript(supabase, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scripts'] })
            toast.success('Script removido com sucesso')
        },
        onError: () => {
            toast.error('Erro ao remover script')
        }
    })

    if (isLoading) {
        return (
            <div className="space-y-6">
                <DashboardHeader title="Scripts" />
                <div
                    className="rounded-[24px] border p-8"
                    style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                    <p className="text-gray-500 text-sm">Carregando scripts...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <DashboardHeader title="Scripts" />
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Scripts de Vendas</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Gerencie seus playbooks e roteiros de vendas.
                    </p>
                </div>
                <Link href="/scripts/new">
                    <Button
                        className="font-semibold"
                        style={{
                            backgroundColor: NEON_PINK,
                            boxShadow: '0 0 20px rgba(255,0,122,0.3)',
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Script
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scripts?.map((script) => (
                    <Card
                        key={script.id}
                        className="rounded-[24px] border shadow-none transition-colors hover:bg-white/5"
                        style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1 min-w-0">
                                <CardTitle className="text-base font-bold text-white">
                                    {script.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-gray-500">
                                    {script.description || 'Sem descrição'}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0 shrink-0 text-gray-400 hover:text-white hover:bg-white/10"
                                    >
                                        <span className="sr-only">Menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="rounded-xl border bg-card-dark border-white/10 min-w-[160px]"
                                >
                                    <DropdownMenuItem asChild className="text-gray-300 focus:bg-white/10 focus:text-white">
                                        <Link href={`/scripts/${script.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                        onClick={() => {
                                            if (confirm('Tem certeza?')) {
                                                deleteMutation.mutate(script.id)
                                            }
                                        }}
                                    >
                                        <Trash className="mr-2 h-4 w-4" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-gray-500 mt-4">
                                <FileText className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{script.coach_personality} • {script.intervention_level}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {scripts?.length === 0 && (
                    <div
                        className="col-span-full flex flex-col items-center justify-center p-12 rounded-[24px] border border-dashed text-gray-500"
                        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(30,30,30,0.5)' }}
                    >
                        <FileText className="h-12 w-12 mb-4 opacity-40" />
                        <p className="text-sm">Nenhum script criado ainda.</p>
                        <Link href="/scripts/new">
                            <Button
                                variant="link"
                                className="mt-2 font-semibold"
                                style={{ color: NEON_PINK }}
                            >
                                Criar meu primeiro script
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
