# 🔐 Cookie Share - Compartilhador Profissional de Cookies

Um aplicativo moderno e profissional para compartilhar cookies entre dispositivos de forma segura e controlada.

## ✨ Características

- **Salvar Cookies**: Armazene seus cookies de forma segura
- **Gerar Links**: Crie links únicos com expiração configurável
- **Injetar Automático**: Acesse sessões sem precisar fazer login
- **Gerenciar**: Controle todos os seus cookies salvos
- **Exportar**: Baixe cookies em formato TXT
- **Expiração Flexível**: 15 min, 1h, 6h, 24h, 7 dias ou nunca

## 🚀 Como Usar

### Instalação

```bash
npm install
```

### Iniciar Servidor

```bash
npm start
```

O aplicativo estará disponível em `http://localhost:3000`

### Fluxo de Uso

#### 1. Salvar Cookies
- Vá para "Salvar Cookies"
- Digite um nome para a sessão (opcional)
- Selecione o tempo de expiração
- Cole seus cookies no formato: `nome=valor`
- Clique em "Salvar Cookies"
- Compartilhe o link gerado

#### 2. Injetar Cookies
- Acesse o link compartilhado
- OU vá para "Injetar" e cole o token/link
- Os cookies serão automaticamente injetados

#### 3. Gerenciar
- Veja todos os seus cookies salvos
- Copie links para compartilhar
- Baixe em formato TXT
- Delete cookies quando não precisar mais

## 🏗️ Estrutura do Projeto

```
.
├── server.js           # Backend Express
├── package.json        # Dependências
├── public/
│   ├── index.html      # Interface principal
│   ├── style.css       # Estilos (tema escuro profissional)
│   └── script.js       # Lógica frontend
├── data/
│   └── cookies.json    # Armazenamento de cookies
└── README.md
```

## 🔒 Segurança

- Tokens únicos (UUID) para cada compartilhamento
- Expiração de links configurável
- Cookies armazenados localmente
- Sem envio de dados para servidores externos
- HTTPS recomendado em produção

## 📊 API Endpoints

### GET `/api/cookies`
Retorna lista de todos os cookies salvos

### POST `/api/save-cookies`
Salva novos cookies
```json
{
  "name": "Chrome - PC",
  "cookies": [
    {"name": "session_id", "value": "abc123"}
  ],
  "expiryType": "24hours"
}
```

### GET `/api/inject/:token`
Retorna cookies para injetar

### DELETE `/api/cookies/:token`
Deleta um cookie salvo

### GET `/api/export/:token`
Exporta cookies em formato TXT

### POST `/api/parse-cookies`
Parseia texto de cookies

## 🎨 Design

- Tema escuro profissional (preto/azul)
- Interface moderna e intuitiva
- Responsivo para todos os dispositivos
- Animações suaves

## 📝 Tipos de Expiração

- **15 minutos**: Acesso rápido e temporário
- **1 hora**: Para o mesmo dia
- **6 horas**: Meio período
- **24 horas**: Um dia completo
- **7 dias**: Uma semana de acesso
- **Nunca**: Acesso permanente

## ⚙️ Configuração em Produção

1. Instale dependências: `npm install`
2. Configure variáveis de ambiente (`.env`)
3. Use HTTPS
4. Considere usar banco de dados em vez de JSON
5. Implemente autenticação
6. Configure backups automáticos

## 📦 Dependências

- **express**: Framework web
- **cors**: CORS middleware
- **body-parser**: Parseador de corpo de requisição
- **uuid**: Gerador de tokens únicos
- **dotenv**: Variáveis de ambiente

## 🐛 Troubleshooting

**Porta 3000 já está em uso?**
```bash
# Windows
netstat -ano | findstr :3000
# macOS/Linux
lsof -i :3000
```

**Erro ao salvar cookies?**
- Verifique o formato (nome=valor)
- Certifique-se de que há pelo menos um cookie

**Cookies não injetam?**
- Verificar se o token não expirou
- Limpar cache do navegador
- Tentar em nova aba anônima

## 📄 Licença

ISC

## 👨‍💻 Desenvolvido por

zeusx39

---

**Nota**: Use com responsabilidade. Cookies contêm dados sensíveis de sessão.
