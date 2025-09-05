// Plik: supabase/functions/register-client/index.ts
// OSTATECZNA, PRODUKCYJNA WERSJA 2.0 Z POPRAWNĄ OBSŁUGĄ CORS

import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'npm:std/server'

// Po prostu dodajemy nagłówki, które pozwalają na połączenia zewsząd.
// W tym scenariuszu, bezpieczeństwo zapewnia logika sprawdzająca kod-prefix i NIP,
// a nie ograniczanie, kto może wywołać funkcję.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cała reszta logiki pozostaje DOKŁADNIE taka sama jak w poprzedniej, działającej wersji
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { email, password, fullName, nip, prefix } = await req.json()
    const { data: codeData, error: codeError } = await supabaseAdmin.from('registration_codes').select('id, is_used, client_id_to_assign, clients(nip)').eq('prefix', prefix).single()
    if (codeError || !codeData) throw new Error('Nieprawidłowy kod-prefix.')
    if (codeData.is_used) throw new Error('Ten kod został już wykorzystany.')
    if (codeData.clients.nip !== nip) throw new Error('Podany NIP nie pasuje do tego kodu-prefixu.')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({email, password, email_confirm: true, user_metadata: { full_name: fullName }})
    if (authError) throw new Error(`Błąd tworzenia użytkownika: ${authError.message}`)
    const { error: profileError } = await supabaseAdmin.from('profiles').update({ client_id: codeData.client_id_to_assign }).eq('id', authData.user.id)
    if (profileError) throw new Error('Błąd przypisywania profilu do klienta.')
    await supabaseAdmin.from('registration_codes').update({ is_used: true }).eq('id', codeData.id)
    return new Response(JSON.stringify({ message: 'Rejestracja zakończona sukcesem!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
