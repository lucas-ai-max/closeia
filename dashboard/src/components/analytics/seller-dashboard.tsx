'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Phone, TrendingUp, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface NextStep {
    task: string
    due: string
    priority: 'high' | 'medium' | 'low'
}

export function SellerDashboard({ stats }: { stats: any }) {
    const [nextSteps, setNextSteps] = useState<NextStep[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchNextSteps() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch last 5 call summaries for this user
            const { data, error } = await supabase
                .from('call_summaries')
                .select(`
                    next_steps,
                    created_at,
                    call:calls!inner(user_id)
                `)
                .eq('call.user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (data) {
                const steps: NextStep[] = []
                data.forEach((summary: any) => {
                    if (Array.isArray(summary.next_steps)) {
                        summary.next_steps.forEach((step: string) => {
                            steps.push({
                                task: step,
                                due: 'A definir', // In a real app, we'd parse dates or have a due_date field
                                priority: 'medium'
                            })
                        })
                    }
                })
                setNextSteps(steps.slice(0, 5)) // Show top 5
            }
            setLoading(false)
        }
        fetchNextSteps()
    }, [])

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Meu Painel</h2>

            {/* Quick Stats - Placeholder for now, could be real later */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chamadas Hoje</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Dados indisponíveis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--%</div>
                        <p className="text-xs text-muted-foreground">Dados indisponíveis</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Next Steps */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Próximas Tarefas</CardTitle>
                        <CardDescription>Ações geradas a partir das suas chamadas recentes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <p>Carregando tarefas...</p>
                            ) : nextSteps.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
                            ) : (
                                nextSteps.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${item.priority === 'high' ? 'bg-red-500' :
                                                item.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`} />
                                            <span className="text-sm font-medium">{item.task}</span>
                                        </div>
                                        <Badge variant="outline">{item.due}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Insights */}
                <Card>
                    <CardHeader>
                        <CardTitle>Meus Insights</CardTitle>
                        <CardDescription>Dicas baseadas na sua performance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-amber-50 text-amber-900 rounded-lg flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div className="text-sm">
                                <span className="font-semibold block mb-1">Dica Geral</span>
                                Continue seguindo os scripts para melhorar sua taxa de conversão.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
