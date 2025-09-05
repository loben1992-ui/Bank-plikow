// Plik: supabase/functions/register-client/index.ts
// OSTATECZNA, POPRAWNA WERSJA Z OBSŁUGĄ CORS

import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'npm:std/server'

// Nagłówki CORS, które pozwolą przeglądarce łączyć się z funkcją
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Akceptuj połączenia z każdego adresu
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Obsługa zapytania "preflight" OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { email, password, fullName, nip, prefix } = await req.json()

    // 1. Znajdź kod rejestracyjny i powiązanego klienta
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('registration_codes')
      .select('id, is_used, client_id_to_assign, clients(nip)')
      .eq('prefix', prefix)
      .single()

    if (codeError || !codeData) throw new Error('Nieprawidłowy kod-prefix.')
    if (codeData.is_used) throw new Error('Ten kod został już wykorzystany.')
    if (codeData.clients.nip !== nip) throw new Error('Podany NIP nie pasuje do tego kodu-prefixu.')

    // 2. Stwórz nowego użytkownika w Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
    if (authError) throw new Error(`Błąd tworzenia użytkownika: ${authError.message}`)

    // 3. Połącz nowy profil użytkownika z danymi klienta
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ client_id: codeData.client_id_to_assign })
      .eq('id', authData.user.id)
    if (profileError) throw new Error('Błąd przypisywania profilu do klienta.')

    // 4. Oznacz kod jako wykorzystany
    await supabaseAdmin.from('registration_codes').update({ is_used: true }).eq('id', codeData.id)

    // Zwróć sukces Z NAGŁÓWKAMI CORS
    return new Response(JSON.stringify({ message: 'Rejestracja zakończona sukcesem!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Zwróć błąd Z NAGŁÓWKAMI CORS
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
