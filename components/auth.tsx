import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import Spinner from './Spinner';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const authMethod = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    
    const { error } = await authMethod({ email, password });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else if (!isLogin) {
       setMessage({ type: 'success', text: 'Registration successful! Please check your email to verify your account.' });
    }
    
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center pt-16">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
        <h1 className="text-3xl font-bold text-center text-white">{isLogin ? 'Sign In' : 'Create Account'}</h1>
        <p className="text-center text-slate-400">
          Access your real-time notes dashboard.
        </p>

        <form className="space-y-6" onSubmit={handleAuthAction}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-500 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-slate-700 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-500 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-slate-700 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Spinner /> : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </form>
        
        {message && (
          <div className={`p-3 text-center text-sm rounded-md ${message.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {message.text}
          </div>
        )}

        <div className="text-center">
          <button onClick={() => {setIsLogin(!isLogin); setMessage(null);}} className="text-sm text-cyan-400 hover:text-cyan-300">
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
