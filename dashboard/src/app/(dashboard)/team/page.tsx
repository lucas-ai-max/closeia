import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Users } from 'lucide-react'

export default function TeamPage() {
  return (
    <>
      <DashboardHeader title="Equipe" />
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center rounded-[24px] border border-white/5 bg-card-dark p-12">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Gestão de Equipe</h2>
        <p className="text-gray-500 mt-2 max-w-sm">
          Funcionalidade em desenvolvimento.
        </p>
      </div>
    </>
  )
}
