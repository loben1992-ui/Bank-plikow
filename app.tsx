import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseService';
import Auth from './components/Auth';
import NotesDashboard from './components/NotesDashboard';
import Header from './components/Header';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't try to get a session if supabase is not configured
    if (!supabase) {
      setLoading(false);
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };
  
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-2xl p-8 space-y-6 bg-red-900/50 border border-red-700 rounded-lg shadow-lg" role="alert">
          <h1 className="text-3xl font-bold text-center text-red-200">Configuration Error</h1>
          <p className="text-center text-red-300">
            The application is not configured to connect to Supabase.
          </p>
          <div className="text-left bg-slate-800 p-4 rounded-md">
            <p className="text-slate-300">Please make sure you have provided the following environment variables:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li><code className="bg-slate-700 px-2 py-1 rounded">REACT_APP_SUPABASE_URL</code>: Your project's Supabase URL.</li>
              <li><code className="bg-slate-700 px-2 py-1 rounded">REACT_APP_SUPABASE_ANON_KEY</code>: Your project's Supabase anon key.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-500">
              You can find these in your Supabase project's API settings. For local development, you can create a <code className="bg-slate-700 px-1 py-0.5 rounded">.env.local</code> file in the root of your project.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return null; // Or a full-page loader
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <Header session={session} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-8">
        {!session ? (
          <Auth />
        ) : (
          <NotesDashboard key={session.user.id} session={session} />
        )}
      </main>
    </div>
  );
};

export default App;
