'use client'

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

export default function ScriptsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const { data: scripts, isLoading } = useQuery({
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
        return <div className="p-8">Carregando scripts...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Scripts de Vendas</h2>
                    <p className="text-muted-foreground">
                        Gerencie seus playbooks e roteiros de vendas.
                    </p>
                </div>
                <Link href="/scripts/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Script
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scripts?.map((script) => (
                    <Card key={script.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium">
                                    {script.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {script.description || 'Sem descrição'}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/scripts/${script.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-red-600"
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
                            <div className="flex items-center text-sm text-muted-foreground mt-4">
                                <FileText className="mr-2 h-4 w-4" />
                                {script.coach_personality} • {script.intervention_level}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {scripts?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p>Nenhum script criado ainda.</p>
                        <Button variant="link" className="mt-2">
                            Criar meu primeiro script
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
