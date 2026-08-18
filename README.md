# RadarInvest AI

Aplicação full-stack em Next.js para agregar notícias financeiras e produzir um feed resumido conforme os interesses de cada usuário.

## Stack inicial

- Next.js, React e TypeScript;
- PostgreSQL com Drizzle ORM/Kit;
- autenticação própria com `bcryptjs` e `jose`;
- Vitest;
- Docker Compose.

O Supabase será usado somente como PostgreSQL gerenciado em produção. A autenticação pertence à API Node.js.

## Desenvolvimento local

Pré-requisitos: Node.js 24+, npm e Docker com Compose.

```bash
npm install
npm run dev
```

Para preparar o ambiente por containers, copie `.env.example` para `.env`, troque `JWT_SECRET` e preencha as variáveis do Gemini. Em seguida:

```bash
docker compose up --build
```

O Compose aguarda o PostgreSQL ficar saudável, aplica as migrations versionadas, executa o seed local e só então inicia a aplicação. O seed é controlado por `SEED_ENABLED`, é bloqueado em produção e nunca sobrescreve nome ou senha de um usuário demo existente.

As operações de banco também estão disponíveis separadamente para ambientes com `DATABASE_URL` acessível:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Verificações

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:integration:db
npm run build
```

Os testes de integração exigem um PostgreSQL migrado cujo nome termine em `_test`; fora desse ambiente, eles são ignorados com segurança pela suíte padrão. Como compartilham o mesmo banco, os arquivos de teste rodam em série.

```bash
docker run --rm -d --name radarinvest-test-db -p 55432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=radarinvest_test postgres:17-alpine
```

## Build e deploy

O `npm run build` produz o build padrão do Next, usado no desenvolvimento local e na Vercel, que faz o próprio rastreamento de arquivos.

O `output: "standalone"` é ativado apenas pela variável de build `NEXT_OUTPUT_STANDALONE=true`, definida no stage `builder` do `Dockerfile`, porque só a imagem Docker executa `node server.js`. Habilitá-la na Vercel quebra o build com `ENOENT ... next-server.js.nft.json`.

Em produção, `DATABASE_URL` permanece Sensitive na Vercel e aponta para o
Transaction pooler apropriado ao runtime serverless. O GitHub Actions usa o
secret separado `MIGRATION_DATABASE_URL`, com o Session pooler do Supabase,
aplica as migrations antes do deploy e então solicita um build remoto à Vercel.
Assim, os demais segredos não precisam ser exportados para o runner do GitHub.

## Autenticação

A autenticação é implementada na própria API. O cadastro grava `users.password_hash` com `bcryptjs` e o login emite um JWT assinado com `jose`, com `sub`, `iss`, `aud`, `iat`, `exp` e a versão de sessão do usuário. O algoritmo aceito é fixado na aplicação e não é escolhido pelo token recebido.

Endpoints:

| Rota                         | Efeito                                            |
| ---------------------------- | ------------------------------------------------- |
| `POST /auth/register`        | Cria a conta, devolve o token e abre a sessão web |
| `POST /auth/login`           | Autentica, devolve o token e abre a sessão web    |
| `POST /auth/logout`          | Encerra a sessão web removendo o cookie           |
| `POST /auth/forgot-password` | Solicita a recuperação de senha                   |
| `POST /auth/reset-password`  | Conclui a recuperação e abre uma nova sessão      |

Rotas protegidas aceitam `Authorization: Bearer <JWT>` ou o cookie `radarinvest_session`, que é `HttpOnly`, `SameSite=Lax`, tem `Path=/`, recebe `Secure` em produção e expira junto com o token. O identificador do usuário vem exclusivamente do JWT validado.

Credencial inválida responde sempre `401 INVALID_CREDENTIALS`, sem indicar se o e-mail existe.

### Recuperação de senha

`POST /auth/forgot-password` responde sempre `202` com o mesmo corpo, exista ou não a conta. O token enviado por e-mail tem 32 bytes de entropia, é de uso único, expira em `PASSWORD_RESET_TOKEN_TTL_MINUTES` e só o seu hash SHA-256 é gravado no banco. Cada nova solicitação invalida a anterior e respeita o cooldown de `PASSWORD_RESET_COOLDOWN_SECONDS`, persistido em banco para funcionar em ambiente serverless.

Concluir a recuperação troca a senha e incrementa a versão de sessão do usuário, o que **invalida todos os JWTs emitidos antes** — inclusive os de um invasor. A resposta já traz uma sessão nova.

> **Configuração necessária:** o envio do e-mail depende de `SMTP_HOST`, `SMTP_PORT` e `PASSWORD_RESET_FROM_EMAIL`. Enquanto essas variáveis estiverem vazias, a aplicação usa um notificador inerte: o fluxo funciona no servidor, mas **nenhuma mensagem é entregue e a recuperação não está operacional**. O token nunca é impresso em log nem devolvido por outro canal.

## Estrutura do backend

As rotas HTTP ficam em `src/app`. Regras e integrações ficam em `src/server`, separadas em módulos, portas, adapters e composition root. Os casos de uso não dependem de tipos HTTP, SDKs externos ou implementações concretas.

O módulo de autenticação segue a mesma direção: os Route Handlers tratam HTTP, validação e tradução de erros; o `AuthService` concentra as regras; `UserRepository`, `PasswordResetTokenRepository`, `PasswordHasher`, `JwtService` e `PasswordResetNotifier` são portas com adapters injetados manualmente no composition root.

## Contribuição

Branches, commits e pull requests seguem o fluxo documentado em [`CONTRIBUTING.md`](./CONTRIBUTING.md). Commits usam Conventional Commits e cada PR deve estar vinculado ao card/issue correspondente.
