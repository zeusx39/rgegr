const API_URL = window.location.origin;

// Show/Hide Sections
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Add active class to clicked nav link
  event.target.classList.add('active');

  // Load data if needed
  if (sectionId === 'manage') {
    loadCookies();
  }
}

// Save Cookies
async function saveCookies() {
  const sessionName = document.getElementById('sessionName').value;
  const cookieText = document.getElementById('cookieInput').value;
  const expiryType = document.getElementById('expiryType').value;

  if (!cookieText.trim()) {
    alert('Por favor, cole seus cookies');
    return;
  }

  try {
    // Parse cookies
    const parseResponse = await fetch(`${API_URL}/api/parse-cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cookieText })
    });

    if (!parseResponse.ok) {
      const error = await parseResponse.json();
      alert('Erro ao parsear cookies: ' + error.error);
      return;
    }

    const parseData = await parseResponse.json();
    const cookies = parseData.cookies;

    // Save cookies
    const saveResponse = await fetch(`${API_URL}/api/save-cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sessionName,
        cookies: cookies,
        expiryTime: 1,
        expiryType: expiryType
      })
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      alert('Erro ao salvar: ' + error.error);
      return;
    }

    const result = await saveResponse.json();

    // Show result
    const resultBox = document.getElementById('saveResult');
    document.getElementById('shareLink').value = result.link;
    document.getElementById('expiryInfo').textContent = 
      `Expira em: ${result.expiresAt}`;
    resultBox.classList.remove('hidden');

    // Clear form
    document.getElementById('cookieInput').value = '';
    document.getElementById('sessionName').value = '';

  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

// Load Cookies List
async function loadCookies() {
  try {
    const response = await fetch(`${API_URL}/api/cookies`);
    const cookies = await response.json();

    const list = document.getElementById('cookiesList');
    
    if (cookies.length === 0) {
      list.innerHTML = '<p class="loading">Nenhum cookie salvo</p>';
      return;
    }

    list.innerHTML = cookies.map(cookie => `
      <div class="cookie-item">
        <div class="cookie-info">
          <h3>${cookie.name}</h3>
          <p>🍪 ${cookie.cookieCount} cookies</p>
          <p>📅 Criado: ${new Date(cookie.createdAt).toLocaleString('pt-BR')}</p>
          <p>⏰ Expira: ${cookie.expiresAt ? new Date(cookie.expiresAt).toLocaleString('pt-BR') : 'Nunca'}</p>
          <p>👁️ Usado: ${cookie.usageCount} vezes</p>
        </div>
        <div class="cookie-actions">
          <button onclick="copyShareLink('${cookie.token}')" class="btn btn-secondary btn-small">Copiar Link</button>
          <button onclick="downloadCookies('${cookie.token}')" class="btn btn-secondary btn-small">Baixar TXT</button>
          <button onclick="deleteCookies('${cookie.token}')" class="btn btn-danger">Deletar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    alert('Erro ao carregar: ' + error.message);
  }
}

// Copy Share Link
async function copyShareLink(token) {
  const link = `${API_URL}/inject?token=${token}`;
  await copyToClipboard('text', link);
}

// Copy to Clipboard
async function copyToClipboard(inputId, text = null) {
  try {
    const textToCopy = text || document.getElementById(inputId).value;
    await navigator.clipboard.writeText(textToCopy);
    alert('✅ Copiado para a área de transferência!');
  } catch (error) {
    alert('Erro ao copiar: ' + error.message);
  }
}

// Download Cookies as TXT
function downloadCookies(token) {
  const link = document.createElement('a');
  link.href = `${API_URL}/api/export/${token}`;
  link.download = `cookies-${token}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Delete Cookies
async function deleteCookies(token) {
  if (!confirm('Tem certeza que deseja deletar?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/cookies/${token}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('✅ Deletado com sucesso!');
      loadCookies();
    } else {
      alert('Erro ao deletar');
    }
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

// Inject Cookies
async function injectCookies() {
  const input = document.getElementById('tokenInput').value.trim();
  
  if (!input) {
    alert('Por favor, cole um token ou link');
    return;
  }

  // Extract token from link if needed
  let token = input;
  if (input.includes('token=')) {
    token = input.split('token=')[1];
  }

  try {
    const response = await fetch(`${API_URL}/api/inject/${token}`);
    
    if (!response.ok) {
      alert('Token inválido ou expirado!');
      return;
    }

    const data = await response.json();
    
    // Set cookies in browser
    data.cookies.forEach(cookie => {
      document.cookie = `${cookie.name}=${cookie.value}; path=/; samesite=lax`;
    });

    // Show result
    const resultBox = document.getElementById('injectResult');
    document.getElementById('injectTitle').textContent = `✅ ${data.cookies.length} cookies injetados!`;
    
    const content = data.cookies.map(cookie => `
      <div class="cookie-row">
        <strong>${cookie.name}</strong> = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}
      </div>
    `).join('');
    
    document.getElementById('injectContent').innerHTML = content;
    resultBox.classList.remove('hidden');

  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

// Check if we're on inject page
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    document.getElementById('tokenInput').value = token;
    showSection('inject');
    setTimeout(() => injectCookies(), 500);
  }
});
