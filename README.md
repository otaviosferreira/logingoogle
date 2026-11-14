# Login com Google — AuthLab

Aplicação acadêmica para demonstrar Google Identity Services (GIS), autenticação com ID token, OAuth 2.0 Authorization Code + PKCE e gerenciamento seguro de sessões.

## Tecnologias

- HTML5, CSS3 e JavaScript puro
- Node.js e Express
- Google Identity Services
- `google-auth-library`
- `express-session` e PostgreSQL (`connect-pg-simple`)
- Helmet, rate limiting e dotenv
- Vercel Functions para hospedar a API e o frontend estático

## Estrutura

```
login-google/
├── api/
│   ├── index.js
│   └── [...path].js
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/{app,auth,quiz}.js
├── backend/
│   ├── server.js
│   ├── routes/auth.js
│   ├── middleware/authMiddleware.js
│   ├── services/googleAuth.js
│   └── .env.example
├── package.json
├── vercel.json
└── README.md
```

## Configuração local

1. Instale Node.js 20 ou superior.
2. Na raiz do projeto, execute `npm install`.
3. Copie `backend/.env.example` para `backend/.env`.
4. Configure as credenciais Google e uma conexão PostgreSQL.
5. Inicie a API com `npm start` (porta 3001).
6. Em outro terminal, sirva a pasta `frontend` em `http://localhost:3000`, por exemplo: `npx http-server frontend -p 3000`.
7. Cadastre `http://localhost:3000` como origem JavaScript autorizada no Google Cloud.

### Variáveis de ambiente

- `GOOGLE_CLIENT_ID`: ID do cliente OAuth; usado pelo GIS e validado como audiência.
- `GOOGLE_CLIENT_SECRET`: segredo OAuth; somente no backend.
- `GOOGLE_REDIRECT_URI`: callback exato do fluxo de autorização.
- `SESSION_SECRET`: segredo aleatório forte para assinar o cookie de sessão.
- `DATABASE_URL`: URL de conexão PostgreSQL para persistir sessões.
- `APP_ORIGIN`: origem exata do frontend, usada na checagem de origem das requisições mutáveis.
- `PGSSL`: use `true` somente quando seu provedor PostgreSQL exigir TLS com cadeia de certificado confiável.

Para gerar um segredo local: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## Configurar Google Cloud

1. Acesse https://console.cloud.google.com/ e crie um projeto.
2. Configure a tela de consentimento e adicione usuários de teste, se o app estiver em modo de teste.
3. Crie credenciais OAuth 2.0 do tipo Aplicativo da Web.
4. Em origens JavaScript autorizadas, inclua a origem local e o domínio de produção.
5. Em URIs de redirecionamento autorizadas, inclua a URL completa do callback OAuth.
6. Copie o Client ID e o Client Secret para as variáveis de ambiente do backend. Nunca publique o Client Secret.

## Implantação na Vercel

O repositório está preparado para servir o diretório `frontend` como site estático e executar `api/index.js` / `api/[...path].js` como funções Node.

Configure no projeto Vercel, nos ambientes Production e Preview conforme necessário:

- `NODE_ENV=production`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://SEU-DOMINIO/api/oauth/callback`
- `SESSION_SECRET` (valor aleatório forte)
- `DATABASE_URL` (PostgreSQL)
- `APP_ORIGIN=https://SEU-DOMINIO`

Cadastre no Google Cloud a origem `https://SEU-DOMINIO` e o redirect URI `https://SEU-DOMINIO/api/oauth/callback`. Depois de configurar variáveis, faça um novo deploy.

## Como testar

- `GET /api/health`: estado da API e indicação do armazenamento de sessão.
- Login GIS: clique no botão Google; o backend valida assinatura, emissor, expiração e audiência do ID token.
- `GET /api/auth/me`: exige sessão válida.
- Logout: destrói a sessão armazenada no PostgreSQL e limpa o cookie.
- Fluxo OAuth: clique em “Experimentar fluxo de autorização”; o backend usa state e PKCE S256.
- Quiz e checklist: funcionam no navegador independentemente do login.

## Segurança aplicada e limites

- O frontend nunca decodifica um token para confiar na identidade: o servidor valida o ID token com `google-auth-library`.
- O claim `sub` é usado como identificador estável; e-mail não é chave de identidade.
- Sessões usam cookie HttpOnly, SameSite=Lax e Secure em produção.
- O ID de sessão é regenerado após login e logout destrói a sessão no servidor.
- Em produção, configure PostgreSQL: o armazenamento em memória é apenas fallback de desenvolvimento e a autenticação retorna indisponível se não houver `DATABASE_URL`.
- Requisições mutáveis exigem origem esperada e cabeçalho customizado como defesa CSRF adicional.
- Helmet e rate limit protegem a API.
- O access token e refresh token não são expostos ao JavaScript da página.

O projeto não inclui credenciais reais. O login real somente é habilitado após a configuração de credenciais Google e banco de dados do responsável pela implantação.
