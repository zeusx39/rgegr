import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Data storage
const DATA_FILE = path.join(__dirname, 'data', 'cookies.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize cookies file
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

// Helper functions
function readCookies() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeCookies(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function cleanExpiredLinks() {
  const cookies = readCookies();
  const now = Date.now();
  let cleaned = false;
  
  Object.keys(cookies).forEach(token => {
    if (cookies[token].expiresAt && cookies[token].expiresAt < now) {
      delete cookies[token];
      cleaned = true;
    }
  });
  
  if (cleaned) {
    writeCookies(cookies);
  }
}

// Routes

// Get all stored cookies
app.get('/api/cookies', (req, res) => {
  cleanExpiredLinks();
  const cookies = readCookies();
  
  const cookiesList = Object.entries(cookies).map(([token, data]) => ({
    token,
    name: data.name || 'Sem nome',
    cookieCount: data.cookies ? data.cookies.length : 0,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
    expiryType: data.expiryType || 'never',
    usageCount: data.usageCount || 0,
    deviceType: data.deviceType || 'universal'
  }));
  
  res.json(cookiesList);
});

// Save cookies
app.post('/api/save-cookies', (req, res) => {
  try {
    const { name, cookies, expiryType, deviceType } = req.body;
    
    if (!cookies || cookies.length === 0) {
      return res.status(400).json({ error: 'Nenhum cookie fornecido' });
    }
    
    const token = uuidv4();
    const now = Date.now();
    let expiresAt = null;
    
    const timeMs = {
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '6hours': 6 * 60 * 60 * 1000,
      '24hours': 24 * 60 * 60 * 1000,
      '7days': 7 * 24 * 60 * 60 * 1000,
      'never': null
    };
    
    expiresAt = timeMs[expiryType] ? now + timeMs[expiryType] : null;
    
    const cookiesData = readCookies();
    cookiesData[token] = {
      name: name || 'Sem nome',
      cookies: Array.isArray(cookies) ? cookies : [],
      createdAt: new Date(now).toISOString(),
      expiresAt: expiresAt,
      expiryType: expiryType || 'never',
      deviceType: deviceType || 'universal',
      usageCount: 0
    };
    
    writeCookies(cookiesData);
    
    res.json({
      success: true,
      token: token,
      shareLink: `${req.protocol}://${req.get('host')}/share/${token}`,
      injectLink: `${req.protocol}://${req.get('host')}/inject/${token}`,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Nunca',
      deviceType: deviceType
    });
  } catch (error) {
    console.error('Erro ao salvar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Share page - displays cookies to be injected
app.get('/share/:token', (req, res) => {
  cleanExpiredLinks();
  const { token } = req.params;
  const cookies = readCookies();
  
  if (!cookies[token]) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Erro - Cookie Expirado</title>
        <style>
          body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #e0e0e0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .error-container {
            background: rgba(255, 100, 100, 0.1);
            border: 2px solid rgba(255, 100, 100, 0.5);
            border-radius: 12px;
            padding: 3rem;
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #ff6464; }
          p { color: #c0c0c0; }
          a {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 2rem;
            background: linear-gradient(135deg, #00d4ff, #0099cc);
            color: #000;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️ Link Expirado ou Inválido</h1>
          <p>Este link de compartilhamento não está mais disponível.</p>
          <a href="/">← Voltar ao início</a>
        </div>
      </body>
      </html>
    `);
  }
  
  const data = cookies[token];
  const deviceEmoji = {
    pc: '🖥️',
    mobile: '📱',
    tv: '📺',
    universal: '🌐'
  };

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Compartilhamento de Cookies</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #e0e0e0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .container {
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          padding: 3rem;
          max-width: 600px;
          backdrop-filter: blur(10px);
          text-align: center;
        }
        .logo {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        h1 {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }
        .info {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
          text-align: left;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label { color: #00d4ff; font-weight: 600; }
        .info-value { color: #c0c0c0; }
        .btn {
          display: inline-block;
          padding: 1rem 2.5rem;
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: #000;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 1rem;
          cursor: pointer;
          border: none;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4);
        }
        .cookies-list {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
          padding: 1rem;
          margin: 1.5rem 0;
          max-height: 300px;
          overflow-y: auto;
          text-align: left;
        }
        .cookie-row {
          padding: 0.75rem;
          background: rgba(0, 212, 255, 0.05);
          border-radius: 4px;
          margin-bottom: 0.5rem;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          word-break: break-all;
        }
        .cookie-row strong { color: #00d4ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🔐</div>
        <h1>Cookies Prontos para Injetar</h1>
        
        <div class="info">
          <div class="info-row">
            <span class="info-label">📌 Sessão:</span>
            <span class="info-value">${data.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${deviceEmoji[data.deviceType] || '🌐'} Dispositivo:</span>
            <span class="info-value">${data.deviceType || 'Universal'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">🍪 Cookies:</span>
            <span class="info-value">${data.cookies ? data.cookies.length : 0}</span>
          </div>
          <div class="info-row">
            <span class="info-label">⏰ Expira:</span>
            <span class="info-value">${data.expiresAt ? new Date(data.expiresAt).toLocaleString('pt-BR') : 'Nunca'}</span>
          </div>
        </div>

        <p style="color: #909090; margin-bottom: 1rem;">Clique no botão abaixo para injetar os cookies automaticamente no seu navegador</p>
        
        <div class="cookies-list">
          ${data.cookies && data.cookies.length > 0 ? data.cookies.map(c => `
            <div class="cookie-row">
              <strong>${c.name}</strong> = ${c.value.substring(0, 40)}${c.value.length > 40 ? '...' : ''}
            </div>
          `).join('') : '<p>Nenhum cookie</p>'}
        </div>

        <button class="btn" onclick="injectCookies()">💉 Injetar Cookies Agora</button>

        <script>
          function injectCookies() {
            const cookies = ${JSON.stringify(data.cookies || [])};
            cookies.forEach(cookie => {
              document.cookie = cookie.name + '=' + cookie.value + '; path=/; max-age=31536000; samesite=lax';
            });
            
            alert('✅ ' + cookies.length + ' cookies injetados com sucesso!\n\nAtualize a página para ver o resultado.');
            
            // Auto reload
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        </script>
      </div>
    </body>
    </html>
  `);
});

// Inject page (legacy, redirects to share)
app.get('/inject/:token', (req, res) => {
  res.redirect(`/share/${req.params.token}`);
});

// Get token info
app.get('/api/token-info/:token', (req, res) => {
  cleanExpiredLinks();
  const { token } = req.params;
  const cookies = readCookies();
  
  if (!cookies[token]) {
    return res.status(404).json({ error: 'Token inválido ou expirado' });
  }
  
  const data = cookies[token];
  
  res.json({
    success: true,
    name: data.name,
    deviceType: data.deviceType || 'universal',
    cookieCount: data.cookies ? data.cookies.length : 0,
    expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : 'Nunca',
    createdAt: data.createdAt
  });
});

// Get cookies to inject (API)
app.get('/api/inject/:token', (req, res) => {
  cleanExpiredLinks();
  const { token } = req.params;
  const cookies = readCookies();
  
  if (!cookies[token]) {
    return res.status(404).json({ error: 'Token inválido ou expirado' });
  }
  
  const data = cookies[token];
  
  // Increment usage count
  data.usageCount = (data.usageCount || 0) + 1;
  writeCookies(cookies);
  
  res.json({
    success: true,
    cookies: data.cookies || [],
    name: data.name,
    deviceType: data.deviceType || 'universal'
  });
});

// Delete a cookie link
app.delete('/api/cookies/:token', (req, res) => {
  try {
    const { token } = req.params;
    const cookies = readCookies();
    
    if (!cookies[token]) {
      return res.status(404).json({ error: 'Token não encontrado' });
    }
    
    delete cookies[token];
    writeCookies(cookies);
    
    res.json({ success: true, message: 'Cookies deletados' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export cookies as text
app.get('/api/export/:token', (req, res) => {
  cleanExpiredLinks();
  const { token } = req.params;
  const cookies = readCookies();
  
  if (!cookies[token]) {
    return res.status(404).json({ error: 'Token inválido' });
  }
  
  const data = cookies[token];
  let text = `Cookies - ${data.name}\n`;
  text += `Criado em: ${data.createdAt}\n`;
  text += `Tipo de dispositivo: ${data.deviceType || 'Universal'}\n`;
  text += `Expira em: ${data.expiresAt ? new Date(data.expiresAt).toISOString() : 'Nunca'}\n`;
  text += `\n${'='.repeat(50)}\n\n`;
  
  if (data.cookies && data.cookies.length > 0) {
    data.cookies.forEach(cookie => {
      text += `${cookie.name}=${cookie.value}\n`;
    });
  }
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="cookies-${token}.txt"`);
  res.send(text);
});

// Parse cookies from text
app.post('/api/parse-cookies', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Nenhum texto fornecido' });
    }
    
    const cookies = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      // Skip empty lines and header lines
      if (line && line.includes('=') && !line.includes('Criado em') && !line.includes('Expira') && !line.includes('===')) {
        const eqIndex = line.indexOf('=');
        if (eqIndex > 0) {
          const name = line.substring(0, eqIndex).trim();
          const value = line.substring(eqIndex + 1).trim();
          
          if (name && value && name.length > 0) {
            cookies.push({
              name: name,
              value: value
            });
          }
        }
      }
    });
    
    if (cookies.length === 0) {
      return res.status(400).json({ error: 'Nenhum cookie válido encontrado. Use o formato: nome=valor' });
    }
    
    res.json({
      success: true,
      cookies: cookies,
      count: cookies.length
    });
  } catch (error) {
    console.error('Erro ao parsear:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔐 Cookie Share Server rodando em http://localhost:${PORT}`);
  console.log(`Abra http://localhost:${PORT} no navegador\n`);
});
