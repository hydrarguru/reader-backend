# Reader API
This repository contains the source code for Reader API / Reader backend that powers [Reader](https://github.com/hydrarguru/reader).

A REST API featuring JWT login and CRUD operations for users, communities, posts & comments. Deployed at https://reader-api.fly.dev, with Swagger docs at [/api-docs](https://reader-api.fly.dev/api-docs).

## Tech Stack:
- TypeScript + Express.js.
- Sequelize ORM.
- MySQL Database.
- JWT auth via jose.
- Swagger for API documentation.
- Hosted on Fly.io.

## Database migrations
Schema and data changes live as numbered SQL files in `migrations/`. Each one runs once per database and is recorded in the `SchemaMigrations` table.

- `pnpm migrate:create <name>` adds a new, empty migration file to fill in.
- `pnpm migrate` applies pending migrations to the local database.
- `pnpm migrate:status` lists which migrations have been applied.
- `pnpm migrate --prod` applies them to the production database in `.env`. It refuses to touch a non-local database without `--prod`. On Fly, run `fly ssh console -C "node dist/db/migrate.js up --prod"`.

Migrations only go forwards. Don't edit one that has already been applied; write a new one instead.

## Development
Uses [pnpm](https://pnpm.io) and Node.js. `pnpm install`, then `pnpm dev` starts the server with reload on save.

Settings are read from `.env`, with `.env.<NODE_ENV>` on top (`.env.development` unless `NODE_ENV` is set). Keep the local database in `.env.development` so local runs never touch production. Add `--prod` to use the production settings, e.g. `pnpm start --prod` (after `pnpm build`).
