import React, { useState } from 'react';
import { useOSStore } from '../../store/osStore';
import { api } from '../../api';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useOSStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { user, token } = response.data;
      setAuth(user, token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-os-black select-none">
      {/* Background Cyberpunk decor */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex flex-col items-center justify-center">
         <h1 className="text-9xl font-black text-os-pink tracking-tighter">AIFUSP</h1>
         <div className="w-96 h-1 bg-os-pink shadow-neon-pink mt-4"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-os-pink/20 rounded-2xl flex items-center justify-center text-os-pink border border-os-pink shadow-neon-pink mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">System Login</h2>
          <p className="text-zinc-500 text-sm mt-1 text-center">Enter your credentials to access the OS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-os-black/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-os-pink focus:ring-1 focus:ring-os-pink transition-all"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-os-black/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-os-pink focus:ring-1 focus:ring-os-pink transition-all"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-os-pink text-os-black font-bold py-3 rounded-xl shadow-neon-pink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span>ACCESS SYSTEM</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
          <span>SECURE PROTOCOL v2.0.26</span>
          <span>AIFUSP_SYSTEMS_CORP</span>
        </div>
      </div>
    </div>
  );
};
