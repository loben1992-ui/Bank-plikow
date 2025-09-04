// Ten plik musi być w tym samym folderze
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://cvghbxnxnhjjuzkebpey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Z2hieG54bmhqanV6a2VicGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM1MDksImV4cCI6MjA3MjUzOTUwOX0.8h1qWukprv_ozQiZRZO_3PyzGrVkZft6j47MIpbIJ0o';

 Wersja dla Vercel/Netlify (odkomentuj i użyj zamiast tej powyżej):
 //const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
 //const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


export const supabase = createClient(supabaseUrl, supabaseKey);



