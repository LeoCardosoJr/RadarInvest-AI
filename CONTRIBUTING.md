# Contribuição

## Fluxo por tarefa

1. Crie ou selecione um card no GitHub Project.
2. Quando a tarefa estiver pronta para implementação, converta o draft card em issue para habilitar a vinculação nativa com branches e pull requests.
3. Registre no card/issue a branch da tarefa.
4. Crie a branch a partir de `main`.
5. Faça commits pequenos e coesos.
6. Execute as verificações proporcionais à mudança.
7. Abra o pull request e vincule a issue com `Closes #<numero>`.
8. Aguarde revisão e checks antes do merge.
9. Após o merge, confirme o fechamento da issue e o status do card.

## Validações automáticas

Todo pull request direcionado à `main` executa o workflow de CI com PostgreSQL
descartável. O check instala as dependências, aplica as migrations e executa:

- `npm run format:check`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test`, incluindo as integrações PostgreSQL;
- `npm run build`.

O check da Vercel Preview permanece separado. Ambos devem estar verdes antes
do merge. As mesmas verificações proporcionais à mudança devem ser executadas
localmente antes da abertura do PR.

Após um merge na `main`, o mesmo workflow valida novamente o commit, aplica as
migrations com uma conexão dedicada e só então solicita o build e o deploy
remotos à Vercel. O deploy automático da integração Git para a `main` fica
desabilitado em `vercel.json`, evitando publicação antes da migration; previews
das demais branches continuam habilitados.

O GitHub Actions precisa dos secrets `VERCEL_TOKEN` e
`MIGRATION_DATABASE_URL`, além das variables `VERCEL_ORG_ID` e
`VERCEL_PROJECT_ID`. `MIGRATION_DATABASE_URL` usa o Session pooler do Supabase
e fica restrita ao step de migration. A `DATABASE_URL` da aplicação permanece
Sensitive na Vercel e usa o Transaction pooler; o build remoto consegue usá-la
sem exportá-la para o runner do GitHub. O `VERCEL_TOKEN` também fica restrito ao
step de deploy.

## Branches

Formato:

```text
<tipo>/etapa-<n>-<descricao-curta>
```

Exemplo:

```text
chore/etapa-1-scaffold-docker-ambiente
```

Tipos usuais: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `build`, `ci` e `perf`.

## Commits

Use Conventional Commits:

```text
<tipo>(<escopo>): <descrição objetiva>
```

Exemplos:

```text
chore(scaffold): configura Next.js e ambiente Docker
feat(auth): adiciona cadastro com hash de senha
test(feed): cobre fallback quando o provider falha
```

A mensagem deve refletir o que o commit efetivamente entrega. Evite mensagens genéricas como `ajustes`, `alterações` ou `fix` sem contexto.

## Pull requests

Título:

```text
[Etapa N] <resultado objetivo>
```

Todo PR deve informar:

- issue/card relacionado;
- branch utilizada;
- resumo do resultado;
- principais mudanças;
- verificações executadas;
- impactos em segurança, schema, contratos e configuração;
- pendências reais.

Use `Closes #<numero>` no corpo para vincular a issue ao PR e fechá-la após o merge.

Commits, abertura de PR e merge exigem autorização e verificação explícitas do responsável pelo projeto.
