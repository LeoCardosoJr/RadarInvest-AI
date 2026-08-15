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

O schema e o seed funcionais serão adicionados na Etapa 2. Até lá, o scaffold pode ser validado diretamente com os scripts abaixo.

## Verificações

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

## Estrutura do backend

As rotas HTTP ficam em `src/app`. Regras e integrações ficam em `src/server`, separadas em módulos, portas, adapters e composition root. Os casos de uso não dependem de tipos HTTP, SDKs externos ou implementações concretas.

## Contribuição

Branches, commits e pull requests seguem o fluxo documentado em [`CONTRIBUTING.md`](./CONTRIBUTING.md). Commits usam Conventional Commits e cada PR deve estar vinculado ao card/issue correspondente.
