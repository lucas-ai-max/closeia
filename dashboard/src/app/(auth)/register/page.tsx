'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [orgName, setOrgName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Sign up with metadata
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    company_name: orgName,
                },
            },
        })

        if (error) {
            toast.error(error.message)
        } else if (data.user && !data.session) {
            toast.success('Conta criada! Por favor, verifique seu email para confirmar.')
            router.push('/login')
        } else {
            toast.success('Conta criada com sucesso!')
            router.push('/')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Criar Conta
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Comece a usar o Sales Copilot AI agora
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Nome da Empresa
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Criando conta...' : 'Criar Conta'}
                        </button>
                    </form>

                    <p className="mt-4 text-center text-sm text-gray-600">
                        Já tem uma conta?{' '}
                        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            Fazer login
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Banner */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 justify-center items-center">
                <div className="max-w-md text-center p-8">
                    <h2 className="text-4xl font-bold text-white mb-4">Junte-se a nós</h2>
                    <p className="text-blue-200 text-lg">Milhares de vendedores já estão batendo meta com IA.</p>
                </div>
            </div>
        </div>
    )
}
