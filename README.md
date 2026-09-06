# AgendaMeets

AgendaMeets é um sistema de gerenciamento de agendamentos para equipes de atendimento, permitindo organizar e acompanhar reuniões e atendimentos por atendente, assunto e status, com alertas sonoros antes do início de cada compromisso. O acesso é feito via login Google restrito ao domínio da equipe, e cada atendente pode sincronizar seus agendamentos com sua própria Google Agenda. Um app mobile (React Native/Expo, em `mobile/`) consome essa mesma API como um segundo cliente, focado no atendente em campo.

## Funcionalidades

- Listagem de agendamentos com filtros por período e atendente (filtros salvos no localStorage)
- Criação, edição e exclusão de agendamentos via modal
- Alertas sonoros no browser antes do início de cada agendamento (configurável por atendente ou por agendamento)
- Importação de agendamentos a partir de uma planilha Google Sheets
- Sincronização de agendamentos com a Google Agenda pessoal de cada atendente (conexão opt-in)
- CRUD de atendentes e assuntos
- Acesso restrito a contas `@domainexemplo` via Google OAuth
- App mobile (Expo) com login Google nativo e lista dos agendamentos do dia do atendente — ver [App mobile](#app-mobile)

## Stack

| Camada         | Tecnologia                                                  |
| -------------- | ----------------------------------------------------------- |
| Framework      | Next.js 15 (App Router)                                     |
| UI             | React 19 + Tailwind CSS 4                                   |
| Banco de dados | PostgreSQL via Prisma 6                                     |
| Autenticação   | NextAuth v5 (Google OAuth) + JWT próprio para o mobile       |
| Integrações    | Google Sheets API v4, Google Calendar API v3 (`googleapis`) |
| Mobile         | React Native + Expo Router (SDK 57), `mobile/`               |
| Runtime        | Node.js 24                                                  |

## Arquitetura

```
agendameets-sup/
├── app/
│   ├── layout.js              # Layout raiz (html/body)
│   ├── login/                 # Página de login pública
│   ├── (home)/                # Grupo de rotas autenticadas
│   │   ├── layout.js          # Injeta sidebar e providers
│   │   ├── page.js            # Dashboard
│   │   ├── agendamentos/      # Lista com filtros e paginação
│   │   ├── atendentes/        # CRUD de atendentes
│   │   └── assuntos/          # CRUD de assuntos
│   └── api/                   # Route Handlers (sessão web OU Bearer token do mobile)
│       ├── agendamentos/      # GET (paginado), POST, PUT, DELETE
│       ├── atendentes/        # CRUD
│       ├── assuntos/          # CRUD
│       ├── status/            # GET
│       ├── mobile/login/      # POST — troca idToken do Google por um token do app mobile
│       ├── sync-sheets/       # POST — importa da planilha
│       └── google-calendar/   # connect, callback, disconnect, status
├── components/
│   ├── Header/                # Sidebar colapsável de navegação (botão conectar/desconectar agenda)
│   ├── Providers.jsx          # SessionProvider + AlertaProvider
│   ├── AgendamentoModal.jsx   # Modal de criação/edição
│   ├── AlertaModal.jsx        # Modal de notificação de alerta
│   ├── AlertaProvider.jsx     # Gerencia estado do alerta ativo
│   ├── AssuntoModal.jsx       # Modal de assunto
│   └── AtendenteModal.jsx     # Modal de atendente
├── hooks/
│   └── useAlertaAgendamentos.js  # Polling + timers de alerta
├── lib/
│   ├── sheets.js               # Cliente Google Sheets (service account)
│   ├── googleCalendar.js       # OAuth + CRUD de eventos na Google Agenda
│   ├── apiAuth.js              # isAuthenticated(request) — sessão web OU Bearer token
│   ├── mobileAuth.js           # Assina/valida o JWT do app mobile
│   ├── googleIdToken.js        # Valida o idToken do Google enviado pelo app mobile
│   └── emailDomain.js          # Checa domínio de e-mail permitido (web + mobile)
├── auth.js                     # NextAuth com callbacks de domínio e atendenteId
├── auth.config.js              # Configuração edge-safe do provider Google
├── middleware.js               # Proteção de rotas via NextAuth
├── mobile/                     # App React Native (Expo) — ver seção "App mobile"
└── prisma/
    ├── schema.prisma           # Schema do banco de dados
    └── migrations/             # Histórico de migrações
```

### Modelos de dados

- **Atendente** — `nome`, `ativo`, `email` (único, usado para vincular ao login), `alertaMinutos` (antecedência padrão do alerta), `googleAccessToken`/`googleRefreshToken`/`googleTokenExpiry`/`googleCalendarConectado` (integração com Google Agenda)
- **Agendamento** — `dataHoraInicio`, `dataHoraFim`, `cliente`, `linkUmbler`, `observacoes`, `alertaMinutos` (sobrescreve o do atendente), `googleEventId` (evento correspondente na Google Agenda do atendente); FK para Atendente e Status; M2M com Assunto
- **Assunto** — categoria/tema da reunião (muitos para muitos com Agendamento)
- **Status** — estado do agendamento com cor em hex para badge visual

### Sistema de alertas

O hook `useAlertaAgendamentos` roda no cliente e faz polling a cada 60 segundos para buscar os agendamentos do dia do atendente logado. Para cada um, agenda um `setTimeout` para disparar `alertaMinutos` antes do início — tocando um alarme de áudio via Web Audio API e exibindo um modal de notificação. (No mobile, alertas via push ainda não foram implementados.)

### Autenticação

Dois clientes autenticam contra o mesmo backend — o painel web (sessão NextAuth) e o app mobile (Bearer token próprio) — usando a mesma regra de domínio e a mesma forma de resolver o `atendenteId`; o que muda é só o transporte da sessão.

- **Login**: Google OAuth apenas, restrito a e-mails do domínio configurado em `AUTH_ALLOWED_EMAIL_DOMAINS` (checado em `lib/emailDomain.js`, usado tanto no callback `signIn` do NextAuth quanto no endpoint de login mobile).
- **`atendenteId`**: resolvido pelo e-mail do usuário na tabela `Atendente` — pode ser `null` se o e-mail não corresponder a nenhum atendente cadastrado. Fica disponível em `session.atendenteId` no cliente web, ou no payload do token no mobile.
- **Autorização das rotas de API**: `lib/apiAuth.js` exporta `isAuthenticated(request)`, usado em todas as rotas de dados (`agendamentos`, `atendentes`, `assuntos`, `status`). Aceita **sessão web válida** (`session?.user`) **ou** um header `Authorization: Bearer <token>` válido — em nenhum dos dois casos exige `atendenteId`. Ou seja, qualquer conta autenticada do domínio permitido acessa a API; o `atendenteId` é usado só para filtrar/vincular dados (ex.: agendamentos de um atendente específico), não para bloquear acesso.
- **Login mobile**: `POST /api/mobile/login` recebe um `idToken` do Google (obtido nativamente via `@react-native-google-signin/google-signin`), valida a assinatura contra o JWKS público do Google (`lib/googleIdToken.js`, audiência = `AUTH_GOOGLE_MOBILE_CLIENT_ID`), confere o domínio permitido, resolve o `atendenteId` e devolve um JWT próprio (30 dias, assinado com `AUTH_SECRET` via `lib/mobileAuth.js`). O app guarda esse token no `SecureStore` e manda em `Authorization: Bearer` nas chamadas seguintes.

### Importação via Google Sheets

`POST /api/sync-sheets` lê o intervalo `A7:J` da planilha configurada e importa agendamentos. Atendentes, status e assuntos são criados automaticamente se não existirem. O campo `linkUmbler` é usado como chave de deduplicação — linhas sem ele são ignoradas.

### Sincronização com Google Agenda

Cada atendente pode conectar sua própria conta Google (a mesma usada no login) para que seus agendamentos sejam replicados na sua Google Agenda pessoal. A conexão é opt-in, feita pelo popover do usuário em `components/Header/Header.jsx`.

- Fluxo OAuth próprio (independente do login do NextAuth), implementado em `lib/googleCalendar.js` com o pacote `googleapis` e exposto pelas rotas `app/api/google-calendar/{connect,callback,disconnect,status}`.
- Escopo solicitado: `calendar.events` (somente inserir/editar/excluir eventos, sem ler a agenda do usuário).
- A URL de consentimento usa `login_hint`/`hd` para sugerir a conta correta, e o callback valida o `id_token` retornado contra o e-mail da sessão — se não bater, o token é revogado e a conexão é recusada. Isso impede conectar uma conta Google diferente da usada no login.
- Ao criar, editar, reatribuir o atendente ou excluir um agendamento, o evento correspondente (`Agendamento.googleEventId`) é criado/atualizado/excluído na agenda `primary` do atendente conectado. Falhas de sincronização (ex.: token revogado) não bloqueiam a operação no sistema — apenas marcam o atendente como desconectado (`googleCalendarConectado = false`) quando aplicável.
- **Sincronização é hoje apenas em uma via (sistema → Google Agenda)**; alterações feitas diretamente no Google Calendar não são refletidas de volta no sistema.
- Pré-requisito no Google Cloud: a "Google Calendar API" precisa estar habilitada na Library do projeto usado em `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.

## App mobile

Um app React Native (Expo, SDK 57) em `mobile/` consome a mesma API do backend — não é um sistema separado, é mais um cliente. Escopo atual: login e lista dos agendamentos do dia do atendente logado.

### Decisões de stack

| Escolha | Motivo |
| --- | --- |
| Expo Router | Roteamento por arquivo, mesmo raciocínio do App Router do Next.js |
| `@react-native-google-signin/google-signin` | Lib oficial para login Google nativo. **Exige build de desenvolvimento (EAS)** — não roda no Expo Go. O fluxo genérico via `expo-auth-session` foi descartado: não funciona no Expo Go (não recebe redirect de scheme customizado) e exigiria um client OAuth incompatível com esse fluxo. |
| JWT próprio via `Authorization: Bearer` | O backend usa sessão por cookie (NextAuth), que não funciona num app nativo. O mobile troca o `idToken` do Google por um JWT próprio em `/api/mobile/login`. |

### Estrutura

```
mobile/
├── app.json                 # scheme, android.package, plugins (expo-router, expo-dev-client, google-signin)
├── eas.json                  # perfis de build (development/preview/production)
├── .env.example
├── app/
│   ├── _layout.jsx           # AuthProvider + Stack
│   ├── index.jsx              # redireciona para /login ou /(app)/agendamentos
│   ├── login.jsx               # botão "Entrar com Google"
│   └── (app)/
│       ├── _layout.jsx         # guarda de rota (redireciona se não autenticado)
│       └── agendamentos.jsx    # agendamentos do dia do atendente logado
├── context/AuthContext.jsx     # token/atendente/isLoading + signIn/signOut
└── services/
    ├── googleAuth.js           # GoogleSignin.configure/signIn
    ├── auth.js                  # POST /api/mobile/login + persistência via SecureStore
    └── api.js                   # fetch com header Authorization: Bearer
```

### Variáveis de ambiente (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL="http://SEU_IP_NA_REDE_LOCAL:3000"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="mesmo valor do AUTH_GOOGLE_ID do backend"
```

### Configuração no Google Cloud

Além do client tipo "Web application" (`AUTH_GOOGLE_ID`, já usado pelo login web), é preciso um client tipo **Android** no mesmo projeto: pacote conforme `app.json` → `android.package`, e o SHA-1 do keystore gerenciado pela EAS (`npx eas-cli credentials`). Esse client Android não entra em nenhuma variável de ambiente — é só um registro no Google Cloud que autoriza aquele app/certificado específico a usar o Google Sign-In. O token emitido continua usando como audiência o client **Web** (`AUTH_GOOGLE_MOBILE_CLIENT_ID` no backend).

### Rodando localmente

```bash
cd mobile
npm install

# gerar o build de desenvolvimento (uma vez, ou de novo se mudar dependência nativa)
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
# instala o APK gerado no celular/emulador (link/QR code aparece ao final do build)
```

A partir daí, o loop normal (recarrega o JS sem precisar buildar de novo) depende de testar num **celular físico** ou num **emulador** — os dois exigem configuração de rede diferente, porque não estão na mesma posição em relação ao WSL.

#### Celular físico (mesma rede Wi-Fi do PC)

```env
# mobile/.env
EXPO_PUBLIC_API_URL="http://SEU_IP_DE_REDE_LOCAL:3000"
```

```bash
npx expo start --dev-client
```

Pré-requisitos no Windows:
- Modo `mirrored` do WSL ativo (`networkingMode=mirrored` em `%UserProfile%\.wslconfig`, seguido de `wsl --shutdown`) — sem isso o WSL não expõe seus serviços na rede local de verdade.
- Portas `3000` (backend) e `8081` (Metro) liberadas no Firewall do Windows Defender para conexões de entrada, em **todos os perfis** (Domínio/Privada/Pública).

#### Emulador Android (rodado no Windows, fora do WSL)

O emulador do Android Studio não roda de forma performática dentro do WSL2 — ele precisa rodar no Windows. Isso muda como a rede funciona:

1. **Instale o Android Studio no Windows** (não no WSL) e crie um AVD com uma imagem **"Google Play"** (não só "Google APIs" — sem isso o Google Sign-In não funciona por falta do Play Services). Depois de criado, adicione uma conta Google de verdade em Configurações → Contas dentro do próprio emulador.

2. **Ponte do `adb`**: o emulador é gerenciado pelo Windows, então em vez de instalar um Android SDK dentro do WSL, aponte para o `adb.exe` que o Android Studio já instalou:
   ```bash
   mkdir -p "$HOME/.local/bin"
   cat > "$HOME/.local/bin/adb" << 'EOF'
   #!/bin/bash
   exec "/mnt/c/Users/<SeuUsuario>/AppData/Local/Android/Sdk/platform-tools/adb.exe" "$@"
   EOF
   chmod +x "$HOME/.local/bin/adb"
   ```
   Garanta que `export PATH="$HOME/.local/bin:$PATH"` esteja no **`~/.bashrc`** (não só no `~/.profile`) — terminais não-login, como o integrado do VSCode, só leem o `.bashrc`. Teste com `adb devices` (emulador aberto) num terminal novo.

3. **Endereço de rede**: o emulador tem sua própria NAT virtual: tentar alcançar o IP de rede local da própria máquina (`192.168.x.x`) falha de forma inconsistente vindo de dentro dele. Use o alias especial `10.0.2.2`, que sempre aponta pro host, tanto no `.env` quanto no comando que inicia o Metro:
   ```env
   # mobile/.env
   EXPO_PUBLIC_API_URL="http://10.0.2.2:3000"
   ```
   ```bash
   REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2 npx expo start --dev-client
   ```
   (`REACT_NATIVE_PACKAGER_HOSTNAME` sobrescreve o endereço que o Metro anuncia pro app carregar o bundle — sem isso, ele detecta e usa o IP de rede local sozinho, que não funciona pro emulador.)

4. **Firewall do Windows**: além de liberar as portas `3000` e `8081` (mesmo passo do celular), abra as propriedades da regra de cada porta → aba **Avançado** → **Travessia de borda** → troque para **"Permitir percurso de borda"**. Sem isso, o Windows Firewall trata o tráfego vindo da NAT virtual do emulador como tráfego "de borda" e bloqueia mesmo com a regra de porta liberada.

5. Com o emulador aberto e o app instalado, apertar **`a`** no terminal do `expo start` reinstala/abre automaticamente nele (não precisa de QR code).

**Resumindo a troca entre os dois**: os valores de `EXPO_PUBLIC_API_URL` (`.env`) e do prefixo `REACT_NATIVE_PACKAGER_HOSTNAME` são opostos entre celular e emulador — ao trocar de um pro outro, lembre de ajustar os dois e reiniciar o `expo start`.

Nota geral: o Expo SDK 57 exige **Node ≥ 20**; se o Node padrão do sistema for mais antigo (ex.: via `nvm`), rode `nvm use 24` antes de qualquer comando `expo`/`eas`.

## Configuração

### Pré-requisitos

- Node.js 24+
- PostgreSQL rodando localmente

### Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agendameets"

# NextAuth
AUTH_SECRET="sua-chave-secreta"
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"
AUTH_ALLOWED_EMAIL_DOMAINS="@seudominio.com.br"

# Mesmo valor do AUTH_GOOGLE_ID — audiência esperada do idToken enviado pelo app mobile
AUTH_GOOGLE_MOBILE_CLIENT_ID="seu-google-client-id"

# Google Sheets (service account)
GOOGLE_SERVICE_ACCOUNT_JSON='{ ... }'
GOOGLE_SHEET_ID="id-da-planilha"
```

### Instalação e execução

```bash
npm install

# Rodar as migrações e gerar o cliente Prisma
npx prisma migrate dev

# Iniciar o servidor de desenvolvimento (escuta em 0.0.0.0, acessível pela rede local)
npm run dev
```

Acesse em `http://localhost:3000`.

### Outros comandos

```bash
npx prisma studio        # Interface visual para inspecionar o banco
npx prisma generate      # Regenerar o cliente após alterar o schema
npm run build            # Build de produção (inclui prisma generate)
```
