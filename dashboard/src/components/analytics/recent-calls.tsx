export function RecentCalls() {
    // Mock Data
    const calls = [
        { name: 'João Silva', email: 'joao@example.com', amount: '85', date: '2 min ago' },
        { name: 'Maria Souza', email: 'maria@example.com', amount: '92', date: '15 min ago' },
        { name: 'Pedro Santos', email: 'pedro@example.com', amount: '64', date: '1 hr ago' },
        { name: 'Ana Oliveira', email: 'ana@example.com', amount: '78', date: '2 hrs ago' },
        { name: 'Carlos Lima', email: 'carlos@example.com', amount: '99', date: '3 hrs ago' },
    ]

    return (
        <div className="space-y-8">
            {calls.map((call, index) => (
                <div key={index} className="flex items-center">
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{call.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {call.email}
                        </p>
                    </div>
                    <div className="ml-auto font-medium text-green-600">
                        Score: {call.amount}
                    </div>
                </div>
            ))}
        </div>
    )
}
