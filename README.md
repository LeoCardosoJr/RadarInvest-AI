# RadarInvest AI

Aplicação full-stack em Next.js para agregar notícias financeiras e produzir um feed diário resumido conforme os interesses de cada usuário.

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

O teste de integração exige um PostgreSQL migrado cujo nome termine em `_test`; fora desse ambiente, ele é ignorado com segurança pela suíte padrão.

## Build e deploy

O `npm run build` produz o build padrão do Next, usado no desenvolvimento local e na Vercel, que faz o próprio rastreamento de arquivos.

O `output: "standalone"` é ativado apenas pela variável de build `NEXT_OUTPUT_STANDALONE=true`, definida no stage `builder` do `Dockerfile`, porque só a imagem Docker executa `node server.js`. Habilitá-la na Vercel quebra o build com `ENOENT ... next-server.js.nft.json`.

Em produção, `DATABASE_URL` permanece Sensitive na Vercel e aponta para o
Transaction pooler apropriado ao runtime serverless. O GitHub Actions usa o
secret separado `MIGRATION_DATABASE_URL`, com o Session pooler do Supabase,
aplica as migrations antes do deploy e então solicita um build remoto à Vercel.
Assim, os demais segredos não precisam ser exportados para o runner do GitHub.

## Estrutura do backend

As rotas HTTP ficam em `src/app`. Regras e integrações ficam em `src/server`, separadas em módulos, portas, adapters e composition root. Os casos de uso não dependem de tipos HTTP, SDKs externos ou implementações concretas.

## Contribuição

Branches, commits e pull requests seguem o fluxo documentado em [`CONTRIBUTING.md`](./CONTRIBUTING.md). Commits usam Conventional Commits e cada PR deve estar vinculado ao card/issue correspondente.
