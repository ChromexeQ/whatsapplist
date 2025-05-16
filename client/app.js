let isAdmin = false;

const BASE_URL = '';

function toggleLogin() {
  document.getElementById('loginForm').classList.toggle('hidden');
}

async function login() {
  const pass1 = document.getElementById('pass1').value;
  const pass2 = document.getElementById('pass2').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass1, pass2 }),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Błąd logowania';
      return;
    }

    isAdmin = true;
    document.getElementById('loginForm').classList.add('hidden');
    loadChannels();
  } catch (err) {
    errorEl.textContent = 'Błąd połączenia z serwerem';
  }
}

async function loadChannels() {
  const res = await fetch(`${BASE_URL}/api/channels`);
  const channels = await res.json();
  const container = document.getElementById('channels');
  container.innerHTML = '';
  channels.forEach((channel) => {
    const el = document.createElement('div');
    el.className = 'bg-white p-4 rounded shadow flex items-center gap-4';
    el.innerHTML = `
      <img src="${channel.image || 'https://via.placeholder.com/50'}" alt="avatar" class="w-12 h-12 rounded-full object-cover" />
      <div class="flex-1">
        <h2 class="text-lg font-semibold">${channel.name}</h2>
        <a href="${channel.link}" class="text-blue-500" target="_blank">Otwórz w WhatsApp</a>
      </div>
      <button onclick="boost('${channel._id}', this)" class="boost-btn bg-green-500 hover:bg-green-600 active:bg-green-700 transition text-white px-3 py-1 rounded">Boost</button>
      ${isAdmin ? `<button onclick="deleteChannel('${channel._id}')" class="ml-2 bg-red-500 hover:bg-red-600 active:bg-red-700 transition text-white px-3 py-1 rounded">Usuń</button>` : ''}
    `;
    container.appendChild(el);
  });
}

async function addChannel() {
  const link = document.getElementById('link').value;
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';
  if (!link.startsWith('https://whatsapp.com/channel/')) {
    errorEl.textContent = 'Niepoprawny link do kanału';
    return;
  }
  try {
    const res = await fetch(`${BASE_URL}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || 'Nie udało się dodać kanału';
      return;
    }
    document.getElementById('link').value = '';
    loadChannels();
  } catch (err) {
    errorEl.textContent = 'Błąd połączenia z serwerem';
  }
}

async function boost(id, btn) {
  btn.disabled = true;
  try {
    const res = await fetch(`${BASE_URL}/api/channels/${id}/boost`, {
      method: 'POST',
      headers: isAdmin ? { 'X-Admin': 'true' } : {},
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Nie można teraz zboostować');
    }
    loadChannels();
  } catch (err) {
    alert('Błąd połączenia z serwerem');
  }
  btn.disabled = false;
}

async function deleteChannel(id) {
  if (!confirm('Czy na pewno chcesz usunąć ten kanał?')) return;
  try {
    await fetch(`${BASE_URL}/api/channels/${id}`, {
      method: 'DELETE'
    });
    loadChannels();
  } catch (err) {
    alert('Błąd usuwania kanału');
  }
}

loadChannels();
