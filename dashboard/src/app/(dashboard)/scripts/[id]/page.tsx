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
import type { Database } from '@/types/database'
import { ChevronLeft, Save } from 'lucide-react'
import Link from 'next/link'

const NEON_PINK = '#ff007a'
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const INPUT_CLASS = 'flex h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff007a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e] disabled:opacity-50'

type ScriptRow = Database['public']['Tables']['scripts']['Row']

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
    const { data: script, isLoading: isLoadingScript } = useQuery<ScriptRow | null>({
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
            const { data: profileData } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
            const profile = profileData as { organization_id: string | null } | null

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

    if (isLoadingScript) {
        return (
            <div
                className="rounded-[24px] border p-8"
                style={CARD_STYLE}
            >
                <p className="text-gray-500 text-sm">Carregando...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white hover:bg-white/10">
                        <Link href="/scripts">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            {isNew ? 'Novo Script' : 'Editar Script'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Configure o comportamento do seu assistente de vendas.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={mutation.isPending}
                    className="font-semibold"
                    style={{
                        backgroundColor: NEON_PINK,
                        boxShadow: '0 0 20px rgba(255,0,122,0.3)',
                    }}
                >
                    <Save className="mr-2 h-4 w-4" />
                    {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="rounded-xl bg-black/30 p-1 border border-white/10">
                    <TabsTrigger
                        value="general"
                        className="rounded-lg data-[state=active]:bg-card-dark data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 data-[state=active]:border-white/10 border border-transparent px-4"
                    >
                        Geral
                    </TabsTrigger>
                    <TabsTrigger
                        value="steps"
                        disabled={isNew}
                        className="rounded-lg data-[state=active]:bg-card-dark data-[state=active]:text-white text-gray-500 data-[state=active]:border-white/10 border border-transparent px-4 disabled:opacity-50"
                    >
                        Etapas do Funil
                    </TabsTrigger>
                    <TabsTrigger
                        value="objections"
                        disabled={isNew}
                        className="rounded-lg data-[state=active]:bg-card-dark data-[state=active]:text-white text-gray-500 data-[state=active]:border-white/10 border border-transparent px-4 disabled:opacity-50"
                    >
                        Objeções
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                    <Card className="rounded-[24px] border shadow-none" style={CARD_STYLE}>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-white">Informações Básicas</CardTitle>
                            <CardDescription className="text-gray-500">
                                Defina o nome e o objetivo deste script.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-gray-400">Nome do Script</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Venda Consultiva - SaaS"
                                    className={INPUT_CLASS}
                                    {...register('name')}
                                />
                                {errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-gray-400">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Objetivo do script..."
                                    className={`${INPUT_CLASS} min-h-[100px]`}
                                    {...register('description')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[24px] border shadow-none" style={CARD_STYLE}>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-white">Personalidade da IA</CardTitle>
                            <CardDescription className="text-gray-500">
                                Como a IA deve se comportar durante a chamada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="personality" className="text-gray-400">Personalidade</Label>
                                    <select id="personality" className={INPUT_CLASS} {...register('coach_personality')}>
                                        <option value="Strategic">Estratégico</option>
                                        <option value="Empathetic">Empático</option>
                                        <option value="Aggressive">Agressivo (Challenger)</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="intervention" className="text-gray-400">Nível de Intervenção</Label>
                                    <select id="intervention" className={INPUT_CLASS} {...register('intervention_level')}>
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
                    <Card className="rounded-[24px] border shadow-none" style={CARD_STYLE}>
                        <CardContent className="p-8 text-center text-gray-500">
                            Salve o script primeiro para adicionar etapas.
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="objections">
                    <Card className="rounded-[24px] border shadow-none" style={CARD_STYLE}>
                        <CardContent className="p-8 text-center text-gray-500">
                            Salve o script primeiro para configurar objeções.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
