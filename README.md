# RadarInvest AI

Aplicação full-stack que coleta notícias financeiras e usa IA para montar um feed personalizado a partir dos interesses cadastrados por cada usuário.

**Aplicação publicada:** [https://radar-invest-ai.vercel.app](https://radar-invest-ai.vercel.app)

## O que foi entregue

- cadastro e login com autenticação própria por JWT;
- preferências financeiras isoladas por usuário;
- busca das notícias mais recentes na API pública REST do InfoMoney;
- seleção e resumo das notícias pelo Gemini conforme os interesses cadastrados;
- cache diário por usuário e versão das preferências;
- atualização manual do feed, com cooldown e fallback para cache compatível;
- recuperação de senha por e-mail com token de uso único;
- interface React responsiva e API REST no mesmo projeto Next.js;
- ambiente local reproduzível com Docker Compose;
- deploy da aplicação na Vercel, conectado ao PostgreSQL hospedado no Supabase;
- pipeline de CI/CD no GitHub Actions com migrations, testes, lint, typecheck, build e deploy ordenados.

## Stack

- Next.js 16, React 19 e TypeScript;
- PostgreSQL 17 com Drizzle ORM e Drizzle Kit;
- `bcryptjs` e `jose` para autenticação;
- Gemini via SDK `@google/genai`;
- Vitest, Testing Library e GitHub Actions;
- Docker Compose, Vercel e Supabase PostgreSQL.

## Executar localmente com Docker

### Pré-requisitos

- Git;
- Docker com Docker Compose.

### 1. Clonar e configurar

```bash
git clone https://github.com/LeoCardosoJr/RadarInvest-AI.git
cd RadarInvest-AI
cp .env.example .env
```

No PowerShell, substitua o último comando por:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` e preencha, no mínimo:

```env
JWT_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
GEMINI_API_KEY=sua-chave-da-api
GEMINI_MODEL=gemini-3.6-flash
```

O modelo acima é apenas uma opção estável compatível com saída estruturada. A lista atualizada de modelos está na [documentação oficial do Gemini](https://ai.google.dev/gemini-api/docs/models).

### 2. Iniciar a aplicação

```bash
docker compose up --build
```

O Compose executa a sequência completa:

1. inicia o PostgreSQL e aguarda o healthcheck;
2. aplica as migrations versionadas;
3. executa o seed local idempotente;
4. inicia a aplicação somente após a preparação do banco.

Acesse [http://localhost:3000](http://localhost:3000).

### Usuário de demonstração local

```text
E-mail: demo@radarinvest.local
Senha: Demo@123456
```

Essas credenciais são exclusivamente locais. O seed é desabilitado em produção e, se o usuário já existir, não altera silenciosamente seu nome ou senha.

Para encerrar os containers sem apagar os dados locais:

```bash
docker compose down
```

## Deploy da aplicação na Vercel e banco no Supabase

A interface e as APIs Next.js são publicadas na Vercel. Somente o banco PostgreSQL é hospedado no Supabase.

### Banco

1. Crie um projeto no Supabase.
2. Use apenas a conexão PostgreSQL; não é necessário habilitar Supabase Auth.
3. Configure `DATABASE_URL` na Vercel com a conexão do Transaction pooler, apropriada ao runtime serverless.
4. No repositório do GitHub, abra **Settings → Environments → production → Environment secrets** e cadastre `MIGRATION_DATABASE_URL` com a conexão do Session pooler. O GitHub Actions usa esse secret para aplicar as migrations antes do deploy.
5. Mantenha `SEED_ENABLED=false` e não configure credenciais demo em produção.

### Aplicação

Configure na Vercel, no mínimo:

```text
NODE_ENV=production
APP_URL=https://seu-dominio
DATABASE_URL=...
JWT_SECRET=...
JWT_ISSUER=radarinvest-ai
JWT_AUDIENCE=radarinvest-web
JWT_EXPIRES_IN=1h
SEED_ENABLED=false
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

Para disponibilizar a recuperação de senha, configure também as variáveis SMTP descritas no `.env.example`. Deixe todas vazias para desabilitar a entrega ou preencha o conjunto obrigatório completo; não use configuração parcial.

### Pipeline de CI/CD

O GitHub Actions controla a validação, as migrations e a publicação em uma ordem segura:

1. em pull requests para `main`, inicia um PostgreSQL descartável, aplica as migrations e executa formatação, lint, typecheck, testes unitários e de integração e build de produção;
2. em pushes para `main`, repete a validação completa;
3. somente após a validação, aplica as migrations no PostgreSQL de produção usando `MIGRATION_DATABASE_URL`;
4. somente após a migration terminar com sucesso, aciona o deploy da aplicação na Vercel pela Vercel CLI.

As migrations são, portanto, uma etapa explícita do pipeline: não são executadas manualmente no Supabase nem durante requests da aplicação. Para esse fluxo, o GitHub Actions utiliza:

- secrets `MIGRATION_DATABASE_URL` e `VERCEL_TOKEN`;
- variables `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`.

O deploy Git automático da `main` está desabilitado para impedir que uma versão seja publicada antes da migration correspondente. Previews de outras branches continuam disponíveis.

## Limitações e próximos passos

O escopo foi deliberadamente concentrado nos requisitos do desafio. As limitações atuais são:

- somente Gemini e InfoMoney possuem adapters reais; os contratos permitem adicionar outros providers;
- a API pública usada do InfoMoney não possui SLA formal e pode mudar sem aviso;
- a geração ocorre durante o request; não há fila, histórico navegável de feeds ou processamento em background;
- não há OAuth, MFA, confirmação de e-mail ou refresh token;
- logout remove o cookie web, enquanto um Bearer token já emitido permanece válido até expirar; a troca de senha invalida os tokens anteriores;
- não há painel administrativo nem recomendação automatizada de investimento.

Os resumos são informativos, podem conter imprecisões e não constituem recomendação de investimento.

## Configuração

O arquivo [`.env.example`](./.env.example) contém todas as variáveis, valores locais seguros e comentários de configuração.

### Aplicação e banco

| Variável                                            | Finalidade                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `APP_URL`                                           | URL pública da aplicação, usada também nos links de recuperação        |
| `APP_PORT`                                          | Porta local publicada pelo Compose                                     |
| `DATABASE_URL`                                      | Conexão PostgreSQL usada pela aplicação                                |
| `MIGRATION_DATABASE_URL`                            | Conexão opcional e dedicada para migrations de produção                |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Banco local criado pelo Compose                                        |
| `POSTGRES_PORT`                                     | Porta do PostgreSQL publicada no host; altere se `5432` estiver em uso |

### Autenticação e recuperação

| Variável                                       | Finalidade                                                     |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `JWT_SECRET`                                   | Segredo aleatório do JWT, com no mínimo 32 caracteres          |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRES_IN` | Emissor, audiência e expiração do token                        |
| `PASSWORD_HASH_COST`                           | Custo do bcrypt; o valor recomendado e usado no exemplo é `12` |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`             | Validade do token de recuperação                               |
| `PASSWORD_RESET_COOLDOWN_SECONDS`              | Intervalo mínimo entre solicitações para a mesma conta         |
| `SMTP_*`, `PASSWORD_RESET_FROM_EMAIL`          | Entrega do e-mail de recuperação                               |

Se todas as variáveis SMTP permanecerem vazias, a aplicação inicia com um notificador inerte: o endpoint de solicitação continua respondendo normalmente, mas nenhum e-mail é entregue e a recuperação de senha não fica operacional.

### Notícias, IA e feed

| Variável                            | Finalidade                                         |
| ----------------------------------- | -------------------------------------------------- |
| `GEMINI_API_KEY`, `GEMINI_MODEL`    | Credenciais e modelo usado para gerar os resumos   |
| `GEMINI_TIMEOUT_MS`                 | Timeout da chamada de IA                           |
| `INFOMONEY_API_URL`                 | Endpoint REST público usado como fonte de notícias |
| `NEWS_TIMEOUT_MS`, `NEWS_MAX_ITEMS` | Timeout e limite de notícias candidatas            |
| `FEED_TIMEZONE`                     | Fuso usado para a data lógica do cache             |
| `FEED_REFRESH_COOLDOWN_SECONDS`     | Cooldown da atualização manual                     |

## API

Os contratos completos, schemas e exemplos de erro estão em [`docs/openapi.yaml`](./docs/openapi.yaml). O arquivo pode ser importado diretamente no Postman, Insomnia ou outra ferramenta compatível com OpenAPI para testar a API.

| Método | Endpoint                | Descrição                                     |
| ------ | ----------------------- | --------------------------------------------- |
| `POST` | `/auth/register`        | Cadastra um usuário e inicia a sessão         |
| `POST` | `/auth/login`           | Autentica e inicia a sessão                   |
| `POST` | `/auth/logout`          | Remove o cookie da sessão web                 |
| `POST` | `/auth/forgot-password` | Solicita recuperação de senha                 |
| `POST` | `/auth/reset-password`  | Redefine a senha usando o token recebido      |
| `GET`  | `/preferences`          | Lista os interesses do usuário autenticado    |
| `PUT`  | `/preferences`          | Substitui a lista de interesses               |
| `GET`  | `/feed`                 | Retorna ou gera o feed personalizado          |
| `POST` | `/feed/refresh`         | Força uma nova geração respeitando o cooldown |

Rotas protegidas aceitam `Authorization: Bearer <JWT>`. O `userId` usado nas consultas é obtido exclusivamente do JWT validado.

## Arquitetura

```text
Browser
   |
   v
Next.js: interface React + Route Handlers
   |
   v
Services de aplicação
   |
   +--> PostgreSQL / Drizzle
   +--> NewsProvider / InfoMoney REST
   +--> AiProvider / Gemini
```

As rotas validam HTTP e autenticação, mas delegam as regras aos services. Os casos de uso dependem de interfaces; adapters concretos são conectados por injeção de dependência (Dependency Injection — DI) manual no composition root.

### Decisões arquiteturais

As decisões abaixo resumem os ADRs relevantes para compreender e avaliar a solução:

| Decisão                                                | Justificativa                                                                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js full-stack no mesmo deploy                     | Atende frontend React, backend Node.js e endpoints REST explícitos sem duplicar projetos, deploy ou configuração de CORS                                               |
| Supabase somente como hospedagem PostgreSQL            | A autenticação foi implementada na API Node.js com `users.password_hash` e JWT, preservando o modelo e os endpoints definidos no desafio                               |
| Drizzle ORM e migrations versionadas                   | Mantém schema, queries e evolução do PostgreSQL reproduzíveis em ambiente local e produção                                                                             |
| Injeção de dependência manual e contratos de providers | `FeedService` depende das capacidades `AiProvider` e `NewsProvider`, permitindo testes com fakes e troca localizada de integração sem um container de DI desnecessário |
| Cache por usuário, data e preferências                 | Evita chamadas repetidas à IA sem devolver conteúdo criado para interesses antigos; mudanças efetivas invalidam o cache                                                |
| Docker Compose com serviço de migration                | Garante a ordem banco saudável → migrations/seed → aplicação com um único comando                                                                                      |
| API pública REST do InfoMoney                          | Uma chamada entrega um conjunto maior de notícias candidatas que o RSS, sem multiplicar chamadas por interesse; a troca ficou isolada atrás de `NewsProvider`          |
| Recuperação com versão de sessão                       | O token é aleatório, apenas seu SHA-256 é persistido e a troca de senha incrementa `users.token_version`, invalidando JWTs anteriores                                  |

O Supabase não é acessado pelo navegador e o projeto não depende de Supabase Auth, `auth.users`, anon key, service role, Data API ou RLS. Toda autorização acontece no backend.

## Segurança e resiliência

- senhas são armazenadas com `bcryptjs`, nunca em texto puro;
- senhas acima do limite efetivo de 72 bytes do bcrypt são rejeitadas, sem truncamento silencioso;
- JWT valida assinatura, expiração, emissor, audiência e algoritmo fixo;
- e-mail de login é normalizado e falhas de credencial não revelam qual campo está incorreto;
- tokens de recuperação têm 32 bytes, uso único, expiração, cooldown persistente e apenas hash SHA-256 no banco;
- todas as consultas de preferências e feed são filtradas pelo usuário autenticado;
- erros de banco e providers são convertidos para erros públicos estáveis;
- notícias e IA possuem timeout; o refresh pode devolver cache compatível em modo de contingência;
- título, fonte e URL vêm da notícia original, nunca do conteúdo gerado pela IA.

## Testes e qualidade

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Os testes de integração usam PostgreSQL real e só executam quando `DATABASE_URL` aponta para um banco cujo nome termina em `_test`, evitando escrita acidental em outros bancos.

Todo pull request para `main` executa na CI:

- instalação determinística com `npm ci`;
- migrations em PostgreSQL descartável;
- formatação, lint e typecheck;
- testes unitários e de integração;
- build de produção.

## Gestão e histórico do projeto

O desenvolvimento foi organizado no [GitHub Project do RadarInvest AI](https://github.com/users/LeoCardosoJr/projects/7). As etapas concluídas foram registradas em cards e issues, implementadas em branches próprias e entregues por pull requests correspondentes, com descrição técnica, verificações e vínculo para fechamento da issue.

Os commits seguem Conventional Commits e descrevem o comportamento entregue para facilitar a avaliação do histórico. O fluxo completo de cards, branches, commits, PRs, revisão e CI está documentado em [`CONTRIBUTING.md`](./CONTRIBUTING.md).
