# AgendaMeets

AgendaMeets é um sistema de gerenciamento de agendamentos para equipes de atendimento, permitindo organizar e acompanhar reuniões e atendimentos por atendente, assunto e status, com alertas sonoros antes do início de cada compromisso. O acesso é feito via login Google restrito ao domínio da equipe, e cada atendente pode sincronizar seus agendamentos com sua própria Google Agenda.

## Funcionalidades

- Listagem de agendamentos com filtros por período e atendente (filtros salvos no localStorage)
- Criação, edição e exclusão de agendamentos via modal
- Alertas sonoros no browser antes do início de cada agendamento (configurável por atendente ou por agendamento)
- Importação de agendamentos a partir de uma planilha Google Sheets
- Sincronização de agendamentos com a Google Agenda pessoal de cada atendente (conexão opt-in)
- CRUD de atendentes e assuntos
- Acesso restrito a contas `@domainexemplo` via Google OAuth

## Stack

| Camada         | Tecnologia                                                  |
| -------------- | ----------------------------------------------------------- |
| Framework      | Next.js 15 (App Router)                                     |
| UI             | React 19 + Tailwind CSS 4                                   |
| Banco de dados | PostgreSQL via Prisma 6                                     |
| Autenticação   | NextAuth v5 (Google OAuth)                                  |
| Integrações    | Google Sheets API v4, Google Calendar API v3 (`googleapis`) |
| Runtime        | Node.js 24                                                  |

## Arquitetura

```
agendameets-sup/
├── app/
│   ├── layout.js              # Layout raiz (html/body)
│   ├── login/                 # Página de login pública
│   └── (home)/                # Grupo de rotas autenticadas
│       ├── layout.js          # Injeta sidebar e providers
│       ├── page.js            # Dashboard
│       ├── agendamentos/      # Lista com filtros e paginação
│       ├── atendentes/        # CRUD de atendentes
│       ├── assuntos/          # CRUD de assuntos
│       └── api/               # Route Handlers
│           ├── agendamentos/  # GET (paginado), POST, PUT, DELETE
│           ├── atendentes/    # CRUD
│           ├── assuntos/      # CRUD
│           ├── status/        # GET
│           ├── sync-sheets/   # POST — importa da planilha
│           └── google-calendar/  # connect, callback, disconnect, status
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
│   ├── sheets.js              # Cliente Google Sheets (service account)
│   └── googleCalendar.js      # OAuth + CRUD de eventos na Google Agenda
├── auth.js                    # NextAuth com callbacks de domínio e atendenteId
├── auth.config.js             # Configuração edge-safe do provider Google
├── middleware.js              # Proteção de rotas via NextAuth
└── prisma/
    ├── schema.prisma          # Schema do banco de dados
    └── migrations/            # Histórico de migrações
```

### Modelos de dados

- **Atendente** — `nome`, `ativo`, `email` (único, usado para vincular ao login), `alertaMinutos` (antecedência padrão do alerta), `googleAccessToken`/`googleRefreshToken`/`googleTokenExpiry`/`googleCalendarConectado` (integração com Google Agenda)
- **Agendamento** — `dataHoraInicio`, `dataHoraFim`, `cliente`, `linkUmbler`, `observacoes`, `alertaMinutos` (sobrescreve o do atendente), `googleEventId` (evento correspondente na Google Agenda do atendente); FK para Atendente e Status; M2M com Assunto
- **Assunto** — categoria/tema da reunião (muitos para muitos com Agendamento)
- **Status** — estado do agendamento com cor em hex para badge visual

### Sistema de alertas

O hook `useAlertaAgendamentos` roda no cliente e faz polling a cada 60 segundos para buscar os agendamentos do dia do atendente logado. Para cada um, agenda um `setTimeout` para disparar `alertaMinutos` antes do início — tocando um alarme de áudio via Web Audio API e exibindo um modal de notificação.

### Autenticação

Login exclusivo via Google OAuth. Apenas e-mails do domínio `@domainexemplo` são aceitos. O JWT armazena o `atendenteId` do usuário, resolvido pelo e-mail na tabela `Atendente`, e fica disponível em `session.atendenteId` no cliente.

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

# Google Sheets (service account)
GOOGLE_SERVICE_ACCOUNT_JSON='{ ... }'
GOOGLE_SHEET_ID="id-da-planilha"
```

### Instalação e execução

```bash
npm install

# Rodar as migrações e gerar o cliente Prisma
npx prisma migrate dev

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`.

### Outros comandos

```bash
npx prisma studio        # Interface visual para inspecionar o banco
npx prisma generate      # Regenerar o cliente após alterar o schema
npm run build            # Build de produção (inclui prisma generate)
```
