'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScript, createScript, updateScript } from '@/services/scripts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { scriptSchema, ScriptFormValues } from '@/lib/validations/script'
import { ChevronLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function ScriptEditorPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const isNew = params.id === 'new'
    const scriptId = params.id as string

    // Form Setup
    const { register, handleSubmit, formState: { errors }, reset } = useForm<ScriptFormValues>({
        resolver: zodResolver(scriptSchema),
        defaultValues: {
            name: '',
            description: '',
            coach_personality: 'Strategic',
            coach_tone: 'Here is a tip',
            intervention_level: 'Medium',
            is_active: true
        }
    })

    // Fetch existing script if editing
    const { data: script, isLoading: isLoadingScript } = useQuery({
        queryKey: ['script', scriptId],
        queryFn: () => getScript(supabase, scriptId),
        enabled: !isNew,
    })

    // Update form when data loads
    useEffect(() => {
        if (script) {
            reset({
                name: script.name,
                description: script.description || '',
                coach_personality: script.coach_personality,
                coach_tone: script.coach_tone,
                intervention_level: script.intervention_level,
                is_active: script.is_active
            })
        }
    }, [script, reset])

    // Mutations
    const mutation = useMutation({
        mutationFn: async (values: ScriptFormValues) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario nao autenticado')

            // Get user's org (simple approximation for now, usually stored in profile/metadata)
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()

            if (!profile?.organization_id && isNew) {
                // For dev: auto-create org if missing or handle error
                // ignoring for now, assuming organization_id exists or we'll mock it
                throw new Error('Organization not found')
            }

            if (isNew) {
                return createScript(supabase, { ...values, organization_id: profile!.organization_id! })
            } else {
                return updateScript(supabase, scriptId, values)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scripts'] })
            toast.success(isNew ? 'Script criado!' : 'Script atualizado!')
            router.push('/scripts')
        },
        onError: (err) => {
            console.error(err)
            toast.error('Erro ao salvar script')
        }
    })

    const onSubmit = (data: ScriptFormValues) => {
        mutation.mutate(data)
    }

    if (isLoadingScript) return <div className="p-8">Carregando...</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/scripts">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {isNew ? 'Novo Script' : 'Editar Script'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Configure o comportamento do seu assistente de vendas.
                        </p>
                    </div>
                </div>
                <Button onClick={handleSubmit(onSubmit)} disabled={mutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="steps" disabled={isNew}>Etapas do Funil</TabsTrigger>
                    <TabsTrigger value="objections" disabled={isNew}>Objeções</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                            <CardDescription>
                                Defina o nome e o objetivo deste script.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome do Script</Label>
                                <Input id="name" placeholder="Ex: Venda Consultiva - SaaS" {...register('name')} />
                                {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" placeholder="Objetivo do script..." {...register('description')} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Personalidade da IA</CardTitle>
                            <CardDescription>
                                Como a IA deve se comportar durante a chamada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="personality">Personalidade</Label>
                                    <select
                                        id="personality"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        {...register('coach_personality')}
                                    >
                                        <option value="Strategic">Estratégico</option>
                                        <option value="Empathetic">Empático</option>
                                        <option value="Aggressive">Agressivo (Challenger)</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="intervention">Nível de Intervenção</Label>
                                    <select
                                        id="intervention"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        {...register('intervention_level')}
                                    >
                                        <option value="Low">Baixo (Apenas erros críticos)</option>
                                        <option value="Medium">Médio (Dicas ocasionais)</option>
                                        <option value="High">Alto (Passo a passo)</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="steps">
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Salve o script primeiro para adicionar etapas.
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="objections">
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Salve o script primeiro para configurar objeções.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
