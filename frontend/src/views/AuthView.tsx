// views/AuthView.tsx
import React, { useState } from 'react';
import { Box, ArrowRight, Lock, User } from 'lucide-react';
import { authApi } from '../services/api';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await authApi.register(username, password);
      } else {
        data = await authApi.login(username, password);
      }
      
      // 保存 Token
      localStorage.setItem('pebbles_token', data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-800 border border-stone-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-stone-700 rounded-xl flex items-center justify-center">
                <Box size={32} className="text-stone-300" />
            </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-stone-100 text-center mb-2">
          {isRegister ? 'Join Pebbles' : 'Welcome Back'}
        </h2>
        <p className="text-stone-500 text-center mb-8 text-sm">
          {isRegister ? 'Begin your cognitive architecture.' : 'Resume your knowledge construction.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-stone-300" size={18} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg py-3 pl-10 pr-4 text-stone-200 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
              required
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-stone-300" size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg py-3 pl-10 pr-4 text-stone-200 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
              required
            />
          </div>

          {error && <div className="text-red-400 text-xs text-center">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-stone-100 hover:bg-white text-stone-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Enter')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-stone-500 hover:text-stone-300 text-xs font-medium transition-colors"
          >
            {isRegister ? 'Already have an account? Log in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};