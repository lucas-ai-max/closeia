'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Overview } from '@/components/analytics/overview'
import { RecentCalls } from '@/components/analytics/recent-calls'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Phone, CheckCircle, Clock, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
    // Mock data for initial skeleton, would use React Query in real impl
    const kpiData = [
        { title: 'Total Calls', value: '1,234', icon: Phone, change: '+20.1% from last month' },
        { title: 'Duração Média', value: '12m 30s', icon: Clock, change: '-4% from last month' },
        { title: 'Score Médio', value: '85', icon: CheckCircle, change: '+12% from last month' },
        { title: 'Conversão', value: '24%', icon: TrendingUp, change: '+2.5% from last month' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {/* Date Range Picker would go here */}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi) => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {kpi.title}
                            </CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {kpi.change}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Calls</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RecentCalls />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
