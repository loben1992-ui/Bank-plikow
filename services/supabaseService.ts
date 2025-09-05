import { createClient } from '@supabase/supabase-js';

// IMPORTANT: These environment variables must be configured for the application to work.
// You can add them to a .env.local file for local development:
// REACT_APP_SUPABASE_URL=YOUR_SUPABASE_URL
// REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
// In a production environment (like Vercel or Netlify), these should be set as environment variables in the hosting platform's settings.

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

function initializeSupabase() {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  console.warn(
    'Supabase URL and/or Anon Key not provided. The application will not connect to Supabase.'
  );
  return null;
}

export const supabase = initializeSupabase();
