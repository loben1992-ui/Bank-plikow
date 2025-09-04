import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'npm:std/server'

// Używamy klucza service_role, bo ta funkcja musi mieć uprawnienia admina
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { email, password, fullName, nip, prefix } = await req.json()

    // 1. Znajdź kod rejestracyjny i powiązanego klienta
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('registration_codes')
      .select('id, is_used, client_id_to_assign, clients(nip)')
      .eq('prefix', prefix)
      .single()

    if (codeError || !codeData) {
      throw new Error('Nieprawidłowy kod-prefix.')
    }
    if (codeData.is_used) {
      throw new Error('Ten kod został już wykorzystany.')
    }
    if (codeData.clients.nip !== nip) {
      throw new Error('Podany NIP nie pasuje do tego kodu-prefixu.')
    }

    // 2. Stwórz nowego użytkownika w Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Można ustawić na false dla uproszczenia
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      throw new Error(`Błąd tworzenia użytkownika: ${authError.message}`)
    }

    // 3. Połącz nowy profil użytkownika z danymi klienta
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ client_id: codeData.client_id_to_assign })
      .eq('id', authData.user.id)

    if (profileError) {
      throw new Error('Błąd przypisywania profilu do klienta.')
    }

    // 4. Oznacz kod jako wykorzystany
    const { error: updateCodeError } = await supabaseAdmin
      .from('registration_codes')
      .update({ is_used: true })
      .eq('id', codeData.id)

    if (updateCodeError) {
      // To nie jest krytyczny błąd, ale warto go zalogować
      console.error('Nie udało się oznaczyć kodu jako wykorzystany:', updateCodeError)
    }

    return new Response(JSON.stringify({ message: 'Rejestracja zakończona sukcesem!' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})