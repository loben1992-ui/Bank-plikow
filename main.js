import { supabase } from './supabaseClient.js';

// === ELEMENTY DOM ===
const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
// ... (reszta wewnątrz funkcji, aby były zwięzłe)

// === PRZEŁĄCZANIE WIDOKÓW ===
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
showLoginLink.addEventListener('click', () => toggleAuthForms(true));
showRegisterLink.addEventListener('click', () => toggleAuthForms(false));

function toggleAuthForms(showLogin) {
    document.getElementById('login-form-container').classList.toggle('hidden', !showLogin);
    document.getElementById('register-form-container').classList.toggle('hidden', showLogin);
}

// === GŁÓWNA LOGIKA APLIKACJI ===
async function main() {
    // Sprawdź, czy użytkownik jest zalogowany
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
    // Pobierz profil i rolę użytkownika
    const { data: profile } = await supabase.from('profiles').select('*, clients(*)').eq('id', user.id).single();

    document.getElementById('welcome-message').textContent = `Witaj, ${profile.full_name || user.email}`;

    if (profile.role === 'admin') {
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadAdminDashboard();
    } else { // Rola 'client'
        document.getElementById('client-dashboard').classList.remove('hidden');
        loadClientDashboard(profile.clients.storage_folder_path);
    }
}

// === LOGIKA KLIENTA ===
async function loadClientDashboard(folderPath) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '<li>Ładowanie plików...</li>';

    const { data, error } = await supabase.storage.from('client-documents').list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !data || data.length === 0) {
        fileList.innerHTML = '<li>Brak plików do wyświetlenia.</li>';
        return;
    }

    fileList.innerHTML = '';
    for (const file of data) {
        const { data: publicURL } = supabase.storage.from('client-documents').getPublicUrl(`${folderPath}/${file.name}`);
        fileList.innerHTML += `<li><span>${file.name}</span> <a href="${publicURL.publicUrl}" class="file-link" target="_blank" download>Pobierz</a></li>`;
    }
}

// === LOGIKA ADMINA ===
async function loadAdminDashboard() {
    const clientsList = document.getElementById('clients-list');
    
    async function fetchAndRenderClients() {
        const { data: clients } = await supabase.from('clients').select('*').order('company_name');
        clientsList.innerHTML = '';
        clients.forEach(client => {
            const li = document.createElement('li');
            li.textContent = `${client.company_name} (NIP: ${client.nip})`;
            li.dataset.clientId = client.id;
            li.style.cursor = 'pointer';
            clientsList.appendChild(li);
        });
    }

    // Dodawanie nowego klienta
    document.getElementById('add-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('client-name').value;
        const nip = document.getElementById('client-nip').value;
        await supabase.from('clients').insert({ company_name: name, nip });
        e.target.reset();
        await fetchAndRenderClients();
    });

    // Wyświetlanie szczegółów klienta
    clientsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            renderClientDetails(e.target.dataset.clientId);
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
        <ul id="codes-list">
            ${codes.map(code => `<li><span class="code-prefix">${code.prefix}</span> <span>${code.is_used ? 'Wykorzystany' : 'Aktywny'}</span> <button class="action-button delete-btn delete-code-btn" data-code-id="${code.id}">Usuń</button></li>`).join('')}
        </ul>
        <form id="generate-code-form">
            <button type="submit">Generuj nowy kod 4-cyfrowy</button>
        </form>

        <h4>Zarządzaj Plikami</h4>
        <ul id="admin-file-list">Ładowanie...</ul>
        <form id="admin-upload-form">
            <input type="file" id="file-upload-input" multiple required>
            <button type="submit">Wgraj wybrane pliki</button>
        </form>
    `;
    detailsSection.classList.remove('hidden');

    // Generowanie kodu
    document.getElementById('generate-code-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPrefix = Math.floor(1000 + Math.random() * 9000).toString();
        await supabase.from('registration_codes').insert({ prefix: newPrefix, client_id_to_assign: clientId });
        renderClientDetails(clientId);
    });

    // Zarządzanie plikami
    const adminFileList = document.getElementById('admin-file-list');
    async function fetchAndRenderFiles() {
        const { data } = await supabase.storage.from('client-documents').list(client.storage_folder_path);
        adminFileList.innerHTML = data && data.length > 0 ? data.map(file => `<li><span>${file.name}</span><button class="action-button delete-btn delete-file-btn" data-file-path="${client.storage_folder_path}/${file.name}">Usuń</button></li>`).join('') : '<li>Brak plików.</li>';
    }

    document.getElementById('admin-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = document.getElementById('file-upload-input').files;
        for (const file of files) {
            await supabase.storage.from('client-documents').upload(`${client.storage_folder_path}/${file.name}`, file);
        }
        fetchAndRenderFiles();
    });

    detailsSection.addEventListener('click', async (e) => {
        if (e.target.matches('.delete-code-btn')) {
            await supabase.from('registration_codes').delete().eq('id', e.target.dataset.codeId);
            renderClientDetails(clientId);
        }
        if (e.target.matches('.delete-file-btn')) {
            await supabase.storage.from('client-documents').remove([e.target.dataset.filePath]);
            fetchAndRenderFiles();
        }
    });

    await fetchAndRenderFiles();
}

// === OBSŁUGA FORMULARZY LOGOWANIA I REJESTRACJI ===
function showMessage(text, type) {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = text;
    messageArea.className = `message-${type}`;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, 'error');
    else main();
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        fullName: document.getElementById('register-fullname').value,
        nip: document.getElementById('register-nip').value,
        prefix: document.getElementById('register-prefix').value,
    };
    
    // Wywołanie naszej funkcji serwerowej
    const { data, error } = await supabase.functions.invoke('register-client', {
        body: payload,
    });

    if (error || data.error) {
        showMessage(error?.message || data.error, 'error');
    } else {
        showMessage('Rejestracja pomyślna! Sprawdź email, aby potwierdzić konto, a następnie zaloguj się.', 'success');
        toggleAuthForms(true);
    }
});

document.getElementById('logout-button').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

// === INICJALIZACJA PRZY STARCIE ===
main();