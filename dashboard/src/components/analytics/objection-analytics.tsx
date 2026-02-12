import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface ObjectionMetric {
    objection: string
    successRate: number
    usageCount: number
    bestResponse: string
}

export function ObjectionAnalytics() {
    const [metrics, setMetrics] = useState<ObjectionMetric[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchMetrics() {
            // Join objection_success_metrics with objections to get the trigger phrase
            const { data, error } = await supabase
                .from('objection_success_metrics')
                .select(`
                    success_count,
                    total_usage,
                    objection:objections(trigger_phrase, coaching_tip)
                `)
                .order('total_usage', { ascending: false })
                .limit(10)

            if (data) {
                const formatted = data.map((item: any) => ({
                    objection: item.objection?.trigger_phrase || 'Desconhecida',
                    bestResponse: item.objection?.coaching_tip || 'Sem dica cadastrada',
                    usageCount: item.total_usage,
                    successRate: item.total_usage > 0
                        ? Math.round((item.success_count / item.total_usage) * 100)
                        : 0
                }))
                setMetrics(formatted)
            }
            setLoading(false)
        }
        fetchMetrics()
    }, [])

    if (loading) return <div>Carregando métricas...</div>

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
                <CardTitle>Analytics de Objeções</CardTitle>
                <CardDescription>
                    Eficácia das respostas para as objeções mais comuns (Baseado em dados reais)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {metrics.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhuma métrica de objeção coletada ainda.</p>
                            <p className="text-xs mt-1">Realize chamadas e marque vendas para gerar dados.</p>
                        </div>
                    ) : metrics.map((item, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="font-medium text-base">{item.objection}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Usada {item.usageCount} vezes • Melhor resposta: <span className="font-semibold text-emerald-600 line-clamp-1" title={item.bestResponse}>{item.bestResponse}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{item.successRate}%</div>
                                    <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
                                </div>
                            </div>
                            <Progress value={item.successRate} className="h-2"
                                indicatorClassName={
                                    item.successRate > 70 ? "bg-emerald-500" :
                                        item.successRate > 50 ? "bg-amber-500" : "bg-red-500"
                                }
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
