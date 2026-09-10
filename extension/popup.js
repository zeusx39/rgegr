const API_ORIGIN = ''; // opcional: preencha com 'https://seu-servidor:3000' se não estiver usando localhost

function updateStatus(text) {
  document.getElementById('status').textContent = text;
}

document.getElementById('injectBtn').addEventListener('click', async () => {
  const raw = document.getElementById('token').value.trim();
  if (!raw) return updateStatus('Cole o token ou a URL /share/');

  // extrai token da URL ou usa raw
  let token = raw;
  try {
    const u = new URL(raw);
    const parts = u.pathname.split('/');
    token = parts.filter(Boolean).slice(-1)[0] || token;
  } catch (e) {
    // raw não é URL, assume token
  }

  const onlyCurrent = document.getElementById('onlyCurrentDomain').checked;
  updateStatus('Solicitando injeção para token: ' + token + ' ...');

  chrome.runtime.sendMessage({ action: 'injectCookies', token, onlyCurrent }, response => {
    if (!response) return updateStatus('Sem resposta do background (verifique permissões).');
    if (response.error) updateStatus('Erro: ' + response.error);
    else updateStatus('Concluído.\nInjetados: ' + response.injected + '\nFalhas: ' + response.failed + '\n\n' + (response.details || 'Nenhum detalhe'));
  });
});
