import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader title="Configurações" />
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center rounded-[24px] border border-white/5 bg-card-dark p-12">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <Settings className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-gray-500 mt-2 max-w-sm">
          Funcionalidade em desenvolvimento.
        </p>
      </div>
    </>
  )
}
