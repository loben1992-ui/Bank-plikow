// Ten plik musi być w tym samym folderze
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'TWOJ_ADRES_URL_TUTAJ';
const supabaseKey = 'TWOJ_KLUCZ_ANON_TUTAJ';

// Wersja dla Vercel/Netlify (odkomentuj i użyj zamiast tej powyżej):
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);