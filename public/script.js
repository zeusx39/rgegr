const API_URL = window.location.origin;
let currentStep = 1;
let selectedDevice = 'universal';
let parsedCookies = [];

// Show/Hide Sections
function showSection(sectionId, event) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  document.getElementById(sectionId).classList.add('active');
  if (event && event.target) event.target.classList.add('active');

  if (sectionId === 'manage') {
    loadCookies();
  }
}

// Step Navigation
function nextStep() {
  if (currentStep === 1) {
    // Validate cookies
    const cookieText = document.getElementById('cookieInput').value.trim();
    if (!cookieText) {
      alert('Por favor, cole seus cookies');
      return;
    }
    parseCookiesFromText(cookieText);
  } else if (currentStep === 2) {
    if (!selectedDevice) {
      alert('Por favor, selecione um dispositivo');
      return;
    }
  }

  currentStep++;
  updateSteps();
}

function prevStep() {
  currentStep--;
  updateSteps();
}

function updateSteps() {
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });
  const el = document.getElementById(`step${currentStep}`);
  if (el) el.classList.add('active');

  document.querySelectorAll('.step').forEach((step, index) => {
    if (index + 1 <= currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

function selectDevice(device) {
  selectedDevice = device;
  document.querySelectorAll('.device-option').forEach(option => {
    option.classList.remove('selected');
  });
  const el = document.querySelector(`[data-device="${device}"]`);
  if (el) el.classList.add('selected');
}

// Parse Cookies
function parseCookiesFromText(text) {
  const cookies = [];
  const lines = text.split('\n');

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Detect Netscape cookie file format (tab-separated, 7 fields)
    // domain\tflag\tpath\tsecure\texpiration\tname\tvalue
    if (line.split('\t').length >= 7) {
      const parts = line.split('\t');
      const domain = parts[0];
      const includeSubdomains = parts[1] && parts[1].toUpperCase() === 'TRUE';
      const path = parts[2] || '/';
      const secure = parts[3] && parts[3].toUpperCase() === 'TRUE';
      const expires = Number(parts[4]) || null;
      const name = parts[5] || '';
      // value might contain tabs, join the rest
      const value = parts.slice(6).join('\t') || '';

      if (name && value) {
        cookies.push({ name, value, domain, path, secure, expires, includeSubdomains });
      }
      continue;
    }

    // Detect simple "name=value" lines
    if (line.includes('=')) {
      // Also skip lines that look like headers
      if (line.toLowerCase().includes('criado') || line.includes('===') || line.toLowerCase().includes('expira')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const name = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        if (name && value) {
          cookies.push({ name, value, domain: null, path: '/', secure: false });
        }
      }
      continue;
    }

    // Unrecognized line -> skip
  }

  if (cookies.length === 0) {
    alert('Nenhum cookie válido encontrado. Use o formato: nome=valor OR o formato de exportação do navegador (Netscape).');
    return;
  }

  parsedCookies = cookies;
  alert(`✅ ${cookies.length} cookie(s) parseado(s) com sucesso`);
}

// Save Cookies
async function saveCookies() {
  const sessionName = document.getElementById('sessionName').value || 'Sem nome';
  const expiryType = document.getElementById('expiryType').value;

  if (parsedCookies.length === 0) {
    alert('Nenhum cookie para salvar');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/save-cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sessionName,
        cookies: parsedCookies,
        expiryType: expiryType,
        deviceType: selectedDevice
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Erro: ' + (error.error || JSON.stringify(error)));
      return;
    }

    const result = await response.json();
    showResult(result);
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

function showResult(result) {
  document.getElementById('shareLink').value = result.shareLink;

  const deviceEmoji = {
    pc: '🖥️ PC / Desktop',
    mobile: '📱 Celular / Tablet',
    tv: '📺 Smart TV',
    universal: '🌐 Qualquer Dispositivo'
  };

  const expiryText = {
    '15min': '15 minutos',
    '1hour': '1 hora',
    '6hours': '6 horas',
    '24hours': '24 horas',
    '7days': '7 dias',
    'never': 'Nunca'
  };

  const info = `
    <strong>Cookies:</strong> ${parsedCookies.length}<br>
    <strong>Dispositivo:</strong> ${deviceEmoji[result.deviceType] || deviceEmoji.universal}<br>
    <strong>Expiração:</strong> ${expiryText[result.expiryType] || expiryText['never']}<br>
    <strong>Criado em:</strong> ${new Date().toLocaleString('pt-BR')}
  `;

  document.getElementById('resultInfo').innerHTML = info;
  document.getElementById('saveResult').classList.remove('hidden');
}

function copyShareLink() {
  const link = document.getElementById('shareLink').value;
  navigator.clipboard.writeText(link).then(() => {
    alert('✅ Link copiado com sucesso!');
  });
}

function qrCode() {
  const link = document.getElementById('shareLink').value;
  const modal = document.getElementById('qrModal');
  const qrContainer = document.getElementById('qrCode');
  qrContainer.innerHTML = '';

  new QRCode(qrContainer, {
    text: link,
    width: 256,
    height: 256,
    colorDark: '#00d4ff',
    colorLight: '#1a1a1a'
  });

  document.getElementById('qrUrl').textContent = link;
  modal.classList.remove('hidden');
}

function closeQR() {
  document.getElementById('qrModal').classList.add('hidden');
}

function resetForm() {
  currentStep = 1;
  selectedDevice = 'universal';
  parsedCookies = [];
  document.getElementById('cookieInput').value = '';
  document.getElementById('sessionName').value = '';
  document.getElementById('saveResult').classList.add('hidden');
  document.querySelectorAll('.device-option').forEach(option => {
    option.classList.remove('selected');
  });
  updateSteps();
}

// Load Cookies List
async function loadCookies() {
  try {
    const response = await fetch(`${API_URL}/api/cookies`);
    const cookies = await response.json();

    const list = document.getElementById('cookiesList');

    if (!Array.isArray(cookies) || cookies.length === 0) {
      list.innerHTML = '<p class="loading">Nenhum link criado</p>';
      return;
    }

    const deviceEmoji = {
      pc: '🖥️',
      mobile: '📱',
      tv: '📺',
      universal: '🌐'
    };

    list.innerHTML = cookies.map(cookie => `
      <div class="cookie-item">
        <div class="cookie-info">
          <h3>${cookie.name}</h3>
          <p>${deviceEmoji[cookie.deviceType] || '🌐'} ${cookie.deviceType ? cookie.deviceType.toUpperCase() : 'Universal'}</p>
          <p>🍪 ${cookie.cookieCount} cookies</p>
          <p>📅 ${new Date(cookie.createdAt).toLocaleString('pt-BR')}</p>
          <p>⏰ Expira: ${cookie.expiresAt ? new Date(cookie.expiresAt).toLocaleString('pt-BR') : 'Nunca'}</p>
          <p>👁️ Acessado ${cookie.usageCount} vez${cookie.usageCount !== 1 ? 'es' : ''}</p>
        </div>
        <div class="cookie-actions">
          <button onclick="copyLinkFromList('${cookie.token}')" class="btn btn-secondary btn-small">Copiar</button>
          <button onclick="downloadCookies('${cookie.token}')" class="btn btn-secondary btn-small">TXT</button>
          <button onclick="deleteCookies('${cookie.token}')" class="btn btn-danger">Deletar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar:', error);
    alert('Erro ao carregar cookies: ' + error.message);
  }
}

function copyLinkFromList(token) {
  const link = `${API_URL}/share/${token}`;
  navigator.clipboard.writeText(link).then(() => {
    alert('✅ Link copiado com sucesso!');
  });
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
  if (!confirm('Tem certeza que deseja deletar este link?')) {
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

// Initialize
window.addEventListener('load', () => {
  updateSteps();
});

// Export functions for injection page if needed
window.parseCookiesFromText = parseCookiesFromText;
window.saveCookies = saveCookies;
window.selectDevice = selectDevice;
window.showSection = showSection;
