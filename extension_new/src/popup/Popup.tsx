import { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { wsClient } from '../services/websocket';
import { Loader2, Mic, MicOff, LogOut } from 'lucide-react';

export default function Popup() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'PROGRAMMED' | 'RECORDING' | 'PAUSED'>('PROGRAMMED');

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const sess = await authService.getSession();
        setSession(sess);
        setLoading(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.login(email, password);
            await checkSession();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        setSession(null);
    };

    const toggleCapture = () => {
        chrome.runtime.sendMessage({
            type: status === 'RECORDING' ? 'STOP_CAPTURE' : 'START_CAPTURE'
        });
        // Listen for response or status update via message
    };

    // Listen for status updates from background
    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === 'STATUS_UPDATE') {
                setStatus(msg.status);
            }
        }
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, [])

    if (loading) {
        return <div className="flex items-center justify-center w-64 h-64"><Loader2 className="animate-spin" /></div>;
    }

    if (!session) {
        return (
            <div className="w-80 p-6 bg-slate-50">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Sales Copilot Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-80 p-4 bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="font-semibold text-slate-900">Sales Copilot</h2>
                    <p className="text-xs text-slate-500">{session.user.email}</p>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                    <LogOut size={16} />
                </button>
            </div>

            <div className="space-y-4">
                <div className={`p-4 rounded-lg flex items-center justify-between ${status === 'RECORDING' ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'RECORDING' ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-medium text-sm">
                            {status === 'RECORDING' ? 'Call in Progress' : 'Ready to Coach'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={toggleCapture}
                    className={`w-full py-3 px-4 rounded-md flex items-center justify-center space-x-2 font-medium transition-colors ${status === 'RECORDING'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {status === 'RECORDING' ? <><MicOff size={18} /> <span>End Call</span></> : <><Mic size={18} /> <span>Start Call</span></>}
                </button>
            </div>
        </div>
    );
}
