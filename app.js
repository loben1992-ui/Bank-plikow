
// =============================================================
//  GŁÓWNY PLIK APLIKACJI "FIRMADOCS" - WERSJA Z MODUŁEM ES
// =============================================================

// KROK 1: Importujemy funkcję `createClient` bezpośrednio z modułu CDN.
// To eliminuje wszystkie konflikty nazw i problemy z timingiem ładowania.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ytbycwoxkqzerxyzfeku.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Ynljd294a3F6ZXJ4eXpmZWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODQzMzIsImV4cCI6MjA3MjU2MDMzMn0.CvFrr2HyZJWQyf0c6S-84SkhGY5voTrn0IaLWQwx6Dc';


if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('TWOJ')) {
    alert("BŁĄD KRYTYCZNY: Proszę wstawić prawidłowy URL i Klucz Supabase w pliku app.js!");
    throw new Error("Supabase URL and Key are required.");
}

// KROK 2: Tworzymy naszego klienta używając zaimportowanej funkcji.
// Nie ma tu żadnego konfliktu nazw.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// === GŁÓWNA LOGIKA APLIKACJI (pozostaje bez zmian) ===
document.addEventListener('DOMContentLoaded', () => {
    
    const authView = document.getElementById('auth-view');
    const mainView = document.getElementById('main-view');
    const showLoginLink = document.getElementById('show-login-link');
    const showRegisterLink = document.getElementById('show-register-link');

    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(true); });
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(false); });

    function toggleAuthForms(showLogin) {
        document.getElementById('login-form-container').classList.toggle('hidden', !showLogin);
        document.getElementById('register-form-container').classList.toggle('hidden', showLogin);
    }

    async function checkUserStatus() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            authView.classList.add('hidden');
            mainView.classList.remove('hidden');
            initializeApp(session.user);
        } else {
            authView.classList.remove('hidden');
            mainView.classList.add('hidden');
        }
    }

    async function initializeApp(user) {
        const { data: profile } = await supabase.from('profiles').select('*, clients(*)').eq('id', user.id).single();
        if (!profile) {
            alert('Nie udało się załadować profilu użytkownika. Spróbuj ponownie.');
            return;
        }
        document.getElementById('welcome-message').textContent = `Witaj, ${profile.full_name || user.email}`;
        if (profile.role === 'admin') {
            document.getElementById('admin-dashboard').classList.remove('hidden');
            loadAdminDashboard();
        } else {
            if (profile.clients) {
                document.getElementById('client-dashboard').classList.remove('hidden');
                loadClientDashboard(profile.clients.storage_folder_path);
            } else {
                document.getElementById('client-dashboard').innerHTML = '<p>Twoje konto nie jest jeszcze przypisane do żadnego klienta. Skontaktuj się z administratorem.</p>';
                document.getElementById('client-dashboard').classList.remove('hidden');
            }
        }
    }

    async function loadClientDashboard(folderPath) {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '<li>Ładowanie plików...</li>';
        const { data, error } = await supabase.storage.from('client-documents').list(folderPath);
        if (error || !data || data.length === 0) {
            fileList.innerHTML = '<li>Brak plików do wyświetlenia.</li>';
            return;
        }
        fileList.innerHTML = '';
        for (const file of data) {
            const { data: { publicUrl } } = supabase.storage.from('client-documents').getPublicUrl(`${folderPath}/${file.name}`);
            fileList.innerHTML += `<li><span>${file.name}</span> <a href="${publicUrl}" class="file-link" target="_blank" download>Pobierz</a></li>`;
        }
    }

    async function loadAdminDashboard() {
        const clientsList = document.getElementById('clients-list');
        async function fetchAndRenderClients() {
            const { data: clients } = await supabase.from('clients').select('*').order('company_name');
            clientsList.innerHTML = '';
            clients.forEach(client => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${client.company_name} (NIP: ${client.nip})</span><button class="action-button delete-btn delete-client-btn" data-client-id="${client.id}">Usuń</button>`;
                li.dataset.clientId = client.id;
                li.style.cursor = 'pointer';
                clientsList.appendChild(li);
            });
        }
        document.getElementById('add-client-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('client-name').value;
            const nip = document.getElementById('client-nip').value;
            await supabase.from('clients').insert({ company_name: name, nip });
            e.target.reset();
            await fetchAndRenderClients();
        });
        clientsList.addEventListener('click', (e) => {
            if (e.target.matches('.delete-client-btn')) {
                e.stopPropagation();
                if(confirm('Czy na pewno usunąć tego klienta i wszystkie jego dane?')) {
                    supabase.from('clients').delete().eq('id', e.target.dataset.clientId).then(fetchAndRenderClients);
                }
            } else if (e.target.closest('li')) {
                renderClientDetails(e.target.closest('li').dataset.clientId);
            }
        });
        await fetchAndRenderClients();
    }

    async function renderClientDetails(clientId) {
        const detailsSection = document.getElementById('client-details-section');
        const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
        const { data: codes } = await supabase.from('registration_codes').select('*').eq('client_id_to_assign', clientId);
        
        detailsSection.innerHTML = `
            <h3>Szczegóły: ${client.company_name}</h3>
            <h4>Kody Rejestracyjne</h4>
            <ul id="codes-list">${codes.map(code => `<li><span class="code-prefix">${code.prefix}</span> <span>${code.is_used ? 'Wykorzystany' : 'Aktywny'}</span> <button class="action-button delete-btn delete-code-btn" data-code-id="${code.id}">Usuń</button></li>`).join('') || '<li>Brak kodów.</li>'}</ul>
            <form id="generate-code-form"><button type="submit">Generuj nowy kod 4-cyfrowy</button></form>
            <h4>Zarządzaj Plikami</h4>
            <ul id="admin-file-list">Ładowanie...</ul>
            <form id="admin-upload-form"><input type="file" id="file-upload-input" multiple required><button type="submit">Wgraj wybrane pliki</button></form>
        `;
        detailsSection.classList.remove('hidden');

        document.getElementById('generate-code-form').onsubmit = async (e) => {
            e.preventDefault();
            const newPrefix = Math.floor(1000 + Math.random() * 9000).toString();
            await supabase.from('registration_codes').insert({ prefix: newPrefix, client_id_to_assign: clientId });
            renderClientDetails(clientId);
        };

        const adminFileList = document.getElementById('admin-file-list');
        async function fetchAndRenderFiles() {
            const { data } = await supabase.storage.from('client-documents').list(client.storage_folder_path);
            adminFileList.innerHTML = data && data.length > 0 ? data.map(file => `<li><span>${file.name}</span><button class="action-button delete-btn delete-file-btn" data-file-path="${client.storage_folder_path}/${file.name}">Usuń</button></li>`).join('') : '<li>Brak plików.</li>';
        }

        document.getElementById('admin-upload-form').onsubmit = async (e) => {
            e.preventDefault();
            const files = document.getElementById('file-upload-input').files;
            for (const file of files) {
                await supabase.storage.from('client-documents').upload(`${client.storage_folder_path}/${file.name}`, file);
            }
            fetchAndRenderFiles();
        };

        detailsSection.onclick = async (e) => {
            if (e.target.matches('.delete-code-btn')) {
                await supabase.from('registration_codes').delete().eq('id', e.target.dataset.codeId);
                renderClientDetails(clientId);
            }
            if (e.target.matches('.delete-file-btn')) {
                await supabase.storage.from('client-documents').remove([e.target.dataset.filePath]);
                fetchAndRenderFiles();
            }
        };
        await fetchAndRenderFiles();
    }
    
    function showMessage(text, type) {
        const messageArea = document.getElementById('message-area');
        messageArea.textContent = text;
        messageArea.className = `message-${type}`;
        setTimeout(() => messageArea.textContent = '', 5000);
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showMessage(error.message, 'error');
        else checkUserStatus();
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.functions.invoke('register-client', {
            body: {
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value,
                fullName: document.getElementById('register-fullname').value,
                nip: document.getElementById('register-nip').value,
                prefix: document.getElementById('register-prefix').value,
            }
        });
        if (error || data.error) showMessage(error?.message || data.error, 'error');
        else {
            showMessage('Rejestracja pomyślna! Sprawdź email, aby potwierdzić konto, a następnie zaloguj się.', 'success');
            toggleAuthForms(true);
        }
    });

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
    });

    checkUserStatus();
});

