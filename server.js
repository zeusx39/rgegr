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
app.use(bodyParser.json());
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
  
  Object.keys(cookies).forEach(token => {
    if (cookies[token].expiresAt && cookies[token].expiresAt < now) {
      delete cookies[token];
    }
  });
  
  writeCookies(cookies);
}

// Routes

// Get all stored cookies
app.get('/api/cookies', (req, res) => {
  cleanExpiredLinks();
  const cookies = readCookies();
  
  const cookiesList = Object.entries(cookies).map(([token, data]) => ({
    token,
    name: data.name,
    cookieCount: data.cookies.length,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
    expiryType: data.expiryType,
    usageCount: data.usageCount || 0
  }));
  
  res.json(cookiesList);
});

// Save cookies
app.post('/api/save-cookies', (req, res) => {
  try {
    const { name, cookies, expiryTime, expiryType } = req.body;
    
    if (!cookies || cookies.length === 0) {
      return res.status(400).json({ error: 'No cookies provided' });
    }
    
    const token = uuidv4();
    const now = Date.now();
    let expiresAt = null;
    
    if (expiryTime && expiryType) {
      const timeMs = {
        '15min': 15 * 60 * 1000,
        '1hour': 60 * 60 * 1000,
        '6hours': 6 * 60 * 60 * 1000,
        '24hours': 24 * 60 * 60 * 1000,
        '7days': 7 * 24 * 60 * 60 * 1000,
        'never': null
      };
      
      expiresAt = timeMs[expiryType] ? now + timeMs[expiryType] : null;
    }
    
    const cookiesData = readCookies();
    cookiesData[token] = {
      name: name || 'Sem nome',
      cookies: cookies,
      createdAt: new Date(now).toISOString(),
      expiresAt: expiresAt,
      expiryType: expiryType || 'never',
      usageCount: 0
    };
    
    writeCookies(cookiesData);
    
    res.json({
      success: true,
      token: token,
      link: `${req.protocol}://${req.get('host')}/inject?token=${token}`,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Nunca'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cookies to inject
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
    cookies: data.cookies,
    name: data.name
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
  text += `Expira em: ${data.expiresAt ? new Date(data.expiresAt).toISOString() : 'Nunca'}\n`;
  text += `\n${'='.repeat(50)}\n\n`;
  
  data.cookies.forEach(cookie => {
    text += `${cookie.name}=${cookie.value}\n`;
  });
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="cookies-${token}.txt"`);
  res.send(text);
});

// Parse cookies from text
app.post('/api/parse-cookies', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Nenhum texto fornecido' });
    }
    
    const cookies = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.includes('=') === false) {
        const [name, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        
        if (name && value) {
          cookies.push({
            name: name.trim(),
            value: value.trim()
          });
        }
      }
    });
    
    if (cookies.length === 0) {
      return res.status(400).json({ error: 'Nenhum cookie válido encontrado' });
    }
    
    res.json({
      success: true,
      cookies: cookies,
      count: cookies.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 Cookie Share Server rodando em http://localhost:${PORT}`);
});
