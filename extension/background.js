// background service worker
const SERVER_BASE = 'http://localhost:3000'; // Ajuste se seu servidor estiver em outro host/porta (ex.: 'https://meu-servidor.com')

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'injectCookies') {
    injectCookiesHandler(msg.token, !!msg.onlyCurrent).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true; // mantém canal aberto até resposta
  }
});

async function injectCookiesHandler(token, onlyCurrentDomain) {
  const apiBase = SERVER_BASE;
  const url = `${apiBase}/api/inject/${token}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Falha ao buscar cookies: ' + resp.status + ' - ' + txt);
    }
    const data = await resp.json();
    if (!data.success || !Array.isArray(data.cookies)) {
      throw new Error('Resposta inválida do servidor');
    }

    let targetHost = null;
    if (onlyCurrentDomain) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) throw new Error('Nenhuma aba ativa encontrada');
      try {
        const u = new URL(tabs[0].url);
        targetHost = u.hostname;
      } catch (e) {
        throw new Error('Não foi possível determinar host da aba atual');
      }
    }

    let injected = 0, failed = 0;
    const detailsList = [];

    for (const c of data.cookies) {
      try {
        let name = c.name || '';
        let value = (c.value || '').replace(/^"(.*)"$/, '$1');
        let domain = c.domain || null;
        let path = c.path || '/';

        if (onlyCurrentDomain && targetHost && domain) {
          const domainNoDot = domain.replace(/^\./, '').toLowerCase();
          if (!(targetHost === domainNoDot || targetHost.endsWith('.' + domainNoDot))) {
            detailsList.push(`Pulando ${name}: domain ${domain} não compatível com ${targetHost}`);
            continue;
          }
        }

        const domainForUrl = domain ? domain.replace(/^\./, '') : (targetHost || 'localhost');
        const scheme = c.secure ? 'https' : 'http';
        const urlForCookie = `${scheme}://${domainForUrl}${path.startsWith('/') ? path : '/' + path}`;

        const cookieDetails = {
          url: urlForCookie,
          name,
          value,
          path,
          secure: !!c.secure,
          httpOnly: !!c.httpOnly
        };

        if (c.expires) {
          let expiresNum = Number(c.expires);
          if (expiresNum > 1e12) cookieDetails.expirationDate = Math.floor(expiresNum / 1000);
          else cookieDetails.expirationDate = expiresNum;
        }

        await new Promise(resolve => {
          chrome.cookies.set(cookieDetails, created => {
            if (chrome.runtime.lastError) {
              failed++;
              detailsList.push(`Falha definir ${name} @ ${domainForUrl}: ${chrome.runtime.lastError.message}`);
            } else {
              injected++;
              detailsList.push(`Definido ${name} @ ${domainForUrl}`);
            }
            resolve();
          });
        });
      } catch (e) {
        failed++;
        detailsList.push(`Erro ao processar cookie ${c.name}: ${e.message}`);
      }
    }

    return { success: true, injected, failed, details: detailsList.join('\n') };
  } catch (error) {
    return { error: error.message };
  }
}
